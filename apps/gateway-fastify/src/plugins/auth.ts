
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { config } from '../config';
import { wrapError } from '../utils/responses';
import { orgStore } from '../services/storage';

declare module 'fastify' {
  interface FastifyRequest {
    rl: {
      orgId: string;
      authType: 'apiKey' | 'admin';
    };
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    // Public routes bypass
    if (request.url === '/health' || !request.url.startsWith('/v1/')) {
      return;
    }

    // ITEM 12: Organization management endpoints bypass tenant auth
    // These will use their own preHandler for x-rl-admin-key
    if (request.url.startsWith('/v1/orgs')) {
      return;
    }

    const orgId = request.headers['x-rl-org-id'] as string;
    const apiKey = request.headers['x-rl-api-key'] as string;

    if (!orgId || !apiKey) {
      return reply.code(401).send(wrapError('UNAUTHORIZED', 'Missing auth headers', request.id));
    }

    // Check static config first (backward compatibility)
    let expectedKey = config.orgKeys[orgId];
    
    // If not in static config, check dynamic orgStore
    if (!expectedKey) {
      const org = await orgStore.getById(orgId);
      if (org && org.isActive) {
        expectedKey = org.apiKey;
      }
    }

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
