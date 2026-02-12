
import { FastifyPluginAsync } from 'fastify';
import { outputStore, graphStore } from '../../services/storage';
import { GraphExecutor } from '../../services/graphs/executor';
import { wrapSuccess, wrapError } from '../../utils/responses';
import { OutputSchema } from '@renderless/contracts';

export const outputRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/outputs', async (request) => {
    const items = await outputStore.list(request.rl.orgId);
    return wrapSuccess(items, request.id);
  });

  fastify.get('/v1/outputs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await outputStore.get(request.rl.orgId, id);
    if (!item) return reply.code(404).send(wrapError('NOT_FOUND', 'Output not found', request.id));
    return wrapSuccess(item, request.id);
  });

  fastify.post('/v1/outputs', async (request, reply) => {
    const body = request.body as any;
    const id = `out_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newOutput = {
      ...body,
      id,
      orgId: request.rl.orgId,
    };

    try {
      OutputSchema.parse(newOutput);
      const created = await outputStore.create(request.rl.orgId, newOutput);
      return wrapSuccess(created, request.id);
    } catch (e: any) {
      return reply.code(400).send(wrapError('VALIDATION_ERROR', e.message, request.id));
    }
  });

  fastify.put('/v1/outputs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const updated = await outputStore.update(request.rl.orgId, id, body);
    if (!updated) return reply.code(404).send(wrapError('NOT_FOUND', 'Output not found', request.id));
    return wrapSuccess(updated, request.id);
  });

  fastify.delete('/v1/outputs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = await outputStore.delete(request.rl.orgId, id);
    if (!success) return reply.code(404).send(wrapError('NOT_FOUND', 'Output not found', request.id));
    return wrapSuccess({ deleted: true }, request.id);
  });

  fastify.post('/v1/outputs/:id/run', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { params } = (request.body as any) || {};

    const output = await outputStore.get(request.rl.orgId, id);
    if (!output) return reply.code(404).send(wrapError('NOT_FOUND', 'Output not found', request.id));

    if (!output.isActive) {
      return reply.code(403).send(wrapError('DISABLED', 'Output is currently inactive', request.id));
    }

    const graph = await graphStore.get(request.rl.orgId, output.graphId);
    if (!graph) return reply.code(404).send(wrapError('NOT_FOUND', 'Graph not found', request.id));

    try {
      const result = await GraphExecutor.run(graph, request.rl.orgId, params);
      return wrapSuccess(result, request.id);
    } catch (e: any) {
      return reply.code(400).send(wrapError('EXECUTION_ERROR', e.message, request.id));
    }
  });
};
