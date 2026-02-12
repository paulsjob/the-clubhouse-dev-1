
import React from 'react';
import { Asset, Folder } from '../types';

export const Breadcrumbs: React.FC<{
  folders: Folder[];
  currentId: string | null;
  onNavigate: (id: string | null) => void;
}> = ({ folders, currentId, onNavigate }) => {
  const getPath = (id: string | null): Folder[] => {
    if (!id) return [];
    const folder = folders.find(f => f.id === id);
    if (!folder) return [];
    return [...getPath(folder.parentId), folder];
  };

  const path = getPath(currentId);
  const parentId = currentId ? (folders.find(f => f.id === currentId)?.parentId ?? null) : null;

  return (
    <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500 mb-4 select-none">
      <button 
        disabled={currentId === null}
        onClick={() => onNavigate(parentId)}
        className="p-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 disabled:opacity-20 disabled:hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
      </button>

      <div className="flex items-center gap-2 overflow-hidden">
        <button onClick={() => onNavigate(null)} className={`hover:text-white transition-colors ${currentId === null ? 'text-blue-500 font-black' : ''}`}>ROOT</button>
        {path.map(f => (
          <React.Fragment key={f.id}>
            <span className="opacity-30">/</span>
            <button 
              onClick={() => onNavigate(f.id)} 
              className={`hover:text-white transition-colors max-w-[100px] truncate ${f.id === currentId ? 'text-blue-500 font-black' : ''}`}
            >
              {f.name.toUpperCase()}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export const AssetCard: React.FC<{
  asset: Asset;
  onSelect: (asset: Asset) => void;
  onDelete: (id: string) => void;
  viewMode?: 'grid' | 'list';
}> = ({ asset, onSelect, onDelete, viewMode = 'grid' }) => {
  if (viewMode === 'list') {
    return (
      <div 
        onClick={() => onSelect(asset)}
        className="group flex items-center gap-4 p-2 bg-black/20 border border-zinc-800/50 rounded-xl hover:border-blue-500/50 hover:bg-black/40 cursor-pointer transition-all"
      >
        <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
          {asset.type === 'image' ? (
            <img src={asset.url} className="w-full h-full object-cover" />
          ) : (
            <div className="text-zinc-600 scale-75">
               {asset.type === 'audio' && <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
               {asset.type === 'video' && <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-zinc-300 truncate uppercase">{asset.name}</p>
          <p className="text-[8px] font-mono text-zinc-600 uppercase">{(asset.size / 1024).toFixed(1)}KB • {asset.type}</p>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }}
          className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-500 transition-all"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
        </button>
      </div>
    );
  }

  return (
    <div className="group relative bg-black/40 border border-zinc-800 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all">
      <div 
        onClick={() => onSelect(asset)}
        className="aspect-square bg-zinc-900 flex items-center justify-center cursor-pointer"
      >
        {asset.type === 'image' ? (
          <img src={asset.url} className="w-full h-full object-cover" />
        ) : (
          <div className="text-zinc-600">
             {asset.type === 'audio' && <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
             {asset.type === 'video' && <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>}
          </div>
        )}
      </div>
      <div className="p-2 flex items-center justify-between">
        <span className="text-[10px] font-mono text-zinc-400 truncate flex-1 pr-2">{asset.name}</span>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }}
          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-500 transition-all"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  );
};

export const FolderCard: React.FC<{
  folder: Folder;
  onClick: () => void;
  viewMode?: 'grid' | 'list';
}> = ({ folder, onClick, viewMode = 'grid' }) => {
  if (viewMode === 'list') {
    return (
      <div 
        onClick={onClick}
        className="group flex items-center gap-4 p-2.5 bg-zinc-800/20 border border-zinc-800 rounded-xl hover:border-zinc-500 hover:bg-zinc-800 transition-all cursor-pointer"
      >
        <svg className="w-5 h-5 text-zinc-600 group-hover:text-blue-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-200">
          {folder.name}
        </span>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className="flex flex-col items-center justify-center aspect-square bg-zinc-800/40 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-500 hover:bg-zinc-800 transition-all group"
    >
      <svg className="w-10 h-10 text-zinc-600 group-hover:text-blue-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-2 text-center px-2 truncate w-full group-hover:text-zinc-300">
        {folder.name}
      </span>
    </div>
  );
};
