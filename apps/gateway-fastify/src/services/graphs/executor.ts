
import { Graph, Node } from '@renderless/contracts';
import { internalFetch } from '../fetcher';
import { transformRegistry } from '../transforms/registry';

export interface ExecutionTrace {
  nodeId: string;
  type: string;
  startedAt: number;
  durationMs: number;
  outputPorts: string[];
  outputs?: Record<string, any>; // ITEM 23: Data capture for debugging
}

export interface ExecutionResult {
  result: any;
  trace?: ExecutionTrace[];
}

export class GraphExecutor {
  static async run(graph: Graph, orgId: string, params: Record<string, any> = {}): Promise<ExecutionResult> {
    const nodes = graph.nodes;
    const edges = graph.edges;
    const trace: ExecutionTrace[] = [];
    const nodeOutputs: Record<string, Record<string, any>> = {};

    // 1. Validate & Sort (Topological)
    const sortedNodes = this.topologicalSort(graph);
    
    // 2. Execute
    for (const node of sortedNodes) {
      const start = Date.now();
      const inputs = this.resolveInputs(node, edges, nodeOutputs);
      
      const outputs = await this.executeNode(node, orgId, inputs, params);
      
      nodeOutputs[node.id] = outputs;
      
      trace.push({
        nodeId: node.id,
        type: node.type,
        startedAt: start,
        durationMs: Date.now() - start,
        outputPorts: Object.keys(outputs),
        // ITEM 23: Only include output data in trace if explicitly requested (e.g., Preview)
        outputs: params.__debug ? outputs : undefined 
      });
    }

    // 3. Final Result
    // Use explicit result node or last node in sequence
    const resultNodeId = (graph as any).config?.resultNodeId || sortedNodes[sortedNodes.length - 1].id;
    const finalNodeOutputs = nodeOutputs[resultNodeId] || {};
    const result = finalNodeOutputs.out || finalNodeOutputs.data || Object.values(finalNodeOutputs)[0];

    return {
      result,
      trace: (params.__trace || params.__debug) ? trace : undefined
    };
  }

  private static topologicalSort(graph: Graph): Node[] {
    const nodes = new Map(graph.nodes.map(n => [n.id, n]));
    const adjacency = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    graph.nodes.forEach(n => inDegree.set(n.id, 0));
    
    graph.edges.forEach(e => {
      const neighbors = adjacency.get(e.fromNodeId) || [];
      neighbors.push(e.toNodeId);
      adjacency.set(e.fromNodeId, neighbors);
      inDegree.set(e.toNodeId, (inDegree.get(e.toNodeId) || 0) + 1);
    });

    const queue: string[] = [];
    inDegree.forEach((degree, id) => {
      if (degree === 0) queue.push(id);
    });

    const sorted: Node[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      const node = nodes.get(id);
      if (node) sorted.push(node);

      const neighbors = adjacency.get(id) || [];
      for (const neighbor of neighbors) {
        const d = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, d);
        if (d === 0) queue.push(neighbor);
      }
    }

    if (sorted.length !== graph.nodes.length) {
      throw new Error('Graph cycle detected or invalid edges present.');
    }

    return sorted;
  }

  private static resolveInputs(node: Node, edges: any[], nodeOutputs: any): Record<string, any> {
    const inputs: Record<string, any> = {};
    const incomingEdges = edges.filter(e => e.toNodeId === node.id);
    
    for (const edge of incomingEdges) {
      const sourceOutputs = nodeOutputs[edge.fromNodeId] || {};
      inputs[edge.toPort] = sourceOutputs[edge.fromPort];
    }
    
    return inputs;
  }

  private static async executeNode(node: Node, orgId: string, inputs: any, params: any): Promise<Record<string, any>> {
    switch (node.type) {
      case 'resource_fetch':
        return this.execResourceFetch(node.config, orgId, params);
      case 'transform':
        return this.execTransform(node.config, inputs);
      case 'pick':
        return this.execPick(node.config, inputs);
      case 'merge':
        return this.execMerge(inputs);
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  private static async execResourceFetch(config: any, orgId: string, params: any) {
    const substitute = (str: string) => {
      if (typeof str !== 'string') return str;
      return str.replace(/\{\{(.*?)\}\}/g, (_, key) => params[key.trim()] ?? `{{${key}}}`);
    };

    const result = await internalFetch({
      orgId,
      resourceId: config.resourceId,
      credentialId: config.credentialId,
      path: substitute(config.path),
      method: config.method || 'GET',
      query: config.query ? JSON.parse(substitute(JSON.stringify(config.query))) : undefined,
      body: config.body ? JSON.parse(substitute(JSON.stringify(config.body))) : undefined
    });

    return { data: result.body };
  }

  private static execTransform(config: any, inputs: any) {
    const transform = transformRegistry[config.transformKey] || transformRegistry.passthrough;
    return { out: transform(inputs.in) };
  }

  private static execPick(config: any, inputs: any) {
    const data = inputs.in;
    if (!data || typeof data !== 'object') return { out: data };

    const resolvePath = (obj: any, path: string) => {
      return path.split('.').reduce((acc, part) => acc?.[part], obj);
    };

    if (Array.isArray(config.paths)) {
      const result: any = {};
      config.paths.forEach((p: string) => {
        const parts = p.split('.');
        result[parts[parts.length - 1]] = resolvePath(data, p);
      });
      return { out: result };
    }

    if (config.map && typeof config.map === 'object') {
      const result: any = {};
      Object.entries(config.map).forEach(([newKey, path]) => {
        result[newKey] = resolvePath(data, path as string);
      });
      return { out: result };
    }

    return { out: data };
  }

  private static execMerge(inputs: any) {
    return { out: { ...(inputs.a || {}), ...(inputs.b || {}) } };
  }
}
