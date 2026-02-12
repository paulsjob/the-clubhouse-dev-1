
import { Credential } from './credential';
import { Resource } from './resource';
import { Graph } from './graph';
import { Output } from './output';
import { LiveSession } from './liveSession';
import { SchemaSnapshotV1 } from './schema';

export interface SnapshotV1 {
  credentials: Credential[];
  resources: Resource[];
  graphs: Graph[];
  outputs: Output[];
  liveSessions: LiveSession[];
  schemas: SchemaSnapshotV1[];
}

export interface SnapshotExportV1 {
  version: string;
  generatedAt: number;
  orgId: string;
  snapshot: SnapshotV1;
}

export interface SnapshotImportV1 {
  mode: "merge" | "replace";
  snapshot: SnapshotV1;
}
