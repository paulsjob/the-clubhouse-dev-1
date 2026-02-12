
import { FastifyPluginAsync } from 'fastify';
import { liveSessionStore } from '../../../services/storage';
import { pollingService } from '../../../services/live/polling';
import { wrapSuccess, wrapError } from '../../../utils/responses';
import { LiveSessionSchema } from '@renderless/contracts';

export const liveSessionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/live/sessions', async (request) => {
    const items = await liveSessionStore.list(request.rl.orgId);
    return wrapSuccess(items, request.id);
  });

  fastify.post('/v1/live/sessions', async (request, reply) => {
    const body = request.body as any;
    const id = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const newSession = {
      ...body,
      id,
      orgId: request.rl.orgId,
      status: 'initializing',
      consecutiveFailures: 0
    };

    try {
      LiveSessionSchema.parse(newSession);
      const created = await liveSessionStore.create(request.rl.orgId, newSession);
      return wrapSuccess(created, request.id);
    } catch (e: any) {
      return reply.code(400).send(wrapError('VALIDATION_ERROR', e.message, request.id));
    }
  });

  fastify.get('/v1/live/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await liveSessionStore.get(request.rl.orgId, id);
    if (!item) return reply.code(404).send(wrapError('NOT_FOUND', 'Session not found', request.id));
    return wrapSuccess(item, request.id);
  });

  fastify.post('/v1/live/sessions/:id/start', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await pollingService.startSession(request.rl.orgId, id);
      return wrapSuccess({ status: 'active' }, request.id);
    } catch (e: any) {
      return reply.code(400).send(wrapError('START_FAILED', e.message, request.id));
    }
  });

  fastify.post('/v1/live/sessions/:id/stop', async (request) => {
    const { id } = request.params as { id: string };
    await pollingService.stopSession(request.rl.orgId, id);
    return wrapSuccess({ status: 'terminated' }, request.id);
  });

  fastify.delete('/v1/live/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await pollingService.stopSession(request.rl.orgId, id);
    const success = await liveSessionStore.delete(request.rl.orgId, id);
    if (!success) return reply.code(404).send(wrapError('NOT_FOUND', 'Session not found', request.id));
    return wrapSuccess({ deleted: true }, request.id);
  });
};
