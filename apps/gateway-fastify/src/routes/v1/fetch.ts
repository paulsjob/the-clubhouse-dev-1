
import { FastifyPluginAsync } from 'fastify';
import { internalFetch } from '../../services/fetcher';
import { wrapSuccess, wrapError } from '../../utils/responses';

export const fetchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/v1/fetch', {
    schema: {
      tags: ['Fetch'],
      summary: 'Proxy request',
      description: 'Execute an authenticated HTTP request to a defined resource.',
      body: {
        type: 'object',
        required: ['resourceId'],
        properties: {
          resourceId: { type: 'string' },
          credentialId: { type: 'string' },
          method: { type: 'string' },
          path: { type: 'string' },
          query: { type: 'object' },
          headers: { type: 'object' },
          body: { type: 'object' }
        }
      }
    } as any
  }, async (request, reply) => {
    try {
      const result = await internalFetch({
        orgId: request.rl.orgId,
        ...(request.body as any)
      });
      return wrapSuccess({
        status: result.status,
        headers: { 'content-type': result.headers['content-type'] },
        body: result.body
      }, request.id);
    } catch (e: any) {
      const code = e.message.includes('SSRF') ? 'FORBIDDEN' : e.message.includes('not found') ? 'NOT_FOUND' : 'UPSTREAM_ERROR';
      const status = code === 'FORBIDDEN' ? 403 : code === 'NOT_FOUND' ? 404 : 502;
      return reply.code(status).send(wrapError(code, e.message, request.id));
    }
  });
};
