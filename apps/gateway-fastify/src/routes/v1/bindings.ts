
import { FastifyPluginAsync } from 'fastify';
import { 
  outputStore, 
  liveSessionStore, 
  schemaStore, 
  latestOutputSchemaMap, 
  latestTopicSchemaMap 
} from '../../services/storage';
import { wrapSuccess, wrapError } from '../../utils/responses';
import { 
  BindingManifestV1, 
  BindingFieldsResponseV1, 
  BindableFieldV1,
  SchemaSourceV1
} from '@renderless/contracts';

export const bindingRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * ITEM 19: GET /v1/bindings/manifest
   * Returns all available sources and their latest schema IDs for Studio binding.
   */
  fastify.get('/v1/bindings/manifest', {
    schema: {
      tags: ['Bindings'],
      summary: 'Get binding manifest',
      description: 'Lists all Outputs and Topics available for Studio data binding.',
    } as any
  }, async (request) => {
    const orgId = request.rl.orgId;

    // 1. Fetch Outputs from outputStore
    const outputs = await outputStore.list(orgId);
    const outputManifest = outputs.map(o => ({
      outputId: o.id,
      name: o.name,
      latestSchemaId: latestOutputSchemaMap.get(o.id) || null
    }));

    // 2. Fetch unique Topics from liveSessionStore
    const sessions = await liveSessionStore.list(orgId);
    const uniqueTopics = Array.from(new Set(sessions.flatMap(s => s.topics)));
    const topicManifest = uniqueTopics.map(t => ({
      topic: t,
      latestSchemaId: latestTopicSchemaMap.get(t) || null
    }));

    const manifest: BindingManifestV1 = {
      generatedAt: Date.now(),
      outputs: outputManifest,
      topics: topicManifest
    };

    return wrapSuccess(manifest, request.id);
  });

  /**
   * ITEM 19: GET /v1/bindings/fields
   * Returns flattened, sanitized fields for a specific source for Studio dropdowns.
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
    const orgId = request.rl.orgId;
    const q = request.query as any;

    let snapshot;
    if (q.schemaId) {
      snapshot = await schemaStore.get(orgId, q.schemaId);
    } else {
      const source: SchemaSourceV1 = { 
        kind: q.kind, 
        [q.kind === 'output' ? 'outputId' : q.kind === 'topic' ? 'topic' : 'graphId']: q.outputId || q.topic || q.graphId 
      } as any;
      snapshot = schemaStore.getLatestBySource(orgId, source);
    }

    if (!snapshot) {
      return reply.code(404).send(wrapError('NOT_FOUND', 'Schema snapshot not found for this source.', request.id));
    }

    // Map internal fields to Studio bindable fields (Prompt 19 requirements)
    const fields: BindableFieldV1[] = snapshot.fields.map(f => {
      // Example Sanitization: primitives only, max 80 chars
      let example = f.example;
      if (typeof example === 'string') {
        if (example.length > 80) {
          example = example.slice(0, 77) + '...';
        }
      } else if (typeof example === 'object' && example !== null) {
        example = undefined; // Strip objects/arrays from Studio examples
      }

      return {
        path: f.path,
        valueType: f.valueType,
        example,
        // isArray should be true if path contains [] OR valueType is array
        isArray: f.path.includes('[]') || f.valueType === 'array'
      };
    })
    // Sorted ascending by path (stable UI)
    .sort((a, b) => a.path.localeCompare(b.path));

    const response: BindingFieldsResponseV1 = {
      source: {
        kind: q.kind,
        outputId: q.outputId,
        topic: q.topic,
        graphId: q.graphId,
        schemaId: snapshot.id
      },
      fields
    };

    return wrapSuccess(response, request.id);
  });
};
