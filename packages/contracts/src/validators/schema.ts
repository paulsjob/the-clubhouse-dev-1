
import { z } from 'zod';

export const SchemaFieldV1Schema = z.object({
  path: z.string(),
  valueType: z.enum(["null", "boolean", "number", "string", "object", "array"]),
  example: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  isOptional: z.boolean().optional(),
});

export const SchemaSourceV1Schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("output"), outputId: z.string() }),
  z.object({ kind: z.literal("topic"), topic: z.string() }),
  z.object({ kind: z.literal("graph"), graphId: z.string() }),
]);

export const SchemaSnapshotV1Schema = z.object({
  id: z.string(),
  orgId: z.string(),
  createdAt: z.number(),
  sourceType: z.enum(["output_run", "live_topic"]),
  sourceId: z.string(),
  fields: z.array(SchemaFieldV1Schema),
  hash: z.string(),
  source: SchemaSourceV1Schema.optional(),
});

export const SchemaFieldRefV1Schema = z.object({
  path: z.string(),
  valueType: z.enum(["null", "boolean", "number", "string", "object", "array"]),
  example: z.any(),
});

export const SchemaBindingCandidateV1Schema = z.object({
  schemaId: z.string(),
  sourceType: z.enum(["output_run", "live_topic"]),
  sourceId: z.string(),
  name: z.string(),
  fields: z.array(SchemaFieldRefV1Schema),
  source: SchemaSourceV1Schema.optional(),
});

export const SchemaIndexEntryV1Schema = z.object({
  schemaId: z.string(),
  createdAt: z.number(),
  source: SchemaSourceV1Schema,
  summary: z.string().optional(),
});
