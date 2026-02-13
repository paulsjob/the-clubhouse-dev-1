
import { z } from 'zod';
import { CredentialSchema } from './credential';
import { ResourceSchema } from './resource';
import { GraphSchema } from './graph';
import { OutputSchema } from './output';
import { LiveSessionSchema } from './liveSession';
import { SchemaSnapshotV1Schema } from './schema';
import { OrganizationSchema } from './org';

export const SnapshotV1Schema = z.object({
  credentials: z.array(CredentialSchema),
  resources: z.array(ResourceSchema),
  graphs: z.array(GraphSchema),
  outputs: z.array(OutputSchema),
  liveSessions: z.array(LiveSessionSchema),
  schemas: z.array(SchemaSnapshotV1Schema),
  organizations: z.array(OrganizationSchema).optional(), // Added in Item 13
});

export const SnapshotExportV1Schema = z.object({
  version: z.string(),
  generatedAt: z.number(),
  orgId: z.string(),
  snapshot: SnapshotV1Schema,
});

export const SnapshotImportV1Schema = z.object({
  mode: z.enum(["merge", "replace"]),
  snapshot: SnapshotV1Schema,
});
