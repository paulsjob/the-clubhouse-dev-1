
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { 
  orgStore, 
  resourceStore, 
  graphStore, 
  outputStore, 
  schemaStore,
  latestOutputSchemaMap,
  liveSessionStore
} from '../../services/storage';
import { GraphExecutor } from '../../services/graphs/executor';
import { SchemaDeriver } from '../../services/schema/derivation';
import { pollingService } from '../../services/live/polling';
import { wrapSuccess, wrapError } from '../../utils/responses';
import { config } from '../../config';
import { 
  Resource, 
  Graph, 
  Output, 
  SchemaSnapshotV1,
  LiveSession
} from '@renderless/contracts';

/**
 * Admin authentication preHandler for Demo routes
 */
const adminAuthPreHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const adminKey = request.headers['x-rl-admin-key'];
  if (!adminKey || adminKey !== config.adminApiKey) {
    return reply.code(401).send(wrapError('UNAUTHORIZED', 'Missing or invalid admin key', request.id));
  }
};

export const demoRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', adminAuthPreHandler);

  /**
   * ITEM 17: POST /v1/demo/mlb-scorebug
   * Bootstraps a complete MLB demo pipeline for an organization.
   */
  fastify.post('/v1/demo/mlb-scorebug', {
    schema: {
      tags: ['Demo'],
      summary: 'Bootstrap MLB Scorebug Demo',
      description: 'Generates a Resource, Graph, Output, and Schema snapshot for testing.',
      body: {
        type: 'object',
        required: ['orgId'],
        properties: {
          orgId: { type: 'string' },
          orgName: { type: 'string' },
          apiKey: { type: 'string' },
          mode: { type: 'string', enum: ['mock', 'http'], default: 'mock' },
          baseUrl: { type: 'string' }
        }
      },
      security: [{ adminKeyHeader: [] }]
    } as any
  }, async (request, reply) => {
    const { orgId, orgName, apiKey, mode, baseUrl } = request.body as any;

    // 1. Ensure Org Exists
    let org = await orgStore.getById(orgId);
    if (!org) {
      org = await orgStore.create(orgId, {
        id: orgId,
        orgId: orgId,
        name: orgName || `Demo Org: ${orgId}`,
        apiKey: apiKey || `devkey_${orgId}`,
        createdAt: Date.now(),
        isActive: true
      });
    }

    const suffix = Math.random().toString(36).substr(2, 4);

    // 2. Create Resource
    const resource: Resource = {
      id: `res_mlb_${suffix}`,
      orgId,
      name: "Demo MLB (mock)",
      baseUrl: mode === 'mock' ? 'mock://mlb' : (baseUrl || 'https://api.example.com/mlb'),
      mode: 'http',
      providerHint: 'mock',
      requestTemplate: {},
      paramsSchema: {},
      credentialType: 'none',
      isActive: true
    };
    await resourceStore.create(orgId, resource);

    // 3. Create Graph
    const graph: Graph = {
      id: `graph_mlb_${suffix}`,
      orgId,
      name: "Demo MLB Scorebug",
      version: "1.0.0",
      paramsSchema: {},
      nodes: [
        {
          id: "fetch_1",
          type: "resource_fetch",
          config: { resourceId: resource.id }
        },
        {
          id: "transform_1",
          type: "transform",
          config: { transformKey: "mlb_scorebug_v1" }
        }
      ],
      edges: [
        { fromNodeId: "fetch_1", fromPort: "data", toNodeId: "transform_1", toPort: "in" }
      ]
    };
    await graphStore.create(orgId, graph);

    // 4. Create Output
    const output: Output = {
      id: `out_mlb_${suffix}`,
      orgId,
      name: "Demo MLB Scorebug Output",
      graphId: graph.id,
      type: "endpoint",
      config: {},
      isActive: true
    };
    await outputStore.create(orgId, output);

    // 5. Generate Initial Schema (Execute once internally)
    let schemaId: string | undefined;
    try {
      const execution = await GraphExecutor.run(graph, orgId, {});
      const fields = SchemaDeriver.derive(execution.result);
      const hash = SchemaDeriver.generateHash(fields);
      
      const snapshot: SchemaSnapshotV1 = {
        id: `schema_mlb_${suffix}`,
        orgId,
        createdAt: Date.now(),
        sourceType: "output_run",
        sourceId: output.id,
        fields,
        hash,
        source: { kind: 'output', outputId: output.id }
      };

      await schemaStore.create(orgId, snapshot);
      latestOutputSchemaMap.set(output.id, snapshot.id);
      schemaId = snapshot.id;
    } catch (e: any) {
      fastify.log.error(`Demo schema generation failed: ${e.message}`);
    }

    return wrapSuccess({
      orgId: org.id,
      apiKey: org.apiKey,
      resourceId: resource.id,
      graphId: graph.id,
      outputId: output.id,
      schemaId
    }, request.id);
  });

  /**
   * ITEM 18: POST /v1/demo/mlb-live
   * Bootstraps a real-time mock session.
   */
  fastify.post('/v1/demo/mlb-live', {
    schema: {
      tags: ['Demo'],
      summary: 'Bootstrap MLB Live Session Demo',
      description: 'Generates a live session that emits updates via SSE. Consume the stream at GET /v1/live/stream/:topic',
      body: {
        type: 'object',
        required: ['orgId'],
        properties: {
          orgId: { type: 'string' },
          topic: { type: 'string', default: 'mlb.game.demo' },
          pollIntervalMs: { type: 'number', default: 1000 }
        }
      },
      security: [{ adminKeyHeader: [] }]
    } as any
  }, async (request) => {
    const { orgId, topic, pollIntervalMs } = request.body as any;

    // 1. Ensure Org
    let org = await orgStore.getById(orgId);
    if (!org) {
      org = await orgStore.create(orgId, {
        id: orgId,
        orgId: orgId,
        name: `Live Demo Org: ${orgId}`,
        apiKey: `devkey_${orgId}`,
        createdAt: Date.now(),
        isActive: true
      });
    }

    const suffix = Math.random().toString(36).substr(2, 4);

    // 2. Resource with mock-live protocol
    const resource: Resource = {
      id: `res_live_${suffix}`,
      orgId,
      name: "Demo MLB Live (mock)",
      baseUrl: "mock://mlb-live",
      mode: "http",
      providerHint: "mock",
      requestTemplate: {},
      paramsSchema: {},
      credentialType: "none",
      isActive: true
    };
    await resourceStore.create(orgId, resource);

    // 3. Live Session
    const session: LiveSession = {
      id: `sess_live_${suffix}`,
      orgId,
      name: "Demo MLB Live Session",
      resourceId: resource.id,
      pollIntervalMs: pollIntervalMs || 1000,
      topics: [topic || 'mlb.game.demo'],
      path: "/",
      transform: "mlb_scorebug_v1",
      status: "initializing",
      consecutiveFailures: 0
    };
    await liveSessionStore.create(orgId, session);

    // 4. Start immediately
    await pollingService.startSession(orgId, session.id);

    return wrapSuccess({
      orgId: org.id,
      apiKey: org.apiKey,
      topic: session.topics[0],
      liveSessionId: session.id,
      resourceId: resource.id
    }, request.id);
  });
};
