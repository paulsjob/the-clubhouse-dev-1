
import { FastifyPluginAsync } from 'fastify';
import { schemaStore } from '../../services/storage';
import { wrapSuccess, wrapError } from '../../utils/responses';
import { SchemaBindingCandidateV1, SchemaSourceV1, SchemaIndexEntryV1 } from '@renderless/contracts';

export const schemaRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * ITEM 15: GET /v1/schema-index
   * Returns a lightweight index of all available schemas.
   */
  fastify.get('/v1/schema-index', {
    schema: {
      tags: ['Schemas'],
      summary: 'List schema index',
      description: 'Returns metadata for all schemas discovered for this organization.',
    } as any
  }, async (request) => {
    const snapshots = await schemaStore.list(request.rl.orgId);
    
    const index: SchemaIndexEntryV1[] = snapshots.map(s => ({
      schemaId: s.id,
      createdAt: s.createdAt,
      source: s.source || { kind: s.sourceType === 'output_run' ? 'output' : 'topic' as any, [s.sourceType === 'output_run' ? 'outputId' : 'topic']: s.sourceId } as SchemaSourceV1,
      summary: `${s.fields.length} fields`
    })).sort((a, b) => b.createdAt - a.createdAt);

    return wrapSuccess(index, request.id);
  });

  /**
   * ITEM 15: GET /v1/schema-index/latest
   * Returns the single latest schema for a specific source.
   */
  fastify.get('/v1/schema-index/latest', {
    schema: {
      tags: ['Schemas'],
      summary: 'Get latest schema by source',
      querystring: {
        type: 'object',
        required: ['kind'],
        properties: {
          kind: { type: 'string', enum: ['output', 'topic', 'graph'] },
          outputId: { type: 'string' },
          topic: { type: 'string' },
          graphId: { type: 'string' }
        }
      }
    } as any
  }, async (request, reply) => {
    const q = request.query as any;
    const source: SchemaSourceV1 = { kind: q.kind, [q.kind === 'output' ? 'outputId' : q.kind === 'topic' ? 'topic' : 'graphId']: q.outputId || q.topic || q.graphId } as any;

    const latest = schemaStore.getLatestBySource(request.rl.orgId, source);
    if (!latest) {
      return reply.code(404).send(wrapError('NOT_FOUND', 'No schema found for this source', request.id));
    }

    return wrapSuccess(latest, request.id);
  });

  /**
   * ITEM 15: GET /v1/schema-index/by-source
   * Returns all schemas for a specific source.
   */
  fastify.get('/v1/schema-index/by-source', {
    schema: {
      tags: ['Schemas'],
      summary: 'List schemas by source',
      querystring: {
        type: 'object',
        required: ['kind'],
        properties: {
          kind: { type: 'string', enum: ['output', 'topic', 'graph'] },
          outputId: { type: 'string' },
          topic: { type: 'string' },
          graphId: { type: 'string' }
        }
      }
    } as any
  }, async (request) => {
    const q = request.query as any;
    const source: SchemaSourceV1 = { kind: q.kind, [q.kind === 'output' ? 'outputId' : q.kind === 'topic' ? 'topic' : 'graphId']: q.outputId || q.topic || q.graphId } as any;

    const list = await schemaStore.listBySource(request.rl.orgId, source);
    return wrapSuccess(list, request.id);
  });

  /**
   * GET /v1/schemas
   */
  fastify.get('/v1/schemas', {
    schema: {
      tags: ['Schemas'],
      summary: 'List available schemas (Old)',
      description: 'Returns all schema snapshots discovered for this organization.',
    } as any
  }, async (request) => {
    const snapshots = await schemaStore.list(request.rl.orgId);
    
    const candidates = snapshots.map(s => ({
      schemaId: s.id,
      sourceType: s.sourceType,
      sourceId: s.sourceId,
      createdAt: s.createdAt,
      fieldCount: s.fields.length,
      name: `${s.sourceType === 'live_topic' ? 'Topic' : 'Output'}: ${s.sourceId}`
    }));

    return wrapSuccess(candidates, request.id);
  });

  /**
   * GET /v1/schemas/:id
   */
  fastify.get('/v1/schemas/:id', {
    schema: {
      tags: ['Schemas'],
      summary: 'Get schema snapshot',
      params: { type: 'object', properties: { id: { type: 'string' } } }
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const snapshot = await schemaStore.get(request.rl.orgId, id);
    
    if (!snapshot) {
      return reply.code(404).send(wrapError('NOT_FOUND', 'Schema snapshot not found', request.id));
    }

    return wrapSuccess(snapshot, request.id);
  });

  /**
   * GET /v1/schemas/:id/fields
   */
  fastify.get('/v1/schemas/:id/fields', {
    schema: {
      tags: ['Schemas'],
      summary: 'Get bindable schema fields',
      description: 'Returns a flattened list of paths suitable for Studio dropdowns.',
      params: { type: 'object', properties: { id: { type: 'string' } } }
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const snapshot = await schemaStore.get(request.rl.orgId, id);
    
    if (!snapshot) {
      return reply.code(404).send(wrapError('NOT_FOUND', 'Schema snapshot not found', request.id));
    }

    const bindableFields = snapshot.fields.map(f => ({
      path: f.path,
      valueType: f.valueType,
      example: f.example
    }));

    const candidate: SchemaBindingCandidateV1 = {
      schemaId: snapshot.id,
      sourceType: snapshot.sourceType,
      sourceId: snapshot.sourceId,
      name: `${snapshot.sourceType === 'live_topic' ? 'Topic' : 'Output'}: ${snapshot.sourceId}`,
      fields: bindableFields,
      source: snapshot.source
    };

    return wrapSuccess(candidate, request.id);
  });
};
