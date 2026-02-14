
import { SchemaSourceV1, SchemaFieldValueType } from './schema';

/**
 * ITEM 16: Flattened field reference for Studio binding
 */
export interface BindableFieldV1 {
  path: string;
  valueType: SchemaFieldValueType;
  example?: string | number | boolean | null;
  isArray?: boolean;
}

/**
 * ITEM 19: High-level manifest of all bindable sources in the org
 */
export interface BindingManifestV1 {
  generatedAt: number;
  outputs: Array<{
    outputId: string;
    name: string;
    latestSchemaId: string | null;
  }>;
  topics: Array<{
    topic: string;
    latestSchemaId: string | null;
  }>;
}

/**
 * ITEM 19: Detailed field response for a specific source
 */
export interface BindingFieldsResponseV1 {
  source: {
    kind: "output" | "topic" | "graph";
    outputId?: string;
    topic?: string;
    graphId?: string;
    schemaId: string;
  };
  fields: BindableFieldV1[];
}
