
import React, { useState } from 'react';

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

// Fix: Made children optional to resolve "Property 'children' is missing" errors in JSX usage
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

export const DataEngineApp: React.FC = () => {
  const [activeProvider, setActiveProvider] = useState('Global Sports Feed');

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
          <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase rounded-xl transition-all shadow-lg shadow-blue-600/20">Deploy Endpoint</button>
        </div>

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
