
import { z } from 'zod';

export const OutputSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  graphId: z.string(),
  type: z.enum(["endpoint", "topic"]),
  // Fix: Zod record requires key and value schemas
  config: z.record(z.string(), z.any()),
  isActive: z.boolean(),
});
