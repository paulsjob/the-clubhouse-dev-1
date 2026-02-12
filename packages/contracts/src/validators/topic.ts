
import { z } from 'zod';

export const TopicMessageSchema = z.object({
  type: z.enum(["snapshot", "update", "error"]),
  topic: z.string(),
  ts: z.number(),
  payload: z.any(),
  version: z.string(),
});
