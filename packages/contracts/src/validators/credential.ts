
import { z } from 'zod';

export const CredentialMetadataSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  provider: z.string(),
  type: z.string(),
  createdAt: z.number(),
  isActive: z.boolean(),
});
