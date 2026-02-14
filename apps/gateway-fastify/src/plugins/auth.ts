
import 'fastify';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { config } from '../config';
import { wrapError } from '../utils/responses';
import { orgStore } from '../services/storage';

// --- Fix: Ensure module augmentation works by having an import 'fastify' statement ---
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

    // ITEM 12/13: Organization management endpoints bypass tenant auth
    // These use their own preHandler for x-rl-admin-key in orgs.ts
    if (request.url.startsWith('/v1/orgs')) {
      return;
    }

    const orgId = request.headers['x-rl-org-id'] as string;
    const apiKey = request.headers['x-rl-api-key'] as string;

    if (!orgId || !apiKey) {
      return reply.code(401).send(wrapError('UNAUTHORIZED', 'Missing auth headers', request.id));
    }

    // ITEM 13: Precedence - Dynamic orgStore wins over static config.orgKeys
    let expectedKey: string | undefined;

    const org = await orgStore.getById(orgId);
    if (org && org.isActive) {
      expectedKey = org.apiKey;
    }

    // Fallback to static config (for dev/env bootstrap)
    if (!expectedKey) {
      expectedKey = config.orgKeys[orgId];
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
