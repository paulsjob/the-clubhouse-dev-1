
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { CanvasStage } from './CanvasStage';
import { AssetLibraryPanel } from './features/assets/ui/AssetLibraryPanel';
import { AssetExplorer } from './features/assets/ui/AssetExplorer';
import { NewFolderDialog } from './features/assets/ui/NewFolderDialog';
import { useAssetsStore } from './features/assets/store';
import { DataEngineApp } from './features/data-engine/DataEngineApp';
import type { Element as ElementType, Layout, Guide } from './types';

const STAGE_W = 1920;
const STAGE_H = 1080;
const RULER_GUTTER = 28;

// --- STUDIO UI COMPONENTS ---
const ColorSwatch = ({ color, onChange, label, onCommit }: { color: string, onChange: (val: string) => void, label?: string, onCommit?: () => void }) => {
  const isNone = color === 'transparent' || !color;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
      {label && <span className="text-[8px] font-mono text-zinc-600 uppercase px-1">{label}</span>}
      <div className="flex items-center gap-2 p-1.5 bg-black/60 rounded-xl border border-zinc-800 transition-colors focus-within:border-zinc-700">
        <div className="flex gap-1.5 pointer-events-auto">
          <button 
            onClick={() => { onCommit?.(); onChange('transparent'); }}
            className={`w-9 h-9 rounded-lg border relative overflow-hidden transition-all ${isNone ? 'border-red-500 bg-white ring-2 ring-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.2)]' : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'}`}
            title="None"
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[150%] h-[2.5px] bg-red-600 rotate-45 shadow-[0_0_1px_rgba(255,255,255,0.8)]"></div>
            </div>
          </button>
          <button 
            onClick={() => inputRef.current?.click()}
            className={`w-9 h-9 rounded-lg border transition-all ${!isNone ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.2)]' : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'}`}
            style={{ backgroundColor: isNone ? 'transparent' : color }}
            title="Color Picker"
          >
            <input 
              ref={inputRef}
              type="color" 
              value={isNone ? '#ffffff' : color} 
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => { onChange(e.target.value); }} 
              onBlur={() => onCommit?.()}
              className="sr-only"
            />
          </button>
        </div>
        <div className="flex-1 px-3 py-2 bg-zinc-900/50 rounded-lg text-[10px] font-mono text-zinc-500 uppercase truncate pointer-events-none">
          {isNone ? 'None' : color}
        </div>
      </div>
    </div>
  );
};

const PropertyInput = ({ label, value, onChange, onCommit, suffix = "" }: { label: string, value: number | string, onChange: (v: string) => void, onCommit?: () => void, suffix?: string }) => (
  <div className="space-y-1.5" onPointerDown={(e) => e.stopPropagation()}>
    <label className="text-[8px] font-mono text-zinc-600 uppercase px-1 block">{label}</label>
    <div className="relative">
      <input 
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        onBlur={() => onCommit?.()}
        className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-[11px] font-mono text-zinc-300 focus:border-blue-500/50 outline-none transition-all pointer-events-auto"
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-zinc-600 pointer-events-none">{suffix}</span>}
    </div>
  </div>
);

