
import { SchemaFieldV1, SchemaFieldValueType } from '@renderless/contracts';

interface DerivationOptions {
  maxDepth?: number;
  maxFields?: number;
  arraySampleLimit?: number;
}

export class SchemaDeriver {
  static derive(data: any, options: DerivationOptions = {}): SchemaFieldV1[] {
    const fields: SchemaFieldV1[] = [];
    const maxDepth = options.maxDepth ?? 8;
    const maxFields = options.maxFields ?? 1000;
    const arraySampleLimit = options.arraySampleLimit ?? 3;

    const traverse = (val: any, path: string, depth: number) => {
      if (depth > maxDepth || fields.length >= maxFields) return;

      const type = this.getValueType(val);
      
      // Add current field
      fields.push({
        path,
        valueType: type,
        example: this.getSafeExample(val)
      });

      if (type === 'object' && val !== null) {
        Object.entries(val).forEach(([key, subVal]) => {
          const subPath = path ? `${path}.${key}` : key;
          traverse(subVal, subPath, depth + 1);
        });
      } else if (type === 'array' && Array.isArray(val)) {
        if (val.length === 0) return;
        
        // Sample first few items to find unique nested paths
        const arrayItemPath = `${path}[]`;
        const uniqueKeys = new Set<string>();
        
        const samples = val.slice(0, arraySampleLimit);
        samples.forEach(item => {
          if (this.getValueType(item) === 'object' && item !== null) {
            Object.keys(item).forEach(k => uniqueKeys.add(k));
          } else {
            uniqueKeys.add('_primitive');
          }
        });

        uniqueKeys.forEach(key => {
          if (key === '_primitive') {
             // Just sample the type from first item
             traverse(val[0], arrayItemPath, depth + 1);
          } else {
             // Traverse object structure inside array
             const representative = samples.find(s => s && typeof s === 'object' && key in s);
             traverse(representative[key], `${arrayItemPath}.${key}`, depth + 1);
          }
        });
      }
    };

    traverse(data, '', 0);

    // Filter out root empty path if it's there and sort
    return fields
      .filter(f => f.path !== '')
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  static generateHash(fields: SchemaFieldV1[]): string {
    const serialized = JSON.stringify(fields.map(f => ({ p: f.path, t: f.valueType })));
    let hash = 0;
    for (let i = 0; i < serialized.length; i++) {
      const char = serialized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; 
    }
    return Math.abs(hash).toString(16);
  }

  private static getValueType(val: any): SchemaFieldValueType {
    if (val === null) return "null";
    if (Array.isArray(val)) return "array";
    const t = typeof val;
    if (t === "boolean" || t === "number" || t === "string") return t as SchemaFieldValueType;
    if (t === "object") return "object";
    return "null";
  }

  private static getSafeExample(val: any): any {
    const type = typeof val;
    if (val === null) return null;
    if (type === 'boolean' || type === 'number') return val;
    if (type === 'string') {
      const truncated = val.slice(0, 80);
      return truncated.length < val.length ? truncated + '...' : truncated;
    }
    return undefined; // No examples for objects/arrays
  }
}
