import React, { useState, useRef, useEffect } from 'react';
import type { Element as ElementType, Layout, Guide } from './types';

interface CanvasStageProps {
  layout: Layout;
  updateElement: (id: string, patch: Partial<ElementType>) => void;
  updateGuides?: (guides: Guide[]) => void;
  onCommit?: () => void;
  selectedIds?: string[];
  scale?: number;
  snapEnabled?: boolean;
  showGrid?: boolean;
  showRulers?: boolean;
  showSafeZones?: boolean;
  disableInteraction?: boolean;
  onSelectionChange?: (ids: string[]) => void;
}

const RULER_GUTTER = 28;
const STAGE_W = 1920;
const STAGE_H = 1080;
const GRID_MAJOR = 120;
const GRID_MINOR = 60;
const SNAP_THRESHOLD = 10;

export const CanvasStage: React.FC<CanvasStageProps> = ({
  layout,
  updateElement,
  updateGuides,
  onCommit,
  selectedIds = [],
  scale = 0.5,
  snapEnabled = false,
  showGrid = false,
  showRulers = true,
  showSafeZones = false,
  disableInteraction = false,
  onSelectionChange,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const elementRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const canvasScale = scale || 0.5;

  const [dragState, setDragState] = useState<{
    startX: number;
    startY: number;
    initialPositions: Record<string, { x: number; y: number }>;
    hasMoved: boolean;
  } | null>(null);

  const [guideDragState, setGuideDragState] = useState<{
    id: string;
    type: 'h' | 'v';
    initialValue: number;
  } | null>(null);

  const [editingGuide, setEditingGuide] = useState<{ 
    id: string, 
    type: 'h' | 'v', 
    value: string,
    displayX: number,
    displayY: number
  } | null>(null);

  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineEditingText, setInlineEditingText] = useState("");

  // Auto-sync Point Text dimensions
  useEffect(() => {
    layout?.elements?.forEach((el: ElementType) => {
      if (el.type === 'text' && el.data?.textType === 'point' && inlineEditingId !== el.id) {
        const domEl = elementRefs.current[el.id];
        if (domEl) {
          const rect = domEl.getBoundingClientRect();
          const trueWidth = Math.round(rect.width / canvasScale);
          const trueHeight = Math.round(rect.height / canvasScale);
          if (Math.abs(el.width - trueWidth) > 2 || Math.abs(el.height - trueHeight) > 2) {
            updateElement(el.id, { width: trueWidth, height: trueHeight });
          }
        }
      }
    });
  }, [layout.elements, canvasScale, updateElement, inlineEditingId]);

  const getStageCoords = (clientX: number, clientY: number) => {
    if (!stageRef.current) return { x: 0, y: 0 };
    const rect = stageRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / canvasScale,
      y: (clientY - rect.top) / canvasScale,
    };
  };

  const handlePointerDown = (e: React.PointerEvent, element?: ElementType) => {
    if (disableInteraction || element?.locked || inlineEditingId) return;
    const coords = getStageCoords(e.clientX, e.clientY);
    if (!element) { 
      if (!e.shiftKey) onSelectionChange?.([]); 
      return; 
    }
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    
    let nextSelected = e.shiftKey 
      ? (selectedIds.includes(element.id) ? selectedIds.filter(id => id !== element.id) : [...selectedIds, element.id]) 
      : [element.id];
    
    onSelectionChange?.(nextSelected);
    
    const initialPositions: Record<string, { x: number; y: number }> = {};
    layout?.elements?.forEach((el: ElementType) => { 
      if (nextSelected.includes(el.id) && !el.locked) initialPositions[el.id] = { x: el.x, y: el.y }; 
    });
    
    setDragState({ startX: coords.x, startY: coords.y, initialPositions, hasMoved: false });
  };

  const guideIdCounter = useRef(0);

  const handleRulerPointerDown = (e: React.PointerEvent, type: 'h' | 'v') => {
    if (disableInteraction || inlineEditingId) return;
    e.stopPropagation();
    const coords = getStageCoords(e.clientX, e.clientY);
    const id = `guide-${guideIdCounter.current++}`;
    const value = type === 'h' ? Math.round(coords.y) : Math.round(coords.x);
    
    const newGuide: Guide = { id, type, value };
    const currentGuides = layout.guides || [];
    updateGuides?.([...currentGuides, newGuide]);
    
    setGuideDragState({ id, type, initialValue: value });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleGuidePointerDown = (e: React.PointerEvent, guide: Guide) => {
    if (disableInteraction || inlineEditingId) return;
    e.stopPropagation();
    setGuideDragState({ id: guide.id, type: guide.type, initialValue: guide.value });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (inlineEditingId) return;
    const coords = getStageCoords(e.clientX, e.clientY);

    if (dragState && !disableInteraction) {
      const dx = coords.x - dragState.startX;
      const dy = coords.y - dragState.startY;
      if (!dragState.hasMoved && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
        setDragState(p => p ? { ...p, hasMoved: true } : null);
      }
      Object.entries(dragState.initialPositions).forEach(([id, pos]) => {
        const el = layout.elements.find(e => e.id === id);
        if (!el) return;

        const initialPos = pos as { x: number; y: number };
        let nx = initialPos.x + dx; 
        let ny = initialPos.y + dy;

        if (snapEnabled) {
          for (const guide of (layout.guides || []).filter(g => g.type === 'v')) {
            const centerX = nx + el.width / 2;
            const rightX = nx + el.width;
            if (Math.abs(nx - guide.value) < SNAP_THRESHOLD) { nx = guide.value; break; }
            if (Math.abs(centerX - guide.value) < SNAP_THRESHOLD) { nx = guide.value - el.width / 2; break; }
            if (Math.abs(rightX - guide.value) < SNAP_THRESHOLD) { nx = guide.value - el.width; break; }
          }
          for (const guide of (layout.guides || []).filter(g => g.type === 'h')) {
            const centerY = ny + el.height / 2;
            const bottomY = ny + el.height;
            if (Math.abs(ny - guide.value) < SNAP_THRESHOLD) { ny = guide.value; break; }
            if (Math.abs(centerY - guide.value) < SNAP_THRESHOLD) { ny = guide.value - el.height / 2; break; }
            if (Math.abs(bottomY - guide.value) < SNAP_THRESHOLD) { ny = guide.value - el.height; break; }
          }
          if (nx === initialPos.x + dx) nx = Math.round(nx / 10) * 10;
          if (ny === initialPos.y + dy) ny = Math.round(ny / 10) * 10;
        }

        updateElement(id, { x: nx, y: ny });
      });
      return;
    }

    if (guideDragState && !disableInteraction) {
      let val = guideDragState.type === 'h' ? coords.y : coords.x;
      if (snapEnabled) val = Math.round(val / 10) * 10;
      else val = Math.round(val);

      const nextGuides = (layout.guides || []).map(g => 
        g.id === guideDragState.id ? { ...g, value: val } : g
      );
      updateGuides?.(nextGuides);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragState) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      if (dragState.hasMoved) onCommit?.();
      setDragState(null);
    }
    if (guideDragState) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      onCommit?.();
      setGuideDragState(null);
    }
  };

  const handleGuideEditSubmit = () => {
    if (!editingGuide) return;
    const val = parseInt(editingGuide.value);
    if (!isNaN(val)) {
      const nextGuides = (layout.guides || []).map(g => 
        g.id === editingGuide.id ? { ...g, value: val } : g
      );
      updateGuides?.(nextGuides);
      onCommit?.();
    }
    setEditingGuide(null);
  };

  const startInlineEdit = (el: ElementType) => {
    if (el.type !== 'text' || el.locked) return;
    setInlineEditingId(el.id);
    setInlineEditingText(el.data?.text || "");
  };

  const commitInlineEdit = () => {
    if (!inlineEditingId) return;
    updateElement(inlineEditingId, { data: { ...(layout.elements.find(e => e.id === inlineEditingId)?.data || {}), text: inlineEditingText } });
    onCommit?.();
    setInlineEditingId(null);
  };

  const cancelInlineEdit = () => {
    setInlineEditingId(null);
  };

  const renderedElements = [...(layout?.elements || [])].reverse();

  const getRGBA = (hex: string, opacity: number) => {
    if (!hex || hex === 'transparent') return 'transparent';
    if (hex.startsWith('rgba')) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  return (
    <div className={`relative inline-block bg-[#020203] border border-zinc-800 shadow-[0_0_100px_rgba(0,0,0,1)] ${disableInteraction ? 'pointer-events-none' : ''}`}>
      <div style={{ width: (STAGE_W + RULER_GUTTER) * canvasScale, height: (STAGE_H + RULER_GUTTER) * canvasScale }}>
        <div className="absolute inset-0 origin-top-left" style={{ transform: `scale(${canvasScale})` }}>
          
          {/* RULERS */}
          {showRulers && (
            <div className="absolute inset-0 z-[5000] pointer-events-none">
              <div 
                onPointerDown={(e) => handleRulerPointerDown(e, 'h')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={`absolute top-0 left-[28px] w-[1920px] h-[28px] bg-[#000000] border-b border-zinc-400 flex overflow-hidden ${disableInteraction ? 'pointer-events-none' : 'pointer-events-auto cursor-crosshair'}`}
              >
                {Array.from({ length: 1920 / 10 + 1 }).map((_, i) => {
                  const val = i * 10;
                  const isMajor = val % GRID_MAJOR === 0;
                  const isMinor = val % GRID_MINOR === 0;
                  return (
                    <div key={i} className={`absolute bottom-0 border-l ${isMajor ? 'border-zinc-100 h-full' : isMinor ? 'border-zinc-500 h-4' : 'border-zinc-800 h-2'}`} style={{ left: val }}>
                      {isMajor && <span className="absolute left-2.5 top-0.5 text-[20px] text-white font-mono font-bold tracking-tighter leading-none">{val}</span>}
                    </div>
                  );
                })}
              </div>
              <div 
                onPointerDown={(e) => handleRulerPointerDown(e, 'v')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={`absolute top-[28px] left-0 w-[28px] h-[1080px] bg-[#000000] border-r border-zinc-400 flex flex-col overflow-hidden ${disableInteraction ? 'pointer-events-none' : 'pointer-events-auto cursor-crosshair'}`}
              >
                {Array.from({ length: 1080 / 10 + 1 }).map((_, i) => {
                  const val = i * 10;
                  const isMajor = val % GRID_MAJOR === 0;
                  const isMinor = val % GRID_MINOR === 0;
                  return (
                    <div key={i} className={`absolute right-0 border-t ${isMajor ? 'border-zinc-100 w-full' : isMinor ? 'border-zinc-500 w-4' : 'border-zinc-800 w-2'}`} style={{ top: val }}>
                      {isMajor && <span className="absolute left-0.5 top-3 text-[20px] text-white font-mono font-bold tracking-tighter transform -rotate-90 origin-top-left whitespace-nowrap leading-none">{val}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="absolute top-0 left-0 w-[28px] h-[28px] bg-zinc-950 border-r border-b border-zinc-400 z-[5001]" />
            </div>
          )}

          {/* STAGE AREA */}
          <div 
            ref={stageRef} 
            onPointerDown={(e) => handlePointerDown(e)} 
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="absolute bg-[#000000] overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]" 
            style={{ left: RULER_GUTTER, top: RULER_GUTTER, width: STAGE_W, height: STAGE_H }}
          >
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none opacity-[0.25]" style={{ 
                backgroundImage: 'linear-gradient(to right, #666 1px, transparent 1px), linear-gradient(to bottom, #666 1px, transparent 1px)', 
                backgroundSize: '120px 120px' 
              }} />
            )}

            {showSafeZones && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="absolute border border-cyan-400/20" style={{ width: 1728, height: 972 }} />
                <div className="absolute border border-yellow-400/30" style={{ width: 1536, height: 864 }} />
              </div>
            )}

            {layout.guides?.map(guide => (
              <div 
                key={guide.id}
                onPointerDown={(e) => handleGuidePointerDown(e, guide)}
                onDoubleClick={(e) => {
                  const coords = getStageCoords(e.clientX, e.clientY);
                  setEditingGuide({ 
                    id: guide.id, 
                    type: guide.type, 
                    value: guide.value.toString(),
                    displayX: coords.x,
                    displayY: coords.y
                  });
                }}
                className={`absolute z-[4000] group cursor-${guide.type === 'h' ? 'row' : 'col'}-resize`}
                style={{
                  top: guide.type === 'h' ? guide.value : 0,
                  left: guide.type === 'v' ? guide.value : 0,
                  width: guide.type === 'h' ? '100%' : '1px',
                  height: guide.type === 'v' ? '100%' : '1px',
                  backgroundColor: 'cyan',
                  boxShadow: '0 0 4px rgba(0,255,255,0.5)'
                }}
              >
                <div className={`absolute -inset-${guide.type === 'h' ? 'y' : 'x'}-1.5 bg-transparent`} />
                <div className="absolute pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-cyan-500 text-black text-[12px] font-black px-2 py-0.5 rounded shadow-xl whitespace-nowrap z-[4001]"
                  style={{ left: guide.type === 'h' ? '20px' : '6px', top: guide.type === 'v' ? '20px' : '6px' }}
                >
                  {guide.value}px
                </div>
              </div>
            ))}

            {renderedElements.map((el: ElementType) => {
              if (el.visible === false) return null;
              const isSelected = selectedIds.includes(el.id);
              const isEditing = inlineEditingId === el.id;
              const isPoint = el.type === 'text' && el.data?.textType === 'point';
              const vAlign = el.data?.verticalAlign || 'top';
              const hAlign = el.style?.textAlign || 'left';
              const strokeWidth = parseInt(el.style?.borderWidth as string) || 0;

              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => handlePointerDown(e, el)}
                  onDoubleClick={() => startInlineEdit(el)}
                  className={`absolute ${el.locked ? 'pointer-events-none' : 'cursor-move'}`}
                  style={{
                    left: el.x,
                    top: el.y,
                    width: (isPoint && !isEditing) ? 'auto' : el.width,
                    height: (isPoint && !isEditing) ? 'auto' : el.height,
                    zIndex: isSelected || isEditing ? 1000 : undefined,
                  }}
                >
                  {isSelected && !el.locked && !isEditing && (
                    <div 
                      className="absolute pointer-events-none z-[2000]" 
                      style={{ 
                        inset: `calc(-1 * ${strokeWidth}px - 4px)`,
                        border: '4px solid #3b82f6',
                        boxShadow: '0 0 50px rgba(59,130,246,0.7)',
                        borderRadius: `calc(${el.style?.borderRadius || '0px'} + ${strokeWidth}px + 4px)`,
                      }} 
                    >
                      <div className="absolute -top-4 -left-4 w-8 h-8 bg-white border-[4px] border-blue-600 rounded-xl shadow-2xl z-[2001]" />
                      <div className="absolute -top-4 -right-4 w-8 h-8 bg-white border-[4px] border-blue-600 rounded-xl shadow-2xl z-[2001]" />
                      <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-white border-[4px] border-blue-600 rounded-xl shadow-2xl z-[2001]" />
                      <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-white border-[4px] border-blue-600 rounded-xl shadow-2xl z-[2001]" />
                    </div>
                  )}

                  <div
                    ref={(ref) => { elementRefs.current[el.id] = ref; }}
                    className="w-full h-full relative"
                    style={{
                      ...el.style,
                      backgroundColor: getRGBA(el.style?.backgroundColor as string, el.style?.fillOpacity ?? 1),
                      borderColor: getRGBA(el.style?.borderColor as string, el.style?.strokeOpacity ?? 1),
                      opacity: el.locked ? 0.3 : (el.style?.opacity || 1),
                      whiteSpace: isPoint ? 'nowrap' : 'normal',
                      padding: el.style?.padding || '0px',
                      borderRadius: el.style?.borderRadius || '0px',
                      borderWidth: `${strokeWidth}px`,
                      borderStyle: (el.style?.borderColor === 'transparent' || !el.style?.borderColor) ? 'none' : 'solid',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: vAlign === 'top' ? 'flex-start' : vAlign === 'middle' ? 'center' : 'flex-end',
                      alignItems: hAlign === 'left' ? 'flex-start' : hAlign === 'center' ? 'center' : 'flex-end',
                      boxSizing: 'border-box',
                    }}
                  >
                    {el.type === 'text' && (
                      isEditing ? (
                        <textarea
                          autoFocus
                          value={inlineEditingText}
                          onChange={(e) => setInlineEditingText(e.target.value)}
                          onBlur={commitInlineEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commitInlineEdit();
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          className="w-full bg-transparent outline-none border-none resize-none overflow-hidden font-black uppercase tracking-tight leading-none"
                          style={{
                            textAlign: hAlign as any,
                            color: el.style?.color || '#ffffff',
                            fontSize: el.style?.fontSize || 'inherit',
                            padding: 0,
                            margin: 0,
                            height: 'auto',
                            minWidth: '1ch',
                            whiteSpace: isPoint ? 'pre' : 'pre-wrap',
                            boxSizing: 'border-box',
                          }}
                        />
                      ) : (
                        <div className="pointer-events-none select-none font-black uppercase tracking-tight leading-none w-full" style={{ textAlign: hAlign as any }}>
                          {el.data?.text || ''}
                        </div>
                      )
                    )}
                    {el.type === 'image' && el.src && (
                      <img src={el.src} className="w-full h-full object-fill pointer-events-none" draggable={false} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {editingGuide && (
            <div className="absolute z-[10000] p-6 bg-zinc-900/95 backdrop-blur-xl border-2 border-blue-500 rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] pointer-events-auto"
              style={{ left: RULER_GUTTER + editingGuide.displayX + 20, top: RULER_GUTTER + editingGuide.displayY - 40, width: '320px' }}
            >
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-black uppercase text-zinc-400 tracking-widest">Edit {editingGuide.type === 'h' ? 'Horizontal' : 'Vertical'} Guide</span>
                  <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_100px_rgba(6,182,212,0.8)]" />
                </div>
                <div className="flex gap-3">
                  <div className="relative flex-1 group">
                    <input 
                      autoFocus
                      type="number" 
                      value={editingGuide.value}
                      onChange={(e) => setEditingGuide({ ...editingGuide, value: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleGuideEditSubmit(); if (e.key === 'Escape') setEditingGuide(null); }}
                      className="w-full bg-black border border-zinc-700 group-hover:border-zinc-500 rounded-xl px-4 py-3.5 text-lg font-mono text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 font-black text-xs">PX</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={handleGuideEditSubmit} className="px-5 py-2.5 bg-blue-600 text-white text-[11px] font-black uppercase rounded-xl hover:bg-blue-500 active:scale-95 transition-all shadow-lg">Apply</button>
                    <button onClick={() => setEditingGuide(null)} className="px-5 py-2.5 bg-zinc-800 text-white text-[11px] font-black uppercase rounded-xl hover:bg-zinc-700 active:scale-95 transition-all">Cancel</button>
                  </div>
                </div>
              </div>
              <div className="absolute -left-3 top-10 w-6 h-6 bg-zinc-900 border-l-2 border-b-2 border-blue-500 rotate-45" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
