
import { FastifyPluginAsync } from 'fastify';
import { simulationEngine } from '../../services/simulation/engine';
import { wrapSuccess, wrapError } from '../../utils/responses';

export const simulationRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /v1/simulations
   * List active simulations for the org
   */
  fastify.get('/v1/simulations', {
    schema: {
      tags: ['Simulations'],
      summary: 'List active simulations',
    } as any
  }, async (request) => {
    const items = simulationEngine.getStatus(request.rl.orgId);
    return wrapSuccess(items, request.id);
  });

  /**
   * POST /v1/simulations/start
   * Start or restart a simulation
   */
  fastify.post('/v1/simulations/start', {
    schema: {
      tags: ['Simulations'],
      summary: 'Start live simulation',
      body: {
        type: 'object',
        required: ['simulationId', 'topic'],
        properties: {
          simulationId: { type: 'string', enum: ['mlb_scorebug', 'generic'] },
          topic: { type: 'string' },
          intervalMs: { type: 'number', default: 1000 }
        }
      }
    } as any
  }, async (request) => {
    const { simulationId, topic, intervalMs } = request.body as any;
    simulationEngine.start(request.rl.orgId, simulationId, topic, intervalMs);
    return wrapSuccess({ status: 'started', topic, simulationId }, request.id);
  });

  /**
   * POST /v1/simulations/stop
   * Stop a running simulation
   */
  fastify.post('/v1/simulations/stop', {
    schema: {
      tags: ['Simulations'],
      summary: 'Stop live simulation',
      body: {
        type: 'object',
        required: ['simulationId'],
        properties: {
          simulationId: { type: 'string' }
        }
      }
    } as any
  }, async (request) => {
    const { simulationId } = request.body as any;
    simulationEngine.stop(request.rl.orgId, simulationId);
    return wrapSuccess({ status: 'stopped', simulationId }, request.id);
  });
};
