
import React from 'react';
import { useAssetsStore } from '../store';
import { Breadcrumbs, AssetCard, FolderCard } from './AssetComponents';

export const AssetLibraryPanel: React.FC<{ onSelect: (url: string) => void }> = ({ onSelect }) => {
  const { 
    assets, folders, currentFolderId, filter, initialized, viewMode, uploadingCount,
    setFilter, setCurrentFolder, uploadFiles, setExplorerOpen, deleteAsset, init, setViewMode,
    setNewFolderDialogOpen
  } = useAssetsStore();

  React.useEffect(() => { init(); }, [init]);

  if (!initialized) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-50">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-[10px] font-mono uppercase tracking-widest">Waking Library...</span>
    </div>
  );

  const normCurrentId = currentFolderId || null;

  const currentFolders = folders.filter(f => (f.parentId || null) === normCurrentId);
  const filteredAssets = assets.filter(a => 
    (a.folderId || null) === normCurrentId && (filter === 'all' || a.type === filter)
  );

  const isEmpty = filteredAssets.length === 0 && currentFolders.length === 0;
  
  const shouldShowFolders = true;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  const handleNewFolder = () => {
    setNewFolderDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/40 border-t border-zinc-800 animate-in slide-in-from-bottom duration-300 overflow-hidden">
      {/* HEADER SECTION */}
      <div className="p-4 shrink-0 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Assets</span>
          {uploadingCount > 0 && (
            <div className="flex items-center gap-2 bg-blue-600/20 px-2 py-0.5 rounded-full">
              <div className="w-2 h-2 border border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-[8px] font-black text-blue-400 uppercase">Syncing {uploadingCount}...</span>
            </div>
          )}
        </div>
        <div className="flex gap-1.5">
          <button 
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            title={viewMode === 'grid' ? 'Switch to List' : 'Switch to Grid'}
            className="p-1.5 hover:text-white text-zinc-500 transition-colors"
          >
            {viewMode === 'grid' ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            )}
          </button>
          <button onClick={() => setExplorerOpen(true)} className="p-1.5 hover:text-white text-zinc-500 transition-colors" title="Full Explorer">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
          <div className="relative overflow-hidden p-1.5 hover:text-white text-zinc-500 cursor-pointer transition-colors" title="Upload Assets">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <input type="file" multiple onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
          <button onClick={handleNewFolder} className="p-1.5 hover:text-white text-zinc-500 transition-colors" title="New Folder">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
          </button>
        </div>
      </div>

      {/* FILTERS SECTION */}
      <div className="px-4 py-3 flex gap-4 overflow-x-auto shrink-0 scrollbar-none border-b border-zinc-800 bg-black/20">
        {['all', 'image', 'audio', 'video'].map(f => (
          <button 
            key={f} 
            onClick={() => setFilter(f as any)} 
            className={`text-[9px] font-black uppercase tracking-widest whitespace-nowrap pb-1 border-b-2 transition-all ${filter === f ? 'text-blue-500 border-blue-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* CONTENT SECTION */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24">
        <Breadcrumbs folders={folders} currentId={normCurrentId} onNavigate={setCurrentFolder} />
        
        {isEmpty ? (
          <div className="py-20 flex flex-col items-center justify-center opacity-20">
             <svg className="w-10 h-10 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
             <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">No Items Found</span>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-3" : "flex flex-col gap-2"}>
            {shouldShowFolders && currentFolders.map(f => (
              <FolderCard key={f.id} folder={f} viewMode={viewMode} onClick={() => setCurrentFolder(f.id)} />
            ))}
            {filteredAssets.map(a => (
              <AssetCard key={a.id} asset={a} viewMode={viewMode} onSelect={() => onSelect(a.url)} onDelete={deleteAsset} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
