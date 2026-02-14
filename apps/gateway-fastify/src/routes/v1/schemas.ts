
import { FastifyPluginAsync } from 'fastify';
import { schemaStore } from '../../services/storage';
import { wrapSuccess, wrapError } from '../../utils/responses';
import { SchemaSourceV1, SchemaIndexEntryV1, SchemaFieldRefV1 } from '@renderless/contracts';

/**
 * ITEM 16: Schema Discovery & Browse API
 * Exposes schemas and bindable fields for Studio tools.
 */
export const schemaRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * ITEM 15: GET /v1/schema-index
   * Backward-compatible index grouped by logical source.
   */
  fastify.get('/v1/schema-index', {
    schema: {
      tags: ['Schemas'],
      summary: 'List schema index (Legacy)',
      description: 'Returns metadata for all schemas discovered for this organization.',
    } as any
  }, async (request) => {
    const snapshots = await schemaStore.list(request.rl.orgId);
    
    const index: SchemaIndexEntryV1[] = snapshots.map(s => ({
      schemaId: s.id,
      createdAt: s.createdAt,
      source: s.source || { 
        kind: s.sourceType === 'output_run' ? 'output' : 'topic' as any, 
        [s.sourceType === 'output_run' ? 'outputId' : 'topic']: s.sourceId 
      } as SchemaSourceV1,
      summary: `${s.fields.length} fields`
    })).sort((a, b) => b.createdAt - a.createdAt);

    return wrapSuccess(index, request.id);
  });

  /**
   * ITEM 16: GET /v1/schemas
   * Returns list of SchemaSnapshotV1 for the org (lightweight index)
   * Sorted newest-first by generatedAt.
   */
  fastify.get('/v1/schemas', {
    schema: {
      tags: ['Schemas'],
      summary: 'List schema snapshots',
      description: 'Returns a lightweight index of discovered schemas, sorted by latest first.',
    } as any
  }, async (request) => {
    const snapshots = await schemaStore.list(request.rl.orgId);
    
    // Sort newest-first (Item 16 requirement)
    const sorted = [...snapshots].sort((a, b) => b.createdAt - a.createdAt);

    const index = sorted.map(s => ({
      id: s.id,
      generatedAt: s.createdAt,
      sourceType: s.sourceType,
      sourceId: s.sourceId,
      fieldCount: s.fields.length,
      summary: s.source?.kind ? `${s.source.kind} snapshot` : undefined
    }));

    return wrapSuccess(index, request.id);
  });

  /**
   * ITEM 16: GET /v1/schemas/:id
   * Returns the full SchemaSnapshotV1 object by id.
   */
  fastify.get('/v1/schemas/:id', {
    schema: {
      tags: ['Schemas'],
      summary: 'Get schema snapshot details',
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
   * ITEM 16: GET /v1/schemas/:id/fields
   * Returns a flattened, Studio-friendly list of fields for binding dropdowns.
   */
  fastify.get('/v1/schemas/:id/fields', {
    schema: {
      tags: ['Schemas'],
      summary: 'Get bindable fields for a schema',
      description: 'Returns a flattened, sanitized list of paths for Studio binding.',
      params: { type: 'object', properties: { id: { type: 'string' } } }
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const snapshot = await schemaStore.get(request.rl.orgId, id);
    
    if (!snapshot) {
      return reply.code(404).send(wrapError('NOT_FOUND', 'Schema snapshot not found', request.id));
    }

    // Map internal fields to Studio bindable fields (Item 16)
    const bindableFields: SchemaFieldRefV1[] = snapshot.fields.map(f => {
      // Example Sanitization (primitives only, max 80 chars)
      let example = f.example;
      if (typeof example === 'string') {
        if (example.length > 80) {
          example = example.slice(0, 77) + '...';
        }
      } else if (typeof example === 'object' && example !== null) {
        // Enforce primitives only for Studio browse
        example = undefined;
      }

      return {
        path: f.path,
        valueType: f.valueType,
        example,
        // isArray logic: path contains [] OR valueType indicates array semantics
        isArray: f.path.includes('[]') || f.valueType === 'array'
      };
    })
    // Sorted ascending by path (stable UI requirement)
    .sort((a, b) => a.path.localeCompare(b.path));

    return wrapSuccess(bindableFields, request.id);
  });
};
