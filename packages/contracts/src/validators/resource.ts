
import { z } from 'zod';

export const ResourceSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  baseUrl: z.string().url(),
  providerHint: z.string().optional(),
  mode: z.enum(["http", "stream", "webhook"]),
  // Fix: Zod record requires key and value schemas
  requestTemplate: z.record(z.string(), z.any()),
  paramsSchema: z.record(z.string(), z.any()),
  credentialType: z.string(),
  samples: z.array(z.any()).optional(),
  // Fix: Zod record requires key and value schemas
  inferredSchema: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean(),
  // Fix: Zod record requires key and value schemas
  defaultHeaders: z.record(z.string(), z.string()).optional(),
});
