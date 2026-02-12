
import { Layer, AspectRatio, LayerTransform } from '../../schema/template';

/**
 * VERTICAL SLICE: Responsive Resolver
 * Computes the final visual transform of a layer based on the output channel's aspect ratio.
 */
export const resolveLayerTransform = (
  layer: Layer, 
  targetRatio: AspectRatio
): LayerTransform & { visible: boolean } => {
  
  const base = layer.baseTransform;
  const override = layer.responsiveOverrides[targetRatio];

  // If no override exists, fall back to master design
  // Fix: layer.visible is now part of the Layer interface
  if (!override) {
    return { ...base, visible: layer.visible ?? true };
  }

  // Deep merge base with overrides
  // Fix: layer.visible is now part of the Layer interface
  return {
    x: override.x ?? base.x,
    y: override.y ?? base.y,
    width: override.width ?? base.width,
    height: override.height ?? base.height,
    scale: override.scale ?? base.scale ?? 1,
    rotation: override.rotation ?? base.rotation ?? 0,
    opacity: override.opacity ?? base.opacity ?? 1,
    visible: override.visible ?? layer.visible ?? true
  };
};

/**
 * Batch resolve all layers for a specific output ratio.
 */
export const resolveTemplateForRatio = (layers: Layer[], ratio: AspectRatio) => {
  return layers.map(layer => ({
    ...layer,
    computedTransform: resolveLayerTransform(layer, ratio)
  }));
};
