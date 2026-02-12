
import { z } from 'zod';

export const SchemaFieldV1Schema = z.object({
  path: z.string(),
  valueType: z.enum(["null", "boolean", "number", "string", "object", "array"]),
  example: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  isOptional: z.boolean().optional(),
});

export const SchemaSnapshotV1Schema = z.object({
  id: z.string(),
  orgId: z.string(),
  createdAt: z.number(),
  sourceType: z.enum(["output_run", "live_topic"]),
  sourceId: z.string(),
  fields: z.array(SchemaFieldV1Schema),
  hash: z.string(),
});
