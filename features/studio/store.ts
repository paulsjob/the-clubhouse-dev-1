
import { create } from 'zustand';
import { Template, Layer, LayerTransform, AspectRatio } from '../../schema/template';

interface StudioState {
  template: Template | null;
  selectedLayerId: string | null;
  activePreviewRatio: AspectRatio;
  
  // Actions
  loadTemplate: (template: Template) => void;
  setLayerTransform: (layerId: string, transform: Partial<LayerTransform>) => void;
  setLayerOverride: (layerId: string, ratio: AspectRatio, override: Partial<LayerTransform>) => void;
  updateLayerBinding: (layerId: string, property: string, path: string) => void;
}

/**
 * FEATURE: Studio Store
 * Minimizes folder hopping by co-locating canvas state with schema enforcement.
 */
export const useStudioStore = create<StudioState>((set) => ({
  template: null,
  selectedLayerId: null,
  activePreviewRatio: '16:9',

  loadTemplate: (template) => set({ template }),

  setLayerTransform: (layerId, transform) => set((state) => {
    if (!state.template) return state;
    return {
      template: {
        ...state.template,
        layers: state.template.layers.map(l => 
          l.id === layerId 
            ? { ...l, baseTransform: { ...l.baseTransform, ...transform } }
            : l
        )
      }
    };
  }),

  setLayerOverride: (layerId, ratio, override) => set((state) => {
    if (!state.template) return state;
    return {
      template: {
        ...state.template,
        layers: state.template.layers.map(l => 
          l.id === layerId 
            ? { 
                ...l, 
                responsiveOverrides: { 
                  ...l.responsiveOverrides, 
                  [ratio]: { ...(l.responsiveOverrides[ratio] || {}), ...override } 
                } 
              }
            : l
        )
      }
    };
  }),

  updateLayerBinding: (layerId, property, path) => set((state) => {
    if (!state.template) return state;
    return {
      template: {
        ...state.template,
        layers: state.template.layers.map(l => 
          l.id === layerId 
            ? { ...l, bindings: { ...l.bindings, [property]: { path } } }
            : l
        )
      }
    };
  }),
}));
