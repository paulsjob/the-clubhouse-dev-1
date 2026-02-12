
import { z } from 'zod';

export const OutputSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  graphId: z.string(),
  type: z.enum(["endpoint", "topic"]),
  config: z.record(z.any()),
  isActive: z.boolean(),
});
