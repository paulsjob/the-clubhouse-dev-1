
export interface Edge {
  fromNodeId: string;
  fromPort: string;
  toNodeId: string;
  toPort: string;
}

export interface Node {
  id: string;
  type: string;
  config: Record<string, any>;
  inputs?: string[];
  outputs?: string[];
}

export interface Graph {
  id: string;
  orgId: string;
  name: string;
  version: string;
  paramsSchema: Record<string, any>;
  nodes: Node[];
  edges: Edge[];
}
