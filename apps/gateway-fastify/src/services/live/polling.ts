
import { liveSessionStore, ephemeralStateStore, resourceStore } from '../storage';
import { internalFetch } from '../fetcher';
import { transformRegistry } from '../transforms/registry';
import { pubSubService } from './pubsub';

interface MockGameState {
  ticks: number;
  homeScore: number;
  awayScore: number;
  inning: number;
  half: 'top' | 'bottom';
  outs: number;
  balls: number;
  strikes: number;
}

class PollingService {
  // --- Fix: Use ReturnType<typeof setInterval> to avoid dependency on NodeJS namespace ---
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  // ITEM 18: Transient state for mock games
  private mockStates: Map<string, MockGameState> = new Map();

  async startSession(orgId: string, sessionId: string) {
    const session = await liveSessionStore.get(orgId, sessionId);
    if (!session) throw new Error('Session not found');

    const activeCount = (await liveSessionStore.list(orgId)).filter(s => s.status === 'active').length;
    if (activeCount >= 5) throw new Error('Max 5 active sessions per org');

    if (this.timers.has(sessionId)) return;

    await liveSessionStore.update(orgId, sessionId, { 
      status: 'active', 
      startedAt: Date.now(),
      consecutiveFailures: 0 
    });

    const interval = Math.max(session.pollIntervalMs, 250);
    const timer = setInterval(() => this.tick(orgId, sessionId), interval);
    this.timers.set(sessionId, timer);
    
    // Immediate first tick
    this.tick(orgId, sessionId);
  }

  async stopSession(orgId: string, sessionId: string) {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(sessionId);
    }
    this.mockStates.delete(sessionId);
    await liveSessionStore.update(orgId, sessionId, { status: 'terminated' });
  }

  private async tick(orgId: string, sessionId: string) {
    const session = await liveSessionStore.get(orgId, sessionId);
    if (!session || session.status !== 'active') {
      const timer = this.timers.get(sessionId);
      if (timer) clearInterval(timer);
      return;
    }

    try {
      const resource = await resourceStore.get(orgId, session.resourceId);
      if (!resource) throw new Error('Resource not found');

      let rawPayload: any;

      // ITEM 18: Mock Live Logic
      if (resource.baseUrl === 'mock://mlb-live') {
        rawPayload = this.generateMockMlbData(sessionId);
      } else {
        const result = await internalFetch({
          orgId,
          resourceId: session.resourceId,
          credentialId: session.credentialId,
          path: session.path,
          query: session.query
        });
        rawPayload = result.body;
      }

      const transform = transformRegistry[session.transform] || transformRegistry.passthrough;
      const normalized = transform(rawPayload);

      // Publish to all topics
      for (const topic of session.topics) {
        // ITEM 18: Ensure ephemeral store is updated BEFORE publish for schema discovery stability
        ephemeralStateStore.set(`${orgId}:${topic}`, normalized);
        pubSubService.publish(orgId, topic, normalized);
      }

      await liveSessionStore.update(orgId, sessionId, {
        lastPublishedAt: Date.now(),
        consecutiveFailures: 0,
        lastError: undefined
      });
    } catch (e: any) {
      const failures = (session.consecutiveFailures || 0) + 1;
      await liveSessionStore.update(orgId, sessionId, {
        consecutiveFailures: failures,
        lastError: e.message
      });
    }
  }

  /**
   * ITEM 18: Generates evolving MLB data
   */
  private generateMockMlbData(sessionId: string): any {
    let state = this.mockStates.get(sessionId);
    if (!state) {
      state = { 
        ticks: 0, 
        homeScore: 0, 
        awayScore: 0, 
        inning: 1, 
        half: 'top',
        outs: 0,
        balls: 0,
        strikes: 0
      };
    }

    state.ticks++;
    
    // Game Logic
    if (state.ticks % 3 === 0) state.homeScore++;
    if (state.ticks % 5 === 0) state.awayScore++;
    
    state.strikes++;
    if (state.strikes >= 3) {
      state.strikes = 0;
      state.balls = 0;
      state.outs++;
    }
    
    if (state.outs >= 3) {
      state.outs = 0;
      if (state.half === 'top') {
        state.half = 'bottom';
      } else {
        state.half = 'top';
        state.inning++;
      }
    }

    this.mockStates.set(sessionId, state);

    // Return in "raw-ish" format expected by mlb_scorebug_v1 transform
    return {
      gameId: `mock_${sessionId.split('_').pop()}`,
      status: "live",
      home: { id: "SEA", abbr: "SEA", name: "Seattle Seahawks", runs: state.homeScore },
      away: { id: "NYY", abbr: "NYY", name: "New York Yankees", runs: state.awayScore },
      inning: { number: state.inning, half: state.half },
      count: { balls: state.balls, strikes: state.strikes, outs: state.outs },
      bases: { first: state.ticks % 2 === 0, second: state.ticks % 4 === 0, third: false },
      lastEvent: { 
        type: state.strikes === 0 ? "strikeout" : "pitch", 
        summary: `Pitch ${state.ticks} delivered.`, 
        ts: Date.now() 
      }
    };
  }
}

export const pollingService = new PollingService();
