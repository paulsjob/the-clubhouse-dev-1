import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { config } from '../config';
import { wrapError } from '../utils/responses';

declare module 'fastify' {
  interface FastifyRequest {
    rl: {
      orgId: string;
      authType: 'apiKey';
    };
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    // Public routes bypass
    if (request.url === '/health' || !request.url.startsWith('/v1/')) {
      return;
    }

    const orgId = request.headers['x-rl-org-id'] as string;
    const apiKey = request.headers['x-rl-api-key'] as string;

    if (!orgId || !apiKey) {
      return reply.code(401).send(wrapError('UNAUTHORIZED', 'Missing auth headers', request.id));
    }

    const expectedKey = config.orgKeys[orgId];
    if (!expectedKey || expectedKey !== apiKey) {
      return reply.code(401).send(wrapError('UNAUTHORIZED', 'Invalid orgId or apiKey', request.id));
    }

    request.rl = {
      orgId,
      authType: 'apiKey',
    };
  });
};

export default fp(authPlugin);