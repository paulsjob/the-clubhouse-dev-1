
export type SchemaFieldValueType = "null" | "boolean" | "number" | "string" | "object" | "array";

export interface SchemaFieldV1 {
  path: string;
  valueType: SchemaFieldValueType;
  example?: string | number | boolean | null;
  isOptional?: boolean;
}

/**
 * ITEM 15: Formal source of a schema
 */
export type SchemaSourceV1 = 
  | { kind: "output"; outputId: string }
  | { kind: "topic"; topic: string }
  | { kind: "graph"; graphId: string };

export interface SchemaSnapshotV1 {
  id: string;
  orgId: string;
  createdAt: number;
  sourceType: "output_run" | "live_topic";
  sourceId: string;
  fields: SchemaFieldV1[];
  hash: string;
  source?: SchemaSourceV1; // Added in Item 15
}

/**
 * ITEM 14: Read-only reference for a specific field bindable in Studio
 */
export interface SchemaFieldRefV1 {
  path: string;
  valueType: SchemaFieldValueType;
  example: any;
}

/**
 * ITEM 14: A candidate schema source that Studio can bind to
 */
export interface SchemaBindingCandidateV1 {
  schemaId: string;
  sourceType: "output_run" | "live_topic";
  sourceId: string;
  name: string; // Friendly name for display
  fields: SchemaFieldRefV1[];
  source?: SchemaSourceV1;
}

/**
 * ITEM 15: Index entry for discovering schemas
 */
export interface SchemaIndexEntryV1 {
  schemaId: string;
  createdAt: number;
  source: SchemaSourceV1;
  summary?: string;
}
