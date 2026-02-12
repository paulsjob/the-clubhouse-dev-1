
import { liveSessionStore, ephemeralStateStore } from '../storage';
import { internalFetch } from '../fetcher';
import { transformRegistry } from '../transforms/registry';
import { pubSubService } from './pubsub';

class PollingService {
  private timers: Map<string, NodeJS.Timeout> = new Map();

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
      const result = await internalFetch({
        orgId,
        resourceId: session.resourceId,
        credentialId: session.credentialId,
        path: session.path,
        query: session.query
      });

      const transform = transformRegistry[session.transform] || transformRegistry.passthrough;
      const normalized = transform(result.body);

      // Publish to all topics
      for (const topic of session.topics) {
        pubSubService.publish(orgId, topic, normalized);
        ephemeralStateStore.set(`${orgId}:${topic}`, normalized);
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
      // In a real system, we'd handle exponential backoff by adjusting the interval
    }
  }
}

export const pollingService = new PollingService();