// --- ITEM 26: FOLLOW MODE OVERLAY ---
const FollowModeOverlay = ({ isActive, events, onClose }: { isActive: boolean, events: any[], onClose: () => void }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  if (!isActive) return null;

  return (
    <div className="fixed bottom-24 right-10 w-96 max-h-[500px] bg-black/90 backdrop-blur-2xl border border-blue-500/30 rounded-3xl shadow-[0_0_80px_rgba(59,130,246,0.3)] z-[200] flex flex-col overflow-hidden animate-in slide-in-from-right duration-500">
      <div className="p-5 border-b border-zinc-800 bg-blue-600/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Follow-the-Data Mode</span>
        </div>
        <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/20">
        {events.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center opacity-30 gap-4">
             <div className="w-10 h-10 border-2 border-dashed border-zinc-600 rounded-full animate-spin" />
             <span className="text-[10px] font-mono uppercase tracking-widest">Awaiting Bus Logic...</span>
          </div>
        )}
        {events.map((ev, i) => (
          <div key={i} className={`p-4 rounded-2xl border ${ev.type === 'FOLLOW_START' ? 'bg-zinc-800/40 border-zinc-700' : ev.type === 'FOLLOW_END' ? 'bg-green-600/10 border-green-500/40' : 'bg-black/40 border-zinc-800'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] font-mono text-zinc-500">{new Date(ev.ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              {ev.stepIndex && <span className="text-[8px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded">STEP {ev.stepIndex}</span>}
            </div>
            <p className="text-[11px] font-bold text-zinc-300 uppercase tracking-tight">{ev.message || ev.nodeType || 'Event'}</p>
            {ev.outputs && (
              <pre className="mt-3 p-3 bg-black/60 rounded-xl text-[9px] font-mono text-blue-400 overflow-x-auto">
                {JSON.stringify(ev.outputs, null, 2)}
              </pre>
            )}
            {ev.finalResult && (
              <div className="mt-3 p-3 bg-green-500/10 rounded-xl">
                 <span className="text-[8px] font-black text-green-500 uppercase block mb-1">Final Bus Payload</span>
                 <pre className="text-[9px] font-mono text-green-400 whitespace-pre-wrap">{JSON.stringify(ev.finalResult, null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 text-[8px] font-mono text-zinc-600 uppercase text-center tracking-[0.3em]">
        Observing special.debug.follow
      </div>
    </div>
  );
};

// --- STUDIO APP FEATURE ---
const StudioApp = () => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5); 
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState<'select' | 'hand'>('select');
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setshowRulers] = useState(true);
  const [showSafeZones, setShowSafeZones] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [followActive, setFollowActive] = useState(false);
  const [followEvents, setFollowEvents] = useState<any[]>([]);

  const [inspectorWidth, setInspectorWidth] = useState(() => {
    const saved = localStorage.getItem('rl-inspector-width');
    return saved ? parseInt(saved, 10) : 320;
  });

  const { isPanelOpen, setPanelOpen } = useAssetsStore();

  const [layout, setLayout] = useState<Layout>({
    guides: [],
    elements: [
      {
        id: 'layer-1',
        type: 'shape',
        name: 'Accent Plate',
        x: 200,
        y: 200,
        width: 400,
        height: 200,
        visible: true,
        locked: false,
        style: { backgroundColor: '#3b82f6', borderRadius: '12px', borderColor: '#ffffff', borderWidth: '4px', fillOpacity: 0.8, opacity: 1 }
      },
      {
        id: 'layer-2',
        type: 'text',
        name: 'Title Text',
        x: 600,
        y: 400,
        width: 800,
        height: 120,
        visible: true,
        locked: false,
        data: { text: 'ULTRA HD COMPOSITOR\nSTAGE PRO v4.0', textType: 'area', verticalAlign: 'middle' },
        style: { 
          color: '#ffffff', 
          fontSize: '42px', 
          borderRadius: '8px', 
          textAlign: 'center',
          backgroundColor: '#000000',
          fillOpacity: 0.5,
          borderColor: '#ffffff',
          borderWidth: '2px',
          strokeOpacity: 0.2,
          padding: '40px',
          opacity: 1
        } 
      }
    ]
  });

  const [history, setHistory] = useState<Layout[]>([]);
  const [redoStack, setRedoStack] = useState<Layout[]>([]);

  const commitToHistory = useCallback(() => {
    setHistory(prev => [...prev, layout]);
    setRedoStack([]);
  }, [layout]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack(prev => [layout, ...prev]);
    setHistory(prev => prev.slice(0, -1));
    setLayout(previous);
  }, [history, layout]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory(prev => [...prev, layout]);
    setRedoStack(prev => prev.slice(1));
    setLayout(next);
  }, [redoStack, layout]);

  const updateElement = useCallback((id: string, patch: Partial<ElementType>) => {
    setLayout(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, ...patch } : el)
    }));
  }, []);

  const updateGuides = useCallback((guides: Guide[]) => {
    setLayout(prev => ({ ...prev, guides }));
  }, []);

  const deleteElement = (id: string) => {
    commitToHistory();
    setLayout(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== id)
    }));
    setSelectedIds(prev => prev.filter(p => p !== id));
  };

  const reorderElement = (id: string, direction: 'up' | 'down') => {
    commitToHistory();
    setLayout(prev => {
      const idx = prev.elements.findIndex(el => el.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.elements.length) return prev;
      
      const newElements = [...prev.elements];
      [newElements[idx], newElements[newIdx]] = [newElements[newIdx], newElements[idx]];
      return { ...prev, elements: newElements };
    });
  };

  const effectiveTool = useMemo(() => isSpacePressed ? 'hand' : tool, [isSpacePressed, tool]);

  const handleFollowData = async () => {
    setFollowActive(true);
    setFollowEvents([]);
    
    const eventSource = new EventSource('/v1/live/stream/debug.follow.*');
    eventSource.onmessage = (e) => {
      const payload = JSON.parse(e.data);
      if (payload.data) {
        setFollowEvents(prev => [...prev, payload.data]);
      }
    };

    try {
      await fetch('/v1/follow-the-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-rl-org-id': 'org_demo', 'x-rl-api-key': 'devkey_123' },
        body: JSON.stringify({ graphId: 'mlb_demo_graph' }) 
      });
    } catch (err) {
      console.error("Follow Mode Start Failed", err);
    }
  };

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = inspectorWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.min(Math.max(startWidth + delta, 280), 600);
      setInspectorWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
  }, [inspectorWidth]);

  useEffect(() => {
    localStorage.setItem('rl-inspector-width', inspectorWidth.toString());
  }, [inspectorWidth]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const key = e.key.toLowerCase();

      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      if (key === 'v') setTool('select');
      if (key === 'h') setTool('hand');
      if (key === 'z' && (e.metaKey || e.ctrlKey)) {
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (key === 'backspace' || key === 'delete') {
        selectedIds.forEach(id => deleteElement(id));
      }

      if (selectedIds.length > 0 && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const moveAmount = e.shiftKey ? 10 : 1;
        setLayout(prev => ({
          ...prev,
          elements: prev.elements.map(el => {
            if (selectedIds.includes(el.id)) {
              if (e.key === 'ArrowUp') return { ...el, y: el.y - moveAmount };
              if (e.key === 'ArrowDown') return { ...el, y: el.y + moveAmount };
              if (e.key === 'ArrowLeft') return { ...el, x: el.x - moveAmount };
              if (e.key === 'ArrowRight') return { ...el, x: el.x + moveAmount };
            }
            return el;
          })
        }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
      if (selectedIds.length > 0 && e.key.startsWith('Arrow')) commitToHistory();
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(s => Math.min(Math.max(s * delta, 0.05), 5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const viewport = viewportRef.current;
    if (viewport) viewport.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (viewport) viewport.removeEventListener('wheel', handleWheel);
    };
  }, [undo, redo, selectedIds, commitToHistory]);

  const selectedElements = useMemo(() => 
    layout.elements.filter(el => selectedIds.includes(el.id)),
    [layout.elements, selectedIds]
  );

  const handleFit = useCallback(() => {
    if (!viewportRef.current) return;
    const padding = 64; 
    const viewportWidth = viewportRef.current.clientWidth - padding;
    const viewportHeight = viewportRef.current.clientHeight - padding;
    const canvasWidth = STAGE_W + RULER_GUTTER;
    const canvasHeight = STAGE_H + RULER_GUTTER;
    const scaleX = viewportWidth / canvasWidth;
    const scaleY = viewportHeight / canvasHeight;
    const newScale = Math.min(scaleX, scaleY, 1.0); 
    setScale(newScale);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const addElement = (type: 'text' | 'shape' | 'image', src?: string) => {
    commitToHistory();
    const id = `layer-${Date.now()}`;
    const newElement: ElementType = {
      id,
      type,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      x: 960 - 200, 
      y: 540 - (type === 'text' ? 40 : 200),
      width: 400,
      height: type === 'text' ? 100 : 400,
      visible: true,
      locked: false,
      style: type === 'shape' 
        ? { backgroundColor: '#3b82f6', borderRadius: '8px', opacity: 1 } 
        : (type === 'text' 
          ? { color: '#ffffff', fontSize: '32px', textAlign: 'left', backgroundColor: 'transparent', padding: '10px', opacity: 1 } 
          : { opacity: 1 }),
      data: type === 'text' ? { text: 'NEW LAYER', textType: 'point', verticalAlign: 'top' } : undefined,
      src: src || (type === 'image' ? `https://picsum.photos/1024/1024?random=${id}` : undefined),
    };
    setLayout(prev => ({ ...prev, elements: [newElement, ...prev.elements] }));
    setSelectedIds([id]);
  };

  return (
    <div className="flex flex-1 w-full bg-[#050506] text-white overflow-hidden animate-in fade-in duration-300">
      <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900 shadow-[20px_0_60px_rgba(0,0,0,0.8)] z-40 relative">
        <div className="p-6 flex flex-col gap-6 shrink-0 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tighter leading-none text-white">STAGE PRO</h1>
              <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-black mt-1">Studio Editor</span>
            </div>
            <div className="flex gap-1">
              <button onClick={undo} disabled={history.length === 0} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-10"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 14 4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg></button>
              <button onClick={redo} disabled={redoStack.length === 0} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-10"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 14 5-5-5-5"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg></button>
            </div>
          </div>
          
          <button 
            onClick={handleFollowData}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase rounded-2xl transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 border border-blue-400/30"
          >
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            Follow the Data
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => addElement('text')} className="flex flex-col items-center justify-center gap-2 py-4 bg-zinc-800/40 border border-zinc-800 rounded-2xl transition-all group hover:bg-zinc-800 hover:border-zinc-500">
              <div className="text-zinc-500 group-hover:text-blue-400 transition-colors"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">text</span>
            </button>
            <button onClick={() => addElement('shape')} className="flex flex-col items-center justify-center gap-2 py-4 bg-zinc-800/40 border border-zinc-800 rounded-2xl transition-all group hover:bg-zinc-800 hover:border-zinc-500">
              <div className="text-zinc-500 group-hover:text-blue-400 transition-colors"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">shape</span>
            </button>
            <button 
              onClick={() => setPanelOpen(!isPanelOpen)} 
              className={`flex flex-col items-center justify-center gap-2 py-4 border rounded-2xl transition-all group ${isPanelOpen ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-zinc-800/40 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-500'}`}
            >
              <div className={`${isPanelOpen ? 'text-blue-400' : 'text-zinc-500 group-hover:text-blue-400'} transition-colors`}><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
              <span className={`text-[9px] font-black uppercase tracking-widest ${isPanelOpen ? 'text-blue-400' : 'text-zinc-500'}`}>assets</span>
            </button>
          </div>
          <div className="flex gap-2 p-1 bg-black rounded-2xl border border-zinc-800/80">
            <button onClick={() => setTool('select')} className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${tool === 'select' ? 'bg-blue-600 text-white' : 'text-zinc-500'}`}>
              <span className="text-[10px] font-black uppercase">Select</span>
            </button>
            <button onClick={() => setTool('hand')} className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${tool === 'hand' ? 'bg-blue-600 text-white' : 'text-zinc-500'}`}>
              <span className="text-[10px] font-black uppercase">Pan</span>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {!isPanelOpen ? (
            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar bg-zinc-900/40">
              <div className="mb-4 px-2 flex items-center justify-between"><span className="text-[9px] font-black text-zinc-500 tracking-[0.2em] uppercase">Stack</span></div>
              {layout.elements.map((el, i) => (
                <div key={el.id} onClick={() => setSelectedIds([el.id])} className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all cursor-pointer mb-1.5 ${selectedIds.includes(el.id) ? 'bg-blue-600/10 border-blue-500/40 shadow-inner' : 'bg-black/10 border-zinc-800/40 hover:border-zinc-700'}`}>
                  <div className="flex flex-col gap-1 pr-1 border-r border-zinc-800/50">
                    <button onClick={(e) => { e.stopPropagation(); reorderElement(el.id, 'up'); }} disabled={i === 0} className="text-zinc-600 hover:text-white disabled:opacity-0"><svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="m18 15-6-6-6 6"/></svg></button>
                    <button onClick={(e) => { e.stopPropagation(); reorderElement(el.id, 'down'); }} disabled={i === layout.elements.length - 1} className="text-zinc-600 hover:text-white disabled:opacity-0"><svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="m6 9 6 6 6-6"/></svg></button>
                  </div>
                  <p className={`text-[10px] font-black uppercase truncate flex-1 ${selectedIds.includes(el.id) ? 'text-white' : 'text-zinc-400'}`}>{el.name || el.type}</p>
                </div>
              ))}
            </div>
          ) : (
            <AssetLibraryPanel onSelect={(url) => addElement('image', url)} />
          )}
        </div>
      </div>

      <div 
        ref={viewportRef}
        onMouseDown={(e) => effectiveTool === 'hand' && setIsPanning(true)}
        onMouseMove={(e) => isPanning && setPanOffset(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }))}
        onMouseUp={() => setIsPanning(false)}
        className={`flex-1 relative bg-[#050506] overflow-hidden flex items-center justify-center ${effectiveTool === 'hand' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
      >
        <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}>
          <CanvasStage 
            layout={layout} 
            updateElement={updateElement} 
            updateGuides={updateGuides} 
            onCommit={commitToHistory} 
            scale={scale} 
            selectedIds={selectedIds} 
            onSelectionChange={setSelectedIds} 
            snapEnabled={snapEnabled} 
            showGrid={showGrid} 
            showRulers={showRulers} 
            showSafeZones={showSafeZones} 
            disableInteraction={effectiveTool === 'hand'} 
          />
        </div>
      </div>

      <div 
        style={{ width: inspectorWidth }}
        className="border-l border-zinc-800 flex flex-col bg-zinc-900 shadow-[-20px_0_60px_rgba(0,0,0,0.8)] z-40 relative group/sidebar"
      >
        <div 
          onMouseDown={handleResizeMouseDown}
          className="absolute left-[-2px] top-0 bottom-0 w-1 cursor-col-resize z-50 hover:bg-blue-600/50 transition-colors bg-transparent"
        />

        <div className="px-6 py-4 bg-black/10 border-b border-zinc-800"><h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Inspector</h3></div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-32">
          {selectedElements.length === 1 ? (
            <div className="space-y-6">
              <PropertyInput label="Layer Name" value={selectedElements[0].name || ''} onChange={(v) => updateElement(selectedElements[0].id, { name: v })} onCommit={commitToHistory} />

              {selectedElements[0].type === 'text' && (
                <>
                  <div className="space-y-2" onPointerDown={(e) => e.stopPropagation()}>
                    <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest px-1">Text Content</label>
                    <textarea value={selectedElements[0].data?.text || ''} onChange={(e) => updateElement(selectedElements[0].id, { data: { ...selectedElements[0].data, text: e.target.value } })} onBlur={() => commitToHistory()} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-[11px] font-bold text-zinc-300 focus:border-blue-500/50 outline-none min-h-[100px] transition-all pointer-events-auto resize-none" />
                  </div>
                </>
              )}

              <div className="space-y-6 pt-4 border-t border-zinc-800/50">
                <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest px-1">Appearance</label>
                <PropertyInput label="Layer Overall Opacity" suffix="%" value={Math.round(Number(selectedElements[0].style?.opacity ?? 1) * 100)} onChange={(v) => {
                  const num = parseInt(v) || 0;
                  updateElement(selectedElements[0].id, { style: { ...selectedElements[0].style, opacity: Math.min(Math.max(num / 100, 0), 1) } });
                }} onCommit={commitToHistory} />
                <ColorSwatch label="Fill Layer" color={selectedElements[0].style?.backgroundColor as string} onChange={(v) => updateElement(selectedElements[0].id, { style: { ...selectedElements[0].style, backgroundColor: v } })} onCommit={commitToHistory} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30 mt-32">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-loose text-center">Select a layer<br/>to begin editing</p>
            </div>
          )}
        </div>
      </div>

      <FollowModeOverlay isActive={followActive} events={followEvents} onClose={() => setFollowActive(false)} />
      <AssetExplorer />
      <NewFolderDialog />
    </div>
  );
};

// --- ITEM 28: DATA ENGINE APP (GROUND TRUTH PLAYGROUND) ---
const DataEngineAppImpl: React.FC = () => {
  const [playgroundOn, setPlaygroundOn] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [trace, setTrace] = useState<Array<{ id: string, label: string, desc: string, time: number }>>([]);
  const [payloads, setPayloads] = useState<Record<string, any>>({});
  const [inspectorTab, setInspectorTab] = useState('input');
  const [inspectorWidth, setInspectorWidth] = useState(400);

  const resizeRef = useRef<HTMLDivElement>(null);

  const handleResize = useCallback((e: MouseEvent) => {
    const newWidth = window.innerWidth - e.clientX;
    setInspectorWidth(Math.min(Math.max(newWidth, 300), 800));
  }, []);

  const stopResize = useCallback(() => {
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  }, [handleResize]);

  const startResize = useCallback(() => {
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  }, [handleResize, stopResize]);

  const runEngine = async () => {
    setIsExecuting(true);
    setTrace([]);
    setPayloads({});
    setActiveStep(null);

    const steps = [
      { id: 'input', label: 'Input Node', type: 'EMIT' },
      { id: 'transform', label: 'Transform Node', type: 'MAP' },
      { id: 'validate', label: 'Validate Node', type: 'CHECK' },
      { id: 'output', label: 'Output Node', type: 'FINAL' }
    ];

    const rawInput = {
      "home": { "team": "Seattle", "score": 24 },
      "away": { "team": "San Francisco", "score": 21 },
      "clock": "02:45",
      "quarter": 4
    };

    for (const step of steps) {
      setActiveStep(step.id);
      const start = performance.now();
      await new Promise(r => setTimeout(r, 600)); // Visible pacing
      
      let outPayload: any;
      let desc = "";

      if (step.id === 'input') {
        outPayload = rawInput;
        desc = "emitted raw payload";
      } else if (step.id === 'transform') {
        outPayload = {
          "headline": `${rawInput.home.team} leads ${rawInput.away.team}`,
          "scoreline": `${rawInput.home.score} – ${rawInput.away.score}`,
          "time": `Q${rawInput.quarter} ${rawInput.clock}`
        };
        desc = "mapped schema fields";
      } else if (step.id === 'validate') {
        outPayload = { status: "PASS", message: "Schema constraints satisfied" };
        desc = "passed validation";
      } else {
        outPayload = payloads['transform']; // Use transform output for final
        desc = "broadcast complete";
      }

      const duration = Math.round(performance.now() - start - 600); // Exclude artificial delay
      
      setPayloads(prev => ({ ...prev, [step.id]: outPayload }));
      setTrace(prev => [...prev, { id: step.id, label: step.label, desc, time: duration }]);
      setInspectorTab(step.id);
    }

    setIsExecuting(false);
    setActiveStep(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#050506] overflow-hidden animate-in fade-in duration-500">
      {/* PLAYGROUND HEADER */}
      <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-900/40 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-3 py-1.5 bg-blue-600/10 border border-blue-500/30 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Engine Playground (Local)</span>
          </div>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest italic opacity-60">
            Click Run Engine. Watch the data move left to right. This is the heart of Renderless.
          </p>
        </div>
        <button 
          onClick={runEngine}
          disabled={isExecuting}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase rounded-xl transition-all shadow-xl shadow-blue-600/20 flex items-center gap-3 disabled:opacity-40"
        >
          {isExecuting ? <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
          Run Engine
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* PANEL 1: NODE GRAPH */}
        <div className="flex-1 border-r border-zinc-800 p-10 bg-[#070709] relative overflow-hidden">
           <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
           
           <div className="flex flex-col h-full items-center justify-center gap-24 relative z-10">
              <div className="flex items-center gap-12">
                 {/* Input Node */}
                 <div className={`w-40 p-5 rounded-2xl border transition-all duration-300 ${activeStep === 'input' ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.2)] scale-110' : 'bg-zinc-900/50 border-zinc-800'}`}>
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2 block">Source</span>
                    <p className="text-[11px] font-bold text-zinc-300">Input Node</p>
                    <div className={`mt-3 w-2 h-2 rounded-full ${payloads.input ? 'bg-green-500' : 'bg-zinc-800'}`} />
                 </div>

                 {/* Arrow 1 */}
                 <div className="w-20 h-px bg-zinc-800 relative">
                    <div className={`absolute top-1/2 left-0 h-1 bg-blue-500 -translate-y-1/2 transition-all duration-1000 ${isExecuting && activeStep === 'transform' ? 'w-full opacity-100' : 'w-0 opacity-0'}`} />
                 </div>

                 {/* Transform Node */}
                 <div className={`w-40 p-5 rounded-2xl border transition-all duration-300 ${activeStep === 'transform' ? 'bg-purple-600/20 border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.2)] scale-110' : 'bg-zinc-900/50 border-zinc-800'}`}>
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2 block">Logic</span>
                    <p className="text-[11px] font-bold text-zinc-300">Transform</p>
                    <div className={`mt-3 w-2 h-2 rounded-full ${payloads.transform ? 'bg-purple-500' : 'bg-zinc-800'}`} />
                 </div>

                 {/* Arrow 2 */}
                 <div className="w-20 h-px bg-zinc-800 relative">
                    <div className={`absolute top-1/2 left-0 h-1 bg-purple-500 -translate-y-1/2 transition-all duration-1000 ${isExecuting && activeStep === 'validate' ? 'w-full opacity-100' : 'w-0 opacity-0'}`} />
                 </div>

                 {/* Validate Node */}
                 <div className={`w-40 p-5 rounded-2xl border transition-all duration-300 ${activeStep === 'validate' ? 'bg-yellow-600/20 border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.2)] scale-110' : 'bg-zinc-900/50 border-zinc-800'}`}>
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2 block">Filter</span>
                    <p className="text-[11px] font-bold text-zinc-300">Validate</p>
                    <div className={`mt-3 w-2 h-2 rounded-full ${payloads.validate ? 'bg-yellow-500' : 'bg-zinc-800'}`} />
                 </div>

                 {/* Arrow 3 */}
                 <div className="w-20 h-px bg-zinc-800 relative">
                    <div className={`absolute top-1/2 left-0 h-1 bg-green-500 -translate-y-1/2 transition-all duration-1000 ${isExecuting && activeStep === 'output' ? 'w-full opacity-100' : 'w-0 opacity-0'}`} />
                 </div>

                 {/* Output Node */}
                 <div className={`w-40 p-5 rounded-2xl border transition-all duration-300 ${activeStep === 'output' ? 'bg-green-600/20 border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.2)] scale-110' : 'bg-zinc-900/50 border-zinc-800'}`}>
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2 block">Sink</span>
                    <p className="text-[11px] font-bold text-zinc-300">Output Node</p>
                    <div className={`mt-3 w-2 h-2 rounded-full ${payloads.output ? 'bg-green-500 animate-pulse' : 'bg-zinc-800'}`} />
                 </div>
              </div>
           </div>
        </div>

        {/* PANEL 2: EXECUTION TRACE */}
        <div className="w-96 border-r border-zinc-800 flex flex-col bg-zinc-900/20">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Execution Trace</h4>
            <span className="text-[9px] font-mono text-zinc-600 uppercase">{trace.length} Steps</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {trace.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-10 space-y-4">
                 <div className="w-12 h-12 border-2 border-dashed border-zinc-400 rounded-full" />
                 <p className="text-[10px] font-mono uppercase tracking-[0.2em]">Trace Engine Idle</p>
              </div>
            )}
            {trace.map((entry, i) => (
              <div 
                key={i} 
                onClick={() => setInspectorTab(entry.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${inspectorTab === entry.id ? 'bg-blue-600/10 border-blue-500/40 shadow-inner' : 'bg-black/20 border-zinc-800/50 hover:border-zinc-700'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black text-blue-400 uppercase">[{entry.label}]</span>
                  <span className="text-[8px] font-mono text-zinc-600">{entry.time}ms</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-medium italic">{entry.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* PANEL 3: LIVE PAYLOAD INSPECTOR */}
        <div 
          style={{ width: inspectorWidth }}
          className="flex flex-col bg-[#050506] relative"
        >
          {/* RESIZE HANDLE */}
          <div 
            onMouseDown={startResize}
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600/50 transition-colors z-50"
          />

          <div className="h-14 border-b border-zinc-800 flex items-center px-6 gap-6 shrink-0 bg-zinc-900/20">
             {['input', 'transform', 'validate', 'output'].map(id => (
               <button 
                 key={id}
                 onClick={() => setInspectorTab(id)}
                 disabled={!payloads[id]}
                 className={`text-[9px] font-black uppercase tracking-widest transition-all border-b-2 h-full px-1 ${inspectorTab === id ? 'text-blue-500 border-blue-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'} disabled:opacity-20`}
               >
                 {id}
               </button>
             ))}
          </div>

          <div className="flex-1 overflow-auto p-8 font-mono text-[11px] text-blue-300 leading-relaxed custom-scrollbar">
            {payloads[inspectorTab] ? (
              <pre className="animate-in fade-in slide-in-from-top-1 duration-300">
                {JSON.stringify(payloads[inspectorTab], null, 2)}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-10">
                 <svg className="w-10 h-10 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>
                 <p className="text-[10px] uppercase tracking-widest">No Node Data Selected</p>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 text-[8px] font-mono text-zinc-600 uppercase text-center tracking-[0.2em]">
             Local Context Inspector v1.0
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MASTER NAVIGATION HEADER ---
const NavigationHeader = ({ current, onSwitch }: { current: string, onSwitch: (v: 'STUDIO' | 'DATA_ENGINE') => void }) => (
  <header className="h-14 bg-[#050506] border-b border-zinc-800 flex items-center justify-between px-6 z-[100] shrink-0">
    <div className="flex items-center gap-4">
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
        <span className="text-white font-black text-xl italic tracking-tighter">R</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-white tracking-widest leading-none">RENDERLESS</span>
        <span className="text-[7px] text-zinc-600 font-bold uppercase tracking-tight mt-0.5">Live Engine Workspace</span>
      </div>
    </div>
    <nav className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-zinc-800/50">
      {['STUDIO', 'CONTROL', 'DATA ENGINE', 'OUTPUT'].map(item => {
        const value = item === 'DATA ENGINE' ? 'DATA_ENGINE' : item;
        const isActive = (item === 'STUDIO' && current === 'STUDIO') || (item === 'DATA ENGINE' && current === 'DATA_ENGINE');
        const isClickable = item === 'STUDIO' || item === 'DATA ENGINE';
        return (
          <button key={item} disabled={!isClickable} onClick={() => isClickable && onSwitch(value as any)}
            className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] transition-all ${isActive ? 'bg-zinc-800 text-blue-400 shadow-inner' : 'text-zinc-500 hover:text-zinc-300 disabled:opacity-30'}`}
          >
            {item}
          </button>
        );
      })}
    </nav>
    <div className="flex items-center gap-6">
       <div className="flex items-center gap-2">
         <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
         <span className="text-[9px] font-black text-green-500/80 uppercase tracking-widest">Systems Online</span>
       </div>
    </div>
  </header>
);

const App = () => {
  const [view, setView] = useState<'STUDIO' | 'DATA_ENGINE'>('STUDIO');
  return (
    <div className="h-screen w-screen flex flex-col bg-[#050506] overflow-hidden">
      <NavigationHeader current={view} onSwitch={setView} />
      <main className="flex-1 flex overflow-hidden">
        {view === 'STUDIO' ? <StudioApp /> : <DataEngineAppImpl />}
      </main>
      <footer className="h-7 bg-black border-t border-zinc-900 flex items-center justify-between px-4 shrink-0 text-[8px] font-mono text-zinc-600 uppercase tracking-widest pointer-events-none">
        <div className="flex gap-4"><span>ENV: Production v2.0.4-stable</span><span>Org: Red Bull Media House</span></div>
        <span>RDLSS-6782-SYS</span>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
