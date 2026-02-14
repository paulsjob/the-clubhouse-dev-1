
import { z } from 'zod';
import { SchemaSourceV1Schema } from './schema';

export const BindableFieldV1Schema = z.object({
  path: z.string(),
  valueType: z.enum(["null", "boolean", "number", "string", "object", "array"]),
  example: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  isArray: z.boolean().optional(),
});

export const BindingManifestV1Schema = z.object({
  generatedAt: z.number(),
  sources: z.array(z.object({
    source: SchemaSourceV1Schema,
    latestSchemaId: z.string().optional(),
  })),
});

export const BindingFieldsResponseV1Schema = z.object({
  source: SchemaSourceV1Schema,
  schemaId: z.string(),
  fields: z.array(BindableFieldV1Schema),
});
