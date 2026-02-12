
import { FastifyPluginAsync } from 'fastify';
import { resourceStore } from '../../services/storage';
import { wrapSuccess, wrapError } from '../../utils/responses';
import { ResourceSchema } from '@renderless/contracts';

export const resourceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/resources', {
    schema: {
      tags: ['Resources'],
      summary: 'List resources',
      description: 'Returns all defined resources for the current organization.',
    } as any
  }, async (request) => {
    const items = await resourceStore.list(request.rl.orgId);
    return wrapSuccess(items, request.id);
  });

  fastify.get('/v1/resources/:id', {
    schema: {
      tags: ['Resources'],
      summary: 'Get resource',
      params: { type: 'object', properties: { id: { type: 'string' } } }
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await resourceStore.get(request.rl.orgId, id);
    if (!item) return reply.code(404).send(wrapError('NOT_FOUND', 'Resource not found', request.id));
    return wrapSuccess(item, request.id);
  });

  fastify.post('/v1/resources', {
    schema: {
      tags: ['Resources'],
      summary: 'Create resource',
    } as any
  }, async (request, reply) => {
    const body = request.body as any;
    const id = `res_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newRes = {
      ...body,
      id,
      orgId: request.rl.orgId,
      isActive: true,
    };

    try {
      ResourceSchema.parse(newRes);
      const created = await resourceStore.create(request.rl.orgId, newRes);
      return wrapSuccess(created, request.id);
    } catch (e: any) {
      return reply.code(400).send(wrapError('VALIDATION_ERROR', e.message, request.id));
    }
  });

  fastify.put('/v1/resources/:id', {
    schema: {
      tags: ['Resources'],
      summary: 'Update resource',
      params: { type: 'object', properties: { id: { type: 'string' } } }
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const updated = await resourceStore.update(request.rl.orgId, id, body);
    if (!updated) return reply.code(404).send(wrapError('NOT_FOUND', 'Resource not found', request.id));
    return wrapSuccess(updated, request.id);
  });

  fastify.delete('/v1/resources/:id', {
    schema: {
      tags: ['Resources'],
      summary: 'Delete resource',
      params: { type: 'object', properties: { id: { type: 'string' } } }
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = await resourceStore.delete(request.rl.orgId, id);
    if (!success) return reply.code(404).send(wrapError('NOT_FOUND', 'Resource not found', request.id));
    return wrapSuccess({ deleted: true }, request.id);
  });
};
