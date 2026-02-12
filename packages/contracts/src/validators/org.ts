
import { z } from 'zod';

export const OrganizationSchema = z.object({
  id: z.string().min(2).max(64),
  name: z.string().min(1).max(255),
  apiKey: z.string().min(8),
  createdAt: z.number(),
  isActive: z.boolean(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const OrganizationCreateSchema = OrganizationSchema.omit({ createdAt: true });
export const OrganizationUpdateSchema = OrganizationSchema.partial().omit({ id: true, createdAt: true });
