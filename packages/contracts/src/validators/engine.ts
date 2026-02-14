
import { z } from 'zod';
import { GraphSchema } from './graph';

export const EngineValidateRequestV1Schema = z.object({
  graphId: z.string().optional(),
  graph: GraphSchema.optional(),
}).refine(data => data.graphId || data.graph, {
  message: "Either graphId or graph must be provided"
});

export const EngineRunRequestV1Schema = EngineValidateRequestV1Schema.extend({
  params: z.record(z.string(), z.any()).optional(),
  trace: z.boolean().optional(),
});
