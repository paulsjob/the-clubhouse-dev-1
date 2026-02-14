
import { FastifyPluginAsync } from 'fastify';
import { schemaStore } from '../../services/storage';
import { wrapSuccess, wrapError } from '../../utils/responses';
import { 
  BindingManifestV1, 
  BindingFieldsResponseV1, 
  SchemaSourceV1,
  BindableFieldV1
} from '@renderless/contracts';

export const bindingRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /v1/bindings/manifest
   * Returns all available sources and their latest schema IDs.
   */
  fastify.get('/v1/bindings/manifest', {
    schema: {
      tags: ['Bindings'],
      summary: 'Get binding manifest',
      description: 'Lists all Outputs and Topics available for Studio data binding.',
    } as any
  }, async (request) => {
    const snapshots = await schemaStore.list(request.rl.orgId);
    
    // Group by source handle to find unique sources
    const sourceMap = new Map<string, { source: SchemaSourceV1, latestId: string, latestTs: number }>();

    for (const s of snapshots) {
      const source: SchemaSourceV1 = s.source || { 
        kind: s.sourceType === 'output_run' ? 'output' : 'topic' as any, 
        [s.sourceType === 'output_run' ? 'outputId' : 'topic']: s.sourceId 
      } as any;
      
      const handle = `${source.kind}:${(source as any).outputId || (source as any).topic || (source as any).graphId}`;
      const existing = sourceMap.get(handle);

      if (!existing || s.createdAt > existing.latestTs) {
        sourceMap.set(handle, { source, latestId: s.id, latestTs: s.createdAt });
      }
    }

    const manifest: BindingManifestV1 = {
      generatedAt: Date.now(),
      sources: Array.from(sourceMap.values()).map(v => ({
        source: v.source,
        latestSchemaId: v.latestId
      }))
    };

    return wrapSuccess(manifest, request.id);
  });

  /**
   * GET /v1/bindings/fields
   * Returns flattened fields for a specific source and optional schema ID.
   */
  fastify.get('/v1/bindings/fields', {
    schema: {
      tags: ['Bindings'],
      summary: 'Get bindable fields for a source',
      querystring: {
        type: 'object',
        required: ['kind'],
        properties: {
          kind: { type: 'string', enum: ['output', 'topic', 'graph'] },
          outputId: { type: 'string' },
          topic: { type: 'string' },
          graphId: { type: 'string' },
          schemaId: { type: 'string' }
        }
      }
    } as any
  }, async (request, reply) => {
    const q = request.query as any;
    const source: SchemaSourceV1 = { 
      kind: q.kind, 
      [q.kind === 'output' ? 'outputId' : q.kind === 'topic' ? 'topic' : 'graphId']: q.outputId || q.topic || q.graphId 
    } as any;

    let snapshot;
    if (q.schemaId) {
      snapshot = await schemaStore.get(request.rl.orgId, q.schemaId);
    } else {
      snapshot = schemaStore.getLatestBySource(request.rl.orgId, source);
    }

    if (!snapshot) {
      return reply.code(404).send(wrapError('NOT_FOUND', 'Schema not found for this source', request.id));
    }

    // Map internal fields to Studio bindable fields
    const fields: BindableFieldV1[] = snapshot.fields.map(f => ({
      path: f.path,
      valueType: f.valueType,
      example: f.example ? (typeof f.example === 'string' && f.example.length > 80 ? f.example.slice(0, 77) + '...' : f.example) : undefined,
      isArray: f.path.includes('[]') || f.valueType === 'array'
    })).sort((a, b) => a.path.localeCompare(b.path));

    const response: BindingFieldsResponseV1 = {
      source: snapshot.source || source,
      schemaId: snapshot.id,
      fields
    };

    return wrapSuccess(response, request.id);
  });
};
