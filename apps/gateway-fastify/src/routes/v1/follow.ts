
import { FastifyPluginAsync } from 'fastify';
import { graphStore, ephemeralStateStore } from '../../services/storage';
import { GraphExecutor } from '../../services/graphs/executor';
import { pubSubService } from '../../services/live/pubsub';
import { wrapSuccess, wrapError } from '../../utils/responses';

export const followRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /v1/follow-the-data
   * Orchestrates a slowed-down, narrated execution of a graph.
   */
  fastify.post('/v1/follow-the-data', {
    schema: {
      tags: ['Debug'],
      summary: 'Trigger "Follow the Data" mode',
      body: {
        type: 'object',
        required: ['graphId'],
        properties: {
          graphId: { type: 'string' },
          stepDelayMs: { type: 'number', default: 800 }
        }
      }
    } as any
  }, async (request, reply) => {
    const orgId = request.rl.orgId;
    const { graphId, stepDelayMs = 800 } = request.body as any;

    const graph = await graphStore.get(orgId, graphId);
    if (!graph) return reply.code(404).send(wrapError('NOT_FOUND', 'Graph not found', request.id));

    const debugTopic = `debug.follow.${graphId}`;

    // Start background orchestration so the request returns immediately
    (async () => {
      try {
        // 1. Initial State: "Simulation Tick"
        pubSubService.publish(orgId, debugTopic, {
          type: 'FOLLOW_START',
          message: 'Simulation Tick Detected',
          ts: Date.now()
        });

        await new Promise(r => setTimeout(r, stepDelayMs));

        // 2. Execution Logic (Manual Step-through to emit events)
        const nodeOutputs: Record<string, Record<string, any>> = {};
        const sortedNodes = (GraphExecutor as any).topologicalSort(graph);

        let stepIndex = 1;
        for (const node of sortedNodes) {
          const inputs = (GraphExecutor as any).resolveInputs(node, graph.edges, nodeOutputs);
          
          // Emit "Processing Node"
          pubSubService.publish(orgId, debugTopic, {
            type: 'FOLLOW_STEP',
            stepIndex,
            nodeId: node.id,
            nodeType: node.type,
            status: 'processing',
            inputs,
            ts: Date.now()
          });

          // Simulate work
          await new Promise(r => setTimeout(r, stepDelayMs));

          const outputs = await (GraphExecutor as any).executeNode(node, orgId, inputs, { __debug: true });
          nodeOutputs[node.id] = outputs;

          // Emit "Node Output"
          pubSubService.publish(orgId, debugTopic, {
            type: 'FOLLOW_STEP',
            stepIndex,
            nodeId: node.id,
            nodeType: node.type,
            status: 'completed',
            outputs,
            ts: Date.now()
          });

          stepIndex++;
          await new Promise(r => setTimeout(r, stepDelayMs));
        }

        // 3. Final Emit
        pubSubService.publish(orgId, debugTopic, {
          type: 'FOLLOW_END',
          message: 'Output Broadcast to Live Bus',
          finalResult: Object.values(nodeOutputs[sortedNodes[sortedNodes.length - 1].id])[0],
          ts: Date.now()
        });

      } catch (e: any) {
        pubSubService.publish(orgId, debugTopic, {
          type: 'FOLLOW_ERROR',
          error: e.message,
          ts: Date.now()
        });
      }
    })();

    return wrapSuccess({
      topic: debugTopic,
      message: 'Follow Mode initialized. Listening on bus.'
    }, request.id);
  });
};
