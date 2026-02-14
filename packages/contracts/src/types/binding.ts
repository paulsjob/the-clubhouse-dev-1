
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
 * ITEM 16: High-level manifest of all bindable sources in the org
 */
export interface BindingManifestV1 {
  generatedAt: number;
  sources: Array<{
    source: SchemaSourceV1;
    latestSchemaId?: string;
  }>;
}

/**
 * ITEM 16: Detailed field response for a specific source
 */
export interface BindingFieldsResponseV1 {
  source: SchemaSourceV1;
  schemaId: string;
  fields: BindableFieldV1[];
}
