
import { pubSubService } from '../live/pubsub';
import { ephemeralStateStore } from '../storage';
import { MLBScorebugStateV1 } from '@renderless/contracts';

interface ActiveSim {
  timer: NodeJS.Timeout;
  ticks: number;
  topic: string;
  config: any;
}

class SimulationEngine {
  private activeSims: Map<string, ActiveSim> = new Map();

  /**
   * Starts a deterministic simulation for an organization.
   * If already running, it restarts with fresh state.
   */
  start(orgId: string, simulationId: string, topic: string, intervalMs: number = 1000) {
    const key = `${orgId}:${simulationId}`;
    this.stop(orgId, simulationId);

    const sim: ActiveSim = {
      timer: setInterval(() => this.tick(orgId, simulationId), intervalMs),
      ticks: 0,
      topic,
      config: { simulationId }
    };

    this.activeSims.set(key, sim);
    // Initial tick
    this.tick(orgId, simulationId);
  }

  stop(orgId: string, simulationId: string) {
    const key = `${orgId}:${simulationId}`;
    const sim = this.activeSims.get(key);
    if (sim) {
      clearInterval(sim.timer);
      this.activeSims.delete(key);
    }
  }

  private tick(orgId: string, simulationId: string) {
    const key = `${orgId}:${simulationId}`;
    const sim = this.activeSims.get(key);
    if (!sim) return;

    sim.ticks++;
    const data = this.generateData(simulationId, sim.ticks);
    
    // Live Bus Update
    ephemeralStateStore.set(`${orgId}:${sim.topic}`, data);
    pubSubService.publish(orgId, sim.topic, data);
  }

  /**
   * State Machine: Generates deterministic data based on tick count.
   */
  private generateData(simulationId: string, tick: number): any {
    if (simulationId === 'mlb_scorebug') {
      return this.generateMLB(tick);
    }
    // Default fallback
    return {
      simulationId,
      tick,
      ts: Date.now(),
      status: "running",
      value: Math.sin(tick / 10).toFixed(4)
    };
  }

  private generateMLB(tick: number): MLBScorebugStateV1 {
    // Deterministic progression
    // Strikes every 2nd tick, Balls every 3rd
    // Out every 6th tick
    const strikes = tick % 3;
    const balls = tick % 4;
    const outs = Math.floor(tick / 6) % 3;
    const inningNum = 1 + Math.floor(tick / 36);
    const half = (Math.floor(tick / 18) % 2 === 0) ? 'top' : 'bottom';
    
    const homeRuns = Math.floor(tick / 12);
    const awayRuns = Math.floor(tick / 15);

    return {
      gameId: "sim_mlb_v1",
      status: "live",
      home: { id: "SEA", abbr: "SEA", runs: homeRuns },
      away: { id: "NYY", abbr: "NYY", runs: awayRuns },
      inning: { number: inningNum, half: half as any },
      count: { balls, strikes, outs },
      bases: {
        first: tick % 5 === 0,
        second: tick % 8 === 0,
        third: false
      },
      ts: Date.now(),
      lastEvent: {
        type: "sim_event",
        summary: `Tick ${tick}: Simulation in progress`,
        ts: Date.now()
      }
    };
  }

  getStatus(orgId: string) {
    const results = [];
    for (const [key, sim] of this.activeSims.entries()) {
      if (key.startsWith(`${orgId}:`)) {
        results.push({
          simulationId: key.split(':')[1],
          topic: sim.topic,
          ticks: sim.ticks,
          isActive: true
        });
      }
    }
    return results;
  }
}

export const simulationEngine = new SimulationEngine();
