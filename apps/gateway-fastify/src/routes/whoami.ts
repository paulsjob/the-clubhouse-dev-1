
import { FastifyPluginAsync } from 'fastify';
import { wrapSuccess } from '../utils/responses';

export const whoamiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/whoami', {
    // Cast to any to support Swagger properties (tags, summary, description, security) which are not in base FastifySchema
    schema: {
      tags: ['Auth'],
      summary: 'Identify current session',
      description: 'Returns the organization ID associated with the provided credentials.',
      security: [{ orgIdHeader: [], apiKeyHeader: [] }]
    } as any
  }, async (request) => {
    return wrapSuccess({
      orgId: request.rl.orgId,
      ts: Date.now()
    }, request.id);
  });
};
