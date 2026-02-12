
import { FastifyPluginAsync } from 'fastify';
import process from 'node:process';
import pkg from '../../package.json';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'Service health check',
      description: 'Returns the status and version of the gateway service.',
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            service: { type: 'string' },
            version: { type: 'string' },
            uptimeSec: { type: 'number' },
            ts: { type: 'number' }
          }
        }
      }
    }
  }, async () => {
    return {
      ok: true,
      service: "gateway",
      version: pkg.version,
      uptimeSec: Math.floor(process.uptime()),
      ts: Date.now()
    };
  });
};
