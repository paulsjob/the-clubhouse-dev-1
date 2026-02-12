
import { z } from 'zod';

export const LiveSessionSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  resourceId: z.string(),
  credentialId: z.string().optional(),
  pollIntervalMs: z.number().min(250).max(5000),
  topics: z.array(z.string()).min(1),
  path: z.string(),
  query: z.record(z.string(), z.string()).optional(),
  transform: z.string(),
  status: z.enum(["initializing", "active", "stalled", "terminated"]),
  startedAt: z.number().optional(),
  lastPublishedAt: z.number().optional(),
  lastError: z.string().optional(),
  consecutiveFailures: z.number().default(0),
});
