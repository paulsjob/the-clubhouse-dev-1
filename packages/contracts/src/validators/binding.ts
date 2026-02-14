
import { z } from 'zod';

export const BindableFieldV1Schema = z.object({
  path: z.string(),
  valueType: z.enum(["null", "boolean", "number", "string", "object", "array"]),
  example: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  isArray: z.boolean().optional(),
});

export const BindingManifestV1Schema = z.object({
  generatedAt: z.number(),
  outputs: z.array(z.object({
    outputId: z.string(),
    name: z.string(),
    latestSchemaId: z.string().nullable(),
  })),
  topics: z.array(z.object({
    topic: z.string(),
    latestSchemaId: z.string().nullable(),
  })),
});

export const BindingFieldsResponseV1Schema = z.object({
  source: z.object({
    kind: z.enum(["output", "topic", "graph"]),
    outputId: z.string().optional(),
    topic: z.string().optional(),
    graphId: z.string().optional(),
    schemaId: z.string(),
  }),
  fields: z.array(BindableFieldV1Schema),
});
