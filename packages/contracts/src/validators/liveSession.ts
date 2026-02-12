
import { z } from 'zod';

export const LiveSessionSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  outputId: z.string(),
  key: z.string(),
  params: z.record(z.any()),
  mode: z.string(),
  status: z.enum(["initializing", "active", "stalled", "terminated"]),
  startedAt: z.number(),
  lastHeartbeatAt: z.number(),
});
