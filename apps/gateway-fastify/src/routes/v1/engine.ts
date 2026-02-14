
import { FastifyPluginAsync } from 'fastify';
import { graphStore, traceStore } from '../../services/storage';
import { functionRegistry, mockFunctions } from '../../services/engine/registry';
import { wrapSuccess, wrapError } from '../../utils/responses';
import { 
  EngineValidateRequestV1Schema, EngineRunRequestV1Schema, 
  EngineErrorV1, EngineTraceEventV1, Graph, Node 
} from '@renderless/contracts';

export const engineRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Static analysis of a graph
   */
  const validateGraph = (graph: Graph): EngineErrorV1[] => {
    const errors: EngineErrorV1[] = [];
    if (!graph.nodes || graph.nodes.length === 0) {
      errors.push({ code: 'EMPTY_GRAPH', message: 'Graph must have at least one node' });
      return errors;
    }

    const nodeIds = new Set<string>();
    for (const node of graph.nodes) {
      if (nodeIds.has(node.id)) {
        errors.push({ code: 'DUPLICATE_NODE', message: `Duplicate node ID: ${node.id}`, nodeId: node.id });
      }
      nodeIds.add(node.id);

      const fn = functionRegistry.find(f => f.id === node.type);
      if (!fn) {
        errors.push({ code: 'INVALID_FUNCTION', message: `Unknown function type: ${node.type}`, nodeId: node.id });
      }
    }

    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.fromNodeId)) {
        errors.push({ code: 'INVALID_EDGE', message: `Edge from non-existent node: ${edge.fromNodeId}` });
      }
      if (!nodeIds.has(edge.toNodeId)) {
        errors.push({ code: 'INVALID_EDGE', message: `Edge to non-existent node: ${edge.toNodeId}` });
      }
    }

    // Cycle detection (DFS)
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const checkCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);
      const outgoingEdges = graph.edges.filter(e => e.fromNodeId === nodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.toNodeId)) {
          if (checkCycle(edge.toNodeId)) return true;
        } else if (recStack.has(edge.toNodeId)) {
          return true;
        }
      }
      recStack.delete(nodeId);
      return false;
    };

    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        if (checkCycle(node.id)) {
          errors.push({ code: 'CYCLE_DETECTED', message: 'Graph contains a cycle' });
          break;
        }
      }
    }

    return errors;
  };

  /**
   * Topological sort (Kahn's algorithm)
   */
  const topologicalSort = (graph: Graph): Node[] => {
    const nodes = new Map(graph.nodes.map(n => [n.id, n]));
    const inDegree = new Map<string, number>();
    graph.nodes.forEach(n => inDegree.set(n.id, 0));
    graph.edges.forEach(e => inDegree.set(e.toNodeId, (inDegree.get(e.toNodeId) || 0) + 1));

    const queue: string[] = [];
    inDegree.forEach((degree, id) => { if (degree === 0) queue.push(id); });

    const sorted: Node[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      const node = nodes.get(id);
      if (node) sorted.push(node);
      graph.edges.filter(e => e.fromNodeId === id).forEach(edge => {
        const d = (inDegree.get(edge.toNodeId) || 0) - 1;
        inDegree.set(edge.toNodeId, d);
        if (d === 0) queue.push(edge.toNodeId);
      });
    }
    return sorted;
  };

  // Fix: Cast schema to any to support Swagger extensions (tags, summary)
  fastify.get('/v1/functions', {
    schema: { tags: ['Engine'], summary: 'List available node functions' } as any
  }, async () => wrapSuccess(functionRegistry, 'system'));

  // Fix: Cast schema to any to support Swagger extensions (tags, summary)
  fastify.post('/v1/engine/validate', {
    schema: { tags: ['Engine'], summary: 'Validate graph structure' } as any
  }, async (request, reply) => {
    const body = EngineValidateRequestV1Schema.parse(request.body);
    let graph = body.graph;
    if (body.graphId) {
      const stored = await graphStore.get(request.rl.orgId, body.graphId);
      if (!stored) return reply.code(404).send(wrapError('NOT_FOUND', 'Graph not found', request.id));
      graph = stored;
    }
    const errors = validateGraph(graph!);
    return wrapSuccess({ valid: errors.length === 0, errors }, request.id);
  });

  // Fix: Cast schema to any to support Swagger extensions (tags, summary)
  fastify.post('/v1/engine/run', {
    schema: { tags: ['Engine'], summary: 'Execute dry-run trace of graph' } as any
  }, async (request, reply) => {
    const body = EngineRunRequestV1Schema.parse(request.body);
    const orgId = request.rl.orgId;
    let graph = body.graph;
    if (body.graphId) {
      const stored = await graphStore.get(orgId, body.graphId);
      if (!stored) return reply.code(404).send(wrapError('NOT_FOUND', 'Graph not found', request.id));
      graph = stored;
    }

    const errors = validateGraph(graph!);
    if (errors.length > 0) {
      return reply.code(400).send(wrapError('VALIDATION_FAILED', 'Invalid graph structure', request.id));
    }

    const sortedNodes = topologicalSort(graph!);
    const nodeOutputs: Record<string, any> = {};
    const traceEvents: EngineTraceEventV1[] = [];
    const traceId = `trace_${Date.now()}`;

    for (const node of sortedNodes) {
      const inputs: Record<string, any> = {};
      graph!.edges
        .filter((e: { toNodeId: string }) => e.toNodeId === node.id)
        .forEach((edge: any) => {
        const sourceOut = nodeOutputs[edge.fromNodeId] || {};
        inputs[edge.toPort] = sourceOut[edge.fromPort];
      });

      const start = Date.now();
      if (body.trace) {
        traceEvents.push({ nodeId: node.id, phase: 'input', ts: start, input: inputs });
      }

      const mockFn = mockFunctions[node.type] || mockFunctions.passthrough;
      const outputs = mockFn(inputs, node.config);
      nodeOutputs[node.id] = outputs;

      if (body.trace) {
        traceEvents.push({ nodeId: node.id, phase: 'output', ts: Date.now(), output: outputs });
      }
    }

    const finalNode = sortedNodes[sortedNodes.length - 1];
    const finalOutput = nodeOutputs[finalNode.id];

    if (body.trace) {
      traceStore.set(`${orgId}:${traceId}`, traceEvents);
    }

    return wrapSuccess({
      finalOutput,
      traceId,
      traceEvents: body.trace ? traceEvents : undefined
    }, request.id);
  });
};
