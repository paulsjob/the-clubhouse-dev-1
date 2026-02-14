
import { FastifyPluginAsync } from 'fastify';
import { graphStore, outputStore, schemaStore, latestOutputSchemaMap } from '../../services/storage';
import { GraphValidator } from '../../services/graphs/validator';
import { simulationEngine } from '../../services/simulation/engine';
import { GraphExecutor } from '../../services/graphs/executor';
import { SchemaDeriver } from '../../services/schema/derivation';
import { wrapSuccess, wrapError } from '../../utils/responses';
import { Output, SchemaSnapshotV1 } from '@renderless/contracts';

export const deployRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /v1/deploy
   * The "Magical" Orchestrator. 
   * Validates a graph, creates an output, and ensures data is flowing.
   */
  fastify.post('/v1/deploy', {
    schema: {
      tags: ['Deployment'],
      summary: 'One-click deploy graph to live bus',
      body: {
        type: 'object',
        properties: {
          graphId: { type: 'string' },
          name: { type: 'string' },
          autoStartSim: { type: 'boolean', default: true }
        }
      }
    } as any
  }, async (request, reply) => {
    const orgId = request.rl.orgId;
    const { graphId, name, autoStartSim } = (request.body as any) || {};

    // 1. Resolve Graph
    let graph;
    if (graphId) {
      graph = await graphStore.get(orgId, graphId);
    } else {
      const all = await graphStore.list(orgId);
      graph = all[all.length - 1]; // Use latest if none specified
    }

    if (!graph) {
      return reply.code(404).send(wrapError('NOT_FOUND', 'No graph found to deploy.', request.id));
    }

    // 2. Validate
    const validation = GraphValidator.validate(graph);
    if (!validation.isValid) {
      return reply.code(400).send(wrapError('INVALID_GRAPH', 'Graph failed validation. Fix errors before deploying.', request.id));
    }

    // 3. Upsert Output
    const outputId = `out_deploy_${graph.id}`;
    const output: Output = {
      id: outputId,
      orgId,
      name: name || `Live Production: ${graph.name}`,
      graphId: graph.id,
      type: 'endpoint',
      config: { deployedAt: Date.now() },
      isActive: true
    };
    await outputStore.create(orgId, output);

    // 4. Generate Schema Snapshot
    try {
      const execution = await GraphExecutor.run(graph, orgId, {});
      const fields = SchemaDeriver.derive(execution.result);
      const hash = SchemaDeriver.generateHash(fields);
      
      const snapshot: SchemaSnapshotV1 = {
        id: `schema_deploy_${Date.now()}`,
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
    } catch (e) {
      fastify.log.warn('Deployment: Initial schema generation failed, but proceeding.');
    }

    // 5. Auto-start Simulation (The "Magic" part)
    const topic = `live.production.${graph.id}`;
    if (autoStartSim) {
      const simType = graph.name.toLowerCase().includes('mlb') ? 'mlb_scorebug' : 'generic';
      simulationEngine.start(orgId, simType, topic, 1000);
    }

    return wrapSuccess({
      status: 'deployed',
      outputId,
      topic,
      graphId: graph.id,
      message: 'Graph validated and deployed. Live bus data active.'
    }, request.id);
  });
};
