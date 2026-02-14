
import { FastifyPluginAsync } from 'fastify';
import { bindingSetStore } from '../../services/storage';
import { wrapSuccess, wrapError } from '../../utils/responses';
import { BindingSetCreateSchema, BindingSetV1Schema, BindingSetV1 } from '@renderless/contracts';

export const bindingSetRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /v1/binding-sets
   * List all binding sets for the tenant.
   */
  fastify.get('/v1/binding-sets', {
    schema: {
      tags: ['Bindings'],
      summary: 'List binding sets',
      description: 'Returns all overlay mapping configurations for the organization.',
    } as any
  }, async (request) => {
    const items = await bindingSetStore.list(request.rl.orgId);
    return wrapSuccess(items, request.id);
  });

  /**
   * GET /v1/binding-sets/:id
   * Get specific set.
   */
  fastify.get('/v1/binding-sets/:id', {
    schema: {
      tags: ['Bindings'],
      summary: 'Get binding set details',
      params: { type: 'object', properties: { id: { type: 'string' } } }
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await bindingSetStore.get(request.rl.orgId, id);
    if (!item) return reply.code(404).send(wrapError('NOT_FOUND', 'Binding set not found', request.id));
    return wrapSuccess(item, request.id);
  });

  /**
   * POST /v1/binding-sets
   * Create a new set with element bindings.
   */
  fastify.post('/v1/binding-sets', {
    schema: {
      tags: ['Bindings'],
      summary: 'Create binding set',
      body: { type: 'object' }
    } as any
  }, async (request, reply) => {
    try {
      const body = BindingSetCreateSchema.parse(request.body);
      const orgId = request.rl.orgId;
      const now = Date.now();
      const setId = `bset_${now}_${Math.random().toString(36).substr(2, 4)}`;

      const newSet: BindingSetV1 = {
        id: setId,
        orgId,
        name: body.name,
        layoutId: body.layoutId,
        isActive: body.isActive,
        createdAt: now,
        updatedAt: now,
        bindings: body.bindings.map(b => ({
          ...b,
          id: `bind_${Math.random().toString(36).substr(2, 6)}`,
          orgId,
          layoutId: body.layoutId,
          createdAt: now,
          updatedAt: now
        }))
      };

      const created = await bindingSetStore.create(orgId, newSet);
      return wrapSuccess(created, request.id);
    } catch (e: any) {
      const code = e.name === 'ZodError' ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';
      return reply.code(400).send(wrapError(code, e.message, request.id));
    }
  });

  /**
   * PUT /v1/binding-sets/:id
   * Full update of a binding set.
   */
  fastify.put('/v1/binding-sets/:id', {
    schema: {
      tags: ['Bindings'],
      summary: 'Update binding set',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object' }
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = request.rl.orgId;
    
    const existing = await bindingSetStore.get(orgId, id);
    if (!existing) return reply.code(404).send(wrapError('NOT_FOUND', 'Binding set not found', request.id));

    try {
      const body = BindingSetCreateSchema.parse(request.body);
      const now = Date.now();

      const updatedSet: BindingSetV1 = {
        ...existing,
        name: body.name,
        layoutId: body.layoutId,
        isActive: body.isActive,
        updatedAt: now,
        bindings: body.bindings.map(b => ({
          ...b,
          id: `bind_${Math.random().toString(36).substr(2, 6)}`,
          orgId,
          layoutId: body.layoutId,
          createdAt: now,
          updatedAt: now
        }))
      };

      const result = await bindingSetStore.update(orgId, id, updatedSet);
      return wrapSuccess(result, request.id);
    } catch (e: any) {
      return reply.code(400).send(wrapError('VALIDATION_ERROR', e.message, request.id));
    }
  });

  /**
   * DELETE /v1/binding-sets/:id
   */
  fastify.delete('/v1/binding-sets/:id', {
    schema: {
      tags: ['Bindings'],
      summary: 'Delete binding set',
      params: { type: 'object', properties: { id: { type: 'string' } } }
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = await bindingSetStore.delete(request.rl.orgId, id);
    if (!success) return reply.code(404).send(wrapError('NOT_FOUND', 'Binding set not found', request.id));
    return wrapSuccess({ deleted: true }, request.id);
  });
};
