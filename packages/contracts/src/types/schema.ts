
export type SchemaFieldValueType = "null" | "boolean" | "number" | "string" | "object" | "array";

export interface SchemaFieldV1 {
  path: string;
  valueType: SchemaFieldValueType;
  example?: string | number | boolean | null;
  isOptional?: boolean;
}

export interface SchemaSnapshotV1 {
  id: string;
  orgId: string;
  createdAt: number;
  sourceType: "output_run" | "live_topic";
  sourceId: string;
  fields: SchemaFieldV1[];
  hash: string;
}
