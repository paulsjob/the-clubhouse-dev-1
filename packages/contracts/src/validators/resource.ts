
import { z } from 'zod';

export const ResourceSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  provider: z.string(),
  mode: z.enum(["http", "stream", "webhook"]),
  requestTemplate: z.record(z.any()),
  paramsSchema: z.record(z.any()),
  credentialType: z.string(),
  samples: z.array(z.any()).optional(),
  inferredSchema: z.record(z.any()).optional(),
  isActive: z.boolean(),
});
