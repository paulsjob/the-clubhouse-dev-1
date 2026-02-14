
import { Graph, Node } from '@renderless/contracts';

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{ nodeId?: string; message: string }>;
}

export class GraphValidator {
  /**
   * Performs static analysis of a logic graph.
   */
  static validate(graph: Graph): ValidationResult {
    const errors: Array<{ nodeId?: string; message: string }> = [];

    // 1. Structural Check
    if (!graph.nodes || graph.nodes.length === 0) {
      errors.push({ message: "Graph must contain at least one node." });
    }

    // 2. Cycle Detection
    try {
      this.checkCycles(graph);
    } catch (e: any) {
      errors.push({ message: e.message });
    }

    // 3. Port Satisfaction
    for (const node of graph.nodes) {
      // Check if required inputs are satisfied by edges
      if (node.inputs && node.inputs.length > 0) {
        for (const port of node.inputs) {
          const hasEdge = graph.edges.some(e => e.toNodeId === node.id && e.toPort === port);
          if (!hasEdge) {
            errors.push({ 
              nodeId: node.id, 
              message: `Input port '${port}' is disconnected and required.` 
            });
          }
        }
      }
    }

    // 4. Configuration Completeness
    for (const node of graph.nodes) {
      switch (node.type) {
        case 'resource_fetch':
          if (!node.config?.resourceId) {
            errors.push({ nodeId: node.id, message: "Resource Fetch node missing 'resourceId'." });
          }
          break;
        case 'transform':
          if (!node.config?.transformKey) {
            errors.push({ nodeId: node.id, message: "Transform node missing 'transformKey'." });
          }
          break;
        case 'pick':
          if (!node.config?.paths && !node.config?.map) {
            errors.push({ nodeId: node.id, message: "Pick node missing 'paths' or 'map' configuration." });
          }
          break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static checkCycles(graph: Graph) {
    const inDegree = new Map<string, number>();
    graph.nodes.forEach(n => inDegree.set(n.id, 0));
    
    graph.edges.forEach(e => {
      const current = inDegree.get(e.toNodeId) || 0;
      inDegree.set(e.toNodeId, current + 1);
    });

    const queue = Array.from(inDegree.entries())
      .filter(([_, d]) => d === 0)
      .map(([id]) => id);
      
    let visitedCount = 0;

    while (queue.length > 0) {
      const id = queue.shift()!;
      visitedCount++;
      
      const outgoingEdges = graph.edges.filter(e => e.fromNodeId === id);
      for (const edge of outgoingEdges) {
        const d = inDegree.get(edge.toNodeId)! - 1;
        inDegree.set(edge.toNodeId, d);
        if (d === 0) {
          queue.push(edge.toNodeId);
        }
      }
    }

    if (visitedCount !== graph.nodes.length) {
      throw new Error("Cyclic dependency detected in graph structure.");
    }
  }
}
