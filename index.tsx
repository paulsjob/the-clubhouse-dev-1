
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
  
  // ITEM 26: Follow Mode State
  const [followActive, setFollowActive] = useState(false);
  const [followEvents, setFollowEvents] = useState<any[]>([]);

  // ITEM 24: Resizable Inspector State
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

  // ITEM 26: Follow Mode Activation
  const handleFollowData = async () => {
    setFollowActive(true);
    setFollowEvents([]);
    
    // Wire SSE listener for the debug topic
    const eventSource = new EventSource('/v1/live/stream/debug.follow.*');
    eventSource.onmessage = (e) => {
      const payload = JSON.parse(e.data);
      if (payload.data) {
        setFollowEvents(prev => [...prev, payload.data]);
        
        // Visual Feedback on Canvas
        if (payload.data.nodeId) {
          // Temporarily highlight nodes in layout? 
          // Instead, we just show them in the overlay for stability
        }
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

    // Auto-close handler stored in ref or state if needed
  };

  // ITEM 24: Resizing Logic
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
          
          {/* ITEM 26: FOLLOW THE DATA BUTTON */}
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
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); updateElement(el.id, { visible: !el.visible }); }} className={`p-1 hover:text-white ${el.visible ? 'text-zinc-500' : 'text-blue-500'}`}>
                      {el.visible ? <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg> : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }} className="p-1 text-zinc-500 hover:text-red-500"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                  </div>
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
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-zinc-900/90 backdrop-blur-3xl rounded-full border border-zinc-800 flex items-center gap-10 text-[9px] font-black uppercase text-zinc-500 shadow-2xl z-50">
          <div className="flex items-center gap-3 text-white"><span className="opacity-30">Zoom</span><span className="font-mono text-[10px]">{Math.round(scale * 100)}%</span></div>
          <div className="w-px h-5 bg-zinc-800" />
          <div className="flex gap-8">
            <button onClick={() => setShowGrid(!showGrid)} className={`hover:text-zinc-300 transition-colors ${showGrid ? 'text-blue-400 font-bold' : ''}`}>Grid</button>
            <button onClick={() => setshowRulers(!showRulers)} className={`hover:text-zinc-300 transition-colors ${showRulers ? 'text-blue-400 font-bold' : ''}`}>Rulers</button>
            <button onClick={() => setShowSafeZones(!showSafeZones)} className={`hover:text-zinc-300 transition-colors ${showSafeZones ? 'text-blue-400 font-bold' : ''}`}>Safe</button>
            <button onClick={() => setSnapEnabled(!snapEnabled)} className={`hover:text-zinc-300 transition-colors ${snapEnabled ? 'text-blue-400 font-bold' : ''}`}>Snap</button>
            <button onClick={handleFit} className="text-blue-500 font-black hover:text-blue-400 transition-colors">Fit View</button>
          </div>
        </div>
      </div>

      {/* ITEM 24: Resizable Sidebar */}
      <div 
        style={{ width: inspectorWidth }}
        className="border-l border-zinc-800 flex flex-col bg-zinc-900 shadow-[-20px_0_60px_rgba(0,0,0,0.8)] z-40 relative group/sidebar"
      >
        {/* RESIZER HANDLE */}
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
                  <div className="space-y-3" onPointerDown={(e) => e.stopPropagation()}>
                    <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest px-1">Type Setting</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-black rounded-xl border border-zinc-800">
                      <button onClick={() => { commitToHistory(); updateElement(selectedElements[0].id, { data: { ...selectedElements[0].data, textType: 'point' } }); }} className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all ${selectedElements[0].data?.textType === 'point' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Point</button>
                      <button onClick={() => { commitToHistory(); updateElement(selectedElements[0].id, { data: { ...selectedElements[0].data, textType: 'area' } }); }} className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all ${selectedElements[0].data?.textType === 'area' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Area</button>
                    </div>
                  </div>
                  <div className="space-y-2" onPointerDown={(e) => e.stopPropagation()}>
                    <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest px-1">Text Content</label>
                    <textarea value={selectedElements[0].data?.text || ''} onChange={(e) => updateElement(selectedElements[0].id, { data: { ...selectedElements[0].data, text: e.target.value } })} onBlur={() => commitToHistory()} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-[11px] font-bold text-zinc-300 focus:border-blue-500/50 outline-none min-h-[100px] transition-all pointer-events-auto resize-none" />
                  </div>
                  <div className="space-y-4" onPointerDown={(e) => e.stopPropagation()}>
                    <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest px-1">Justification</label>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-black/40 rounded-xl border border-zinc-800">
                      {[
                        { v: 'top', h: 'left' }, { v: 'top', h: 'center' }, { v: 'top', h: 'right' },
                        { v: 'middle', h: 'left' }, { v: 'middle', h: 'center' }, { v: 'middle', h: 'right' },
                        { v: 'bottom', h: 'left' }, { v: 'bottom', h: 'center' }, { v: 'bottom', h: 'right' }
                      ].map((pos) => {
                        const isActive = (selectedElements[0].data?.verticalAlign || 'top') === pos.v && (selectedElements[0].style?.textAlign || 'left') === pos.h;
                        return (
                          <button key={`${pos.v}-${pos.h}`} onClick={() => { commitToHistory(); updateElement(selectedElements[0].id, { data: { ...selectedElements[0].data, verticalAlign: pos.v as any }, style: { ...selectedElements[0].style, textAlign: pos.h as any } }); }} className={`h-10 rounded-lg flex items-center justify-center transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-600 hover:bg-zinc-800'}`}>
                            <div className={`w-4 h-4 border border-current rounded-sm relative flex flex-col ${pos.v === 'top' ? 'justify-start' : pos.v === 'middle' ? 'justify-center' : 'justify-end'} ${pos.h === 'left' ? 'items-start' : pos.h === 'center' ? 'items-center' : 'items-end'}`}><div className="w-[50%] h-[2px] bg-current m-0.5 rounded-full" /></div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-6 pt-4 border-t border-zinc-800/50">
                <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest px-1">Appearance</label>
                
                <PropertyInput label="Layer Overall Opacity" suffix="%" value={Math.round(Number(selectedElements[0].style?.opacity ?? 1) * 100)} onChange={(v) => {
                  const num = parseInt(v) || 0;
                  updateElement(selectedElements[0].id, { style: { ...selectedElements[0].style, opacity: Math.min(Math.max(num / 100, 0), 1) } });
                }} onCommit={commitToHistory} />

                {selectedElements[0].type === 'text' && (
                  <ColorSwatch label="Text Style" color={selectedElements[0].style?.color as string} onChange={(v) => updateElement(selectedElements[0].id, { style: { ...selectedElements[0].style, color: v } })} onCommit={commitToHistory} />
                )}
                
                <div className="space-y-4">
                  <ColorSwatch label="Fill Layer" color={selectedElements[0].style?.backgroundColor as string} onChange={(v) => updateElement(selectedElements[0].id, { style: { ...selectedElements[0].style, backgroundColor: v } })} onCommit={commitToHistory} />
                  <PropertyInput label="Fill Opacity" suffix="%" value={Math.round((selectedElements[0].style?.fillOpacity ?? 1) * 100)} onChange={(v) => {
                    const num = parseInt(v) || 0;
                    updateElement(selectedElements[0].id, { style: { ...selectedElements[0].style, fillOpacity: Math.min(Math.max(num / 100, 0), 1) } });
                  }} onCommit={commitToHistory} />
                </div>

                <div className="space-y-4 pt-2 border-t border-zinc-800/30">
                  <div className="grid grid-cols-[1fr_80px] gap-3 items-end">
                    <ColorSwatch label="Stroke Outline" color={selectedElements[0].style?.borderColor as string} onChange={(v) => updateElement(selectedElements[0].id, { style: { ...selectedElements[0].style, borderColor: v, borderStyle: v === 'transparent' ? 'none' : 'solid' } })} onCommit={commitToHistory} />
                    <div className="space-y-1.5 pb-1 pointer-events-auto">
                       <span className="text-[8px] font-mono text-zinc-600 uppercase px-1">Weight</span>
                       <input type="number" onMouseDown={(e) => e.stopPropagation()} value={parseInt(selectedElements[0].style?.borderWidth as string) || 0} onChange={(e) => updateElement(selectedElements[0].id, { style: { ...selectedElements[0].style, borderWidth: `${e.target.value}px`, borderStyle: 'solid' } })} onBlur={() => commitToHistory()} className="w-full bg-black border border-zinc-800 rounded-xl px-2.5 py-3 text-[11px] font-mono text-zinc-400 text-center outline-none transition-all focus:border-blue-500/50" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 pointer-events-auto"><span className="text-[8px] font-mono text-zinc-600 uppercase px-1">Corner</span><input type="number" onMouseDown={(e) => e.stopPropagation()} value={parseInt(selectedElements[0].style?.borderRadius as string) || 0} onChange={(e) => updateElement(selectedElements[0].id, { style: { ...selectedElements[0].style, borderRadius: `${e.target.value}px` } })} onBlur={() => commitToHistory()} className="w-full bg-black border border-zinc-800 rounded-xl px-2.5 py-3 text-[10px] font-mono text-zinc-400 outline-none transition-all focus:border-blue-500/50" /></div>
                  <div className="space-y-1.5 pointer-events-auto"><span className="text-[8px] font-mono text-zinc-600 uppercase px-1">Padding</span><input type="number" onMouseDown={(e) => e.stopPropagation()} value={parseInt(selectedElements[0].style?.padding as string) || 0} onChange={(e) => updateElement(selectedElements[0].id, { style: { ...selectedElements[0].style, padding: `${e.target.value}px` } })} onBlur={() => commitToHistory()} className="w-full bg-black border border-zinc-800 rounded-xl px-2.5 py-3 text-[10px] font-mono text-zinc-400 outline-none transition-all focus:border-blue-500/50" /></div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest px-1">Metrics</label>
                <div className="grid grid-cols-2 gap-3 pointer-events-auto">
                  {['x', 'y', 'width', 'height'].map((prop) => {
                    const isDim = prop === 'width' || prop === 'height';
                    const isDisabled = isDim && selectedElements[0].data?.textType === 'point';
                    return (
                      <div key={prop} className={`space-y-1.5 transition-opacity ${isDisabled ? 'opacity-30' : ''}`}>
                        <span className="text-[8px] font-mono text-zinc-600 uppercase px-1">{prop.charAt(0)}</span>
                        <input type="number" onMouseDown={(e) => e.stopPropagation()} disabled={isDisabled} value={Math.round(Number((selectedElements[0] as any)[prop]))} onChange={(e) => updateElement(selectedElements[0].id, { [prop]: parseInt(e.target.value) || 0 })} onBlur={() => commitToHistory()} className="w-full bg-black border border-zinc-800 rounded px-2.5 py-2 text-[10px] font-mono text-zinc-400 outline-none transition-all focus:border-blue-500/50" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ITEM 24: Live Bus Monitor Display */}
              <div className="space-y-3 pt-8 border-t border-zinc-800/50">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Live Bus Monitor</label>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                    <span className="text-[8px] font-mono text-green-500 uppercase tracking-tighter">Connected</span>
                  </div>
                </div>
                <div className="bg-black/60 rounded-2xl border border-zinc-800/80 overflow-hidden shadow-xl">
                  <div className="p-3 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/40">
                    <span className="text-[9px] font-mono text-blue-400">mlb.game.sim</span>
                    <span className="text-[8px] font-mono text-zinc-600 uppercase">SEQ: 1.04k</span>
                  </div>
                  <div className="p-4 h-32 overflow-y-auto custom-scrollbar bg-black/30">
                    <pre className="text-[9px] font-mono text-zinc-500 leading-relaxed">
{`{
  "home": { "runs": 5 },
  "away": { "runs": 3 },
  "inning": 8,
  "half": "top",
  "outs": 2,
  "count": { "b": 2, "s": 1 }
}`}
                    </pre>
                  </div>
                  <div className="p-2.5 bg-zinc-900/60 flex items-center justify-between border-t border-zinc-800/50">
                    <div className="flex gap-2">
                       <div className="w-2 h-2 rounded-full bg-zinc-800" />
                       <div className="w-2 h-2 rounded-full bg-zinc-800" />
                    </div>
                    <span className="text-[8px] font-mono text-zinc-600 uppercase">Auto Discovery ACTIVE</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30 mt-32">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-loose text-center">Select a layer<br/>to begin editing</p>
              {/* Optional Empty State Bus Info */}
              <div className="mt-8 p-4 border border-zinc-800/50 rounded-2xl bg-black/20 w-full">
                <span className="text-[8px] font-mono text-zinc-700 uppercase block mb-2">Bus Listener State</span>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-green-500" />
                  <span className="text-[8px] font-mono text-zinc-600 uppercase">8 Active Topics</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <FollowModeOverlay 
        isActive={followActive} 
        events={followEvents} 
        onClose={() => setFollowActive(false)} 
      />

      <AssetExplorer />
      <NewFolderDialog />
    </div>
  );
};

// --- DATA ENGINE APP FEATURE (ITEM 25: DEPLOY WIRING) ---
const DataEngineAppImpl: React.FC = () => {
  const [activeProvider, setActiveProvider] = useState('Global Sports Feed');
  const [deployStatus, setDeployStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleDeploy = async () => {
    setDeployStatus('deploying');
    setErrorMessage('');
    
    try {
      const response = await fetch('/v1/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rl-org-id': 'org_demo',
          'x-rl-api-key': 'devkey_123'
        },
        body: JSON.stringify({ name: 'Magical MLB Demo' })
      });
      
      const result = await response.json();
      if (result.ok) {
        setDeployStatus('success');
        setTimeout(() => setDeployStatus('idle'), 3000);
      } else {
        throw new Error(result.error?.message || 'Deployment failed');
      }
    } catch (e: any) {
      setDeployStatus('error');
      setErrorMessage(e.message);
    }
  };

  const TreeItem = ({ icon, label, value, type = 'text' }: { icon?: string, label: string, value: string, type?: 'text' | 'number' }) => (
    <div className="flex items-center justify-between py-2.5 px-3 hover:bg-white/5 rounded-lg group cursor-pointer transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-4 h-4 flex items-center justify-center rounded-sm text-[8px] font-black ${type === 'text' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
          {type === 'text' ? 'T' : '#'}
        </div>
        <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase tracking-tight">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-[11px] font-mono ${type === 'text' ? 'text-blue-400' : 'text-yellow-400'}`}>{value}</span>
        <div className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );

  const TreeGroup = ({ title, children }: { title: string, children?: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <div className="space-y-1 mb-6">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2 text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] hover:text-zinc-400 transition-colors mb-2"
        >
          <svg className={`w-2 h-2 transition-transform ${isOpen ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          {title}
        </button>
        {isOpen && <div className="pl-2 border-l border-zinc-800/50 ml-2 space-y-0.5">{children}</div>}
      </div>
    );
  };

  return (
    <div className="flex-1 flex bg-[#050506] overflow-hidden animate-in fade-in duration-500">
      {/* LEFT SIDEBAR - DATA DICTIONARY */}
      <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/50 backdrop-blur-3xl z-40">
        <div className="p-6 space-y-6 border-b border-zinc-800 bg-zinc-900/40">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest px-1">Active Provider</label>
            <div className="relative">
              <select 
                value={activeProvider}
                onChange={(e) => setActiveProvider(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-[11px] font-bold text-blue-400 appearance-none outline-none focus:border-blue-500/50 transition-all cursor-pointer"
              >
                <option>Global Sports Feed</option>
                <option>NFL Live Data</option>
                <option>Internal CMS</option>
              </select>
              <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search data dictionary..." 
              className="w-full bg-black/40 border border-zinc-800/50 rounded-xl px-10 py-2.5 text-[10px] font-mono text-zinc-400 outline-none focus:border-blue-500/30 transition-all"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <TreeGroup title="Game > Home Team">
            <TreeItem label="Home Team Name" value="Seattle Seahawks" />
            <TreeItem label="Home Team Score" value="24" type="number" />
          </TreeGroup>
          <TreeGroup title="Game > Away Team">
            <TreeItem label="Away Team Name" value="San Francisco 49ers" />
            <TreeItem label="Away Team Score" value="21" type="number" />
          </TreeGroup>
          <TreeGroup title="Game > Status">
            <TreeItem label="Game Clock" value="02:45" />
            <TreeItem label="Current Quarter" value="4" type="number" />
          </TreeGroup>
          <TreeGroup title="Players > Top Performers">
            <TreeItem label="Leading Player" value="Geno Smith" />
            <TreeItem label="Passing Yards" value="342" type="number" />
          </TreeGroup>
        </div>

        <div className="p-4 border-t border-zinc-800 bg-black/20">
          <div className="flex items-center justify-between px-2">
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">Feed Status</span>
              <span className="text-[10px] font-black text-green-500 uppercase tracking-tighter">Connected</span>
            </div>
            <button className="p-2 text-zinc-600 hover:text-white transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA - DATA GRAPH */}
      <div className="flex-1 relative flex flex-col">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ 
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
          backgroundSize: '32px 32px' 
        }} />
        
        <div className="h-16 border-b border-zinc-800/50 flex items-center justify-end px-8 gap-4 bg-zinc-900/20 backdrop-blur-md shrink-0">
          <button className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-black uppercase rounded-xl transition-all border border-zinc-700/50">Validate Graph</button>
          
          <button 
            onClick={handleDeploy}
            disabled={deployStatus === 'deploying'}
            className={`px-5 py-2.5 text-white text-[10px] font-black uppercase rounded-xl transition-all shadow-lg flex items-center gap-2 ${
              deployStatus === 'deploying' ? 'bg-zinc-700 cursor-not-allowed' : 
              deployStatus === 'success' ? 'bg-green-600 shadow-green-500/20' : 
              deployStatus === 'error' ? 'bg-red-600 shadow-red-500/20' : 
              'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
            }`}
          >
            {deployStatus === 'deploying' && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
            {deployStatus === 'idle' && 'Deploy Endpoint'}
            {deployStatus === 'deploying' && 'Deploying...'}
            {deployStatus === 'success' && 'Deployed!'}
            {deployStatus === 'error' && 'Failed'}
          </button>
        </div>

        {deployStatus === 'error' && (
          <div className="m-8 p-4 bg-red-600/10 border border-red-500/50 rounded-2xl text-[11px] font-mono text-red-400 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {errorMessage}
          </div>
        )}

        <div className="flex-1 flex items-center justify-center p-20">
           <div className="flex flex-col items-center gap-6 opacity-20">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-[60px] opacity-20" />
                <svg className="w-24 h-24 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5"><path d="M20 7h-9m3 3H5m11 3h-9m3 3H5m11 3h-9"/></svg>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-sm font-black uppercase tracking-[0.5em] text-zinc-400">Node Pipeline Canvas</h2>
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Awaiting logic initialization...</p>
              </div>
           </div>
        </div>

        {/* MINIMAP / PREVIEW FLOATER */}
        <div className="absolute bottom-10 right-10 w-64 h-40 bg-black/80 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl group">
          <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Logic Overview</span>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
          </div>
          <div className="flex-1 bg-zinc-950/50" />
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
          <button 
            key={item}
            disabled={!isClickable}
            onClick={() => isClickable && onSwitch(value as any)}
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
       <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800">
         <span className="text-[10px] font-mono text-zinc-500">RD</span>
       </div>
    </div>
  </header>
);

// --- MASTER APP COMPONENT ---
const App = () => {
  const [view, setView] = useState<'STUDIO' | 'DATA_ENGINE'>('STUDIO');

  return (
    <div className="h-screen w-screen flex flex-col bg-[#050506] overflow-hidden">
      <NavigationHeader current={view} onSwitch={setView} />
      <main className="flex-1 flex overflow-hidden">
        {view === 'STUDIO' ? <StudioApp /> : <DataEngineAppImpl />}
      </main>
      
      {/* GLOBAL FOOTER */}
      <footer className="h-7 bg-black border-t border-zinc-900 flex items-center justify-between px-4 shrink-0 text-[8px] font-mono text-zinc-600 uppercase tracking-widest pointer-events-none">
        <div className="flex gap-4">
          <span>ENV: Production v2.0.4-stable</span>
          <span>Org: Red Bull Media House</span>
        </div>
        <span>RDLSS-6782-SYS</span>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
