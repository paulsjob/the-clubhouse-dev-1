
import { FastifyPluginAsync } from 'fastify';
import { graphStore } from '../../services/storage';
import { GraphExecutor } from '../../services/graphs/executor';
import { wrapSuccess, wrapError } from '../../utils/responses';
import { GraphSchema } from '@renderless/contracts';

export const graphRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/graphs', async (request) => {
    const items = await graphStore.list(request.rl.orgId);
    return wrapSuccess(items, request.id);
  });

  fastify.get('/v1/graphs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await graphStore.get(request.rl.orgId, id);
    if (!item) return reply.code(404).send(wrapError('NOT_FOUND', 'Graph not found', request.id));
    return wrapSuccess(item, request.id);
  });

  fastify.post('/v1/graphs', async (request, reply) => {
    const body = request.body as any;
    const id = `graph_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newGraph = {
      ...body,
      id,
      orgId: request.rl.orgId,
    };

    try {
      GraphSchema.parse(newGraph);
      const created = await graphStore.create(request.rl.orgId, newGraph);
      return wrapSuccess(created, request.id);
    } catch (e: any) {
      return reply.code(400).send(wrapError('VALIDATION_ERROR', e.message, request.id));
    }
  });

  fastify.put('/v1/graphs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const updated = await graphStore.update(request.rl.orgId, id, body);
    if (!updated) return reply.code(404).send(wrapError('NOT_FOUND', 'Graph not found', request.id));
    return wrapSuccess(updated, request.id);
  });

  fastify.delete('/v1/graphs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = await graphStore.delete(request.rl.orgId, id);
    if (!success) return reply.code(404).send(wrapError('NOT_FOUND', 'Graph not found', request.id));
    return wrapSuccess({ deleted: true }, request.id);
  });

  fastify.post('/v1/graphs/:id/run', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { params } = (request.body as any) || {};

    const graph = await graphStore.get(request.rl.orgId, id);
    if (!graph) return reply.code(404).send(wrapError('NOT_FOUND', 'Graph not found', request.id));

    try {
      const result = await GraphExecutor.run(graph, request.rl.orgId, params);
      return wrapSuccess(result, request.id);
    } catch (e: any) {
      return reply.code(400).send(wrapError('EXECUTION_ERROR', e.message, request.id));
    }
  });
};
