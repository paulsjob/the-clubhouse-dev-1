
import { z } from 'zod';

export const BindingSourceV1Schema = z.object({
  kind: z.enum(["output", "topic"]),
  outputId: z.string().optional(),
  topic: z.string().optional(),
});

export const BindingRuleV1Schema = z.object({
  transform: z.string().optional(),
  format: z.object({
    type: z.enum(["none", "clock", "number", "string"]),
    options: z.record(z.string(), z.any()).optional(),
  }).optional(),
});

export const BindingEntryV1Schema = z.object({
  id: z.string(),
  orgId: z.string(),
  layoutId: z.string(),
  elementId: z.string(),
  source: BindingSourceV1Schema,
  path: z.string(),
  valueType: z.string().optional(),
  rules: BindingRuleV1Schema.optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const BindingSetV1Schema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  layoutId: z.string(),
  bindings: z.array(BindingEntryV1Schema),
  isActive: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const BindingSetCreateSchema = z.object({
  name: z.string().min(1),
  layoutId: z.string().min(1),
  isActive: z.boolean().default(true),
  bindings: z.array(z.object({
    elementId: z.string(),
    path: z.string(),
    source: BindingSourceV1Schema,
    valueType: z.string().optional(),
    rules: BindingRuleV1Schema.optional()
  }))
});
