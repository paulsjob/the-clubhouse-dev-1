
import { FastifyPluginAsync } from 'fastify';
import { graphStore } from '../../services/storage';
import { GraphExecutor } from '../../services/graphs/executor';
import { GraphValidator } from '../../services/graphs/validator';
import { wrapSuccess, wrapError } from '../../utils/responses';
import { GraphSchema } from '@renderless/contracts';

export const graphRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/graphs', {
    schema: {
      tags: ['Graphs'],
      summary: 'List logic graphs',
    } as any
  }, async (request) => {
    const items = await graphStore.list(request.rl.orgId);
    return wrapSuccess(items, request.id);
  });

  fastify.get('/v1/graphs/:id', {
    schema: {
      tags: ['Graphs'],
      summary: 'Get graph definition',
      params: { type: 'object', properties: { id: { type: 'string' } } }
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await graphStore.get(request.rl.orgId, id);
    if (!item) return reply.code(404).send(wrapError('NOT_FOUND', 'Graph not found', request.id));
    return wrapSuccess(item, request.id);
  });

  fastify.post('/v1/graphs', {
    schema: {
      tags: ['Graphs'],
      summary: 'Create graph',
    } as any
  }, async (request, reply) => {
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

  /**
   * ITEM 23: POST /v1/graphs/:id/validate
   * Performs static structure analysis without execution.
   */
  fastify.post('/v1/graphs/:id/validate', {
    schema: {
      tags: ['Graphs'],
      summary: 'Validate graph structure',
      params: { type: 'object', properties: { id: { type: 'string' } } }
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const graph = await graphStore.get(request.rl.orgId, id);
    if (!graph) return reply.code(404).send(wrapError('NOT_FOUND', 'Graph not found', request.id));

    const result = GraphValidator.validate(graph);
    return wrapSuccess(result, request.id);
  });

  /**
   * ITEM 23: POST /v1/graphs/:id/preview
   * Executes the graph and returns full intermediate data trace.
   */
  fastify.post('/v1/graphs/:id/preview', {
    schema: {
      tags: ['Graphs'],
      summary: 'Preview graph execution',
      description: 'Executes graph with __debug=true to capture intermediate data.',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', properties: { params: { type: 'object' } } }
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { params } = (request.body as any) || {};

    const graph = await graphStore.get(request.rl.orgId, id);
    if (!graph) return reply.code(404).send(wrapError('NOT_FOUND', 'Graph not found', request.id));

    try {
      // Force debug mode for previews
      const execution = await GraphExecutor.run(graph, request.rl.orgId, { 
        ...params, 
        __debug: true 
      });
      return wrapSuccess(execution, request.id);
    } catch (e: any) {
      return reply.code(400).send(wrapError('PREVIEW_ERROR', e.message, request.id));
    }
  });

  fastify.put('/v1/graphs/:id', {
    schema: {
      tags: ['Graphs'],
      summary: 'Update graph',
      params: { type: 'object', properties: { id: { type: 'string' } } }
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const updated = await graphStore.update(request.rl.orgId, id, body);
    if (!updated) return reply.code(404).send(wrapError('NOT_FOUND', 'Graph not found', request.id));
    return wrapSuccess(updated, request.id);
  });

  fastify.delete('/v1/graphs/:id', {
    schema: {
      tags: ['Graphs'],
      summary: 'Delete graph',
      params: { type: 'object', properties: { id: { type: 'string' } } }
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = await graphStore.delete(request.rl.orgId, id);
    if (!success) return reply.code(404).send(wrapError('NOT_FOUND', 'Graph not found', request.id));
    return wrapSuccess({ deleted: true }, request.id);
  });

  fastify.post('/v1/graphs/:id/run', {
    schema: {
      tags: ['Graphs'],
      summary: 'Execute graph',
      description: 'Run the logic graph with provided parameters.',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', properties: { params: { type: 'object' } } }
    } as any
  }, async (request, reply) => {
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
