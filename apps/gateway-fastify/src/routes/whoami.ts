import { FastifyPluginAsync } from 'fastify';
import { wrapSuccess } from '../utils/responses';

export const whoamiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/whoami', async (request) => {
    return wrapSuccess({
      orgId: request.rl.orgId,
      ts: Date.now()
    }, request.id);
  });
};