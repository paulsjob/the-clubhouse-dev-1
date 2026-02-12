
/**
 * CORE SCHEMA: RENDERLESS MASTER TEMPLATE
 * Designed for "Design Once, Output Everywhere"
 */

export type AspectRatio = '16:9' | '9:16' | '1:1';

export interface LayerTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
}

export interface DataBinding {
  path: string;       // e.g., "stats.nfl.game(id).homeTeam.score"
  transform?: string; // e.g., "uppercase", "round"
  fallback?: string;
}

export interface Layer {
  id: string;
  name: string;
  type: 'text' | 'image' | 'video' | 'shape' | 'group';
  baseTransform: LayerTransform;
  
  // Design once, override per aspect ratio
  responsiveOverrides: {
    [key in AspectRatio]?: Partial<LayerTransform> & { visible?: boolean };
  };

  // Data Binding Metadata
  bindings: {
    [property: string]: DataBinding;
  };

  style: Record<string, any>;
  content?: any;
  // Added visible property to support Layer visibility
  visible?: boolean;
}

export interface Template {
  id: string;
  version: number;
  name: string;
  layers: Layer[];
  metadata: {
    sport: string;
    category: string;
    tags: string[];
  };
}
