
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

export const CredentialSecretsSchema = z.object({
  apiKey: z.string().optional(),
  bearerToken: z.string().optional(),
  headerName: z.string().optional(),
  headerValue: z.string().optional(),
  queryParamName: z.string().optional(),
  queryParamValue: z.string().optional(),
});

export const CredentialSchema = CredentialMetadataSchema.extend({
  secrets: CredentialSecretsSchema,
});
