
import { z } from 'zod';

export const EdgeSchema = z.object({
  fromNodeId: z.string(),
  fromPort: z.string(),
  toNodeId: z.string(),
  toPort: z.string(),
});

export const NodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  config: z.record(z.any()),
  inputs: z.array(z.string()).optional(),
  outputs: z.array(z.string()).optional(),
});

export const GraphSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  version: z.string(),
  paramsSchema: z.record(z.any()),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});
