
import React, { useState, useEffect } from 'react';
import { useAssetsStore } from '../store';
import { Breadcrumbs, AssetCard, FolderCard } from './AssetComponents';

export const AssetExplorer: React.FC = () => {
  const { 
    assets, folders, currentFolderId, viewMode, isExplorerOpen, uploadingCount, filter, initialized,
    setExplorerOpen, setCurrentFolder, setViewMode, uploadFiles, deleteAsset, updateFolderPermissions, setFilter, init,
    setNewFolderDialogOpen
  } = useAssetsStore();

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedFolderForShare, setSelectedFolderForShare] = useState<string | null>(null);

  useEffect(() => {
    if (isExplorerOpen) init();
  }, [isExplorerOpen, init]);

  if (!isExplorerOpen) return null;

  const normCurrentId = currentFolderId || null;

  const currentFolders = folders.filter(f => (f.parentId || null) === normCurrentId);
  const currentAssets = assets.filter(a => (a.folderId || null) === normCurrentId && (filter === 'all' || a.type === filter));

  const isEmpty = !initialized || (currentFolders.length === 0 && currentAssets.length === 0);
  
  const shouldShowFolders = true;

  const handleNewFolderClick = () => {
    setNewFolderDialogOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-3xl flex flex-col p-10 animate-in fade-in duration-300 select-none">
      {/* EXPLORER HEADER */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setExplorerOpen(false)} 
            className="p-3 bg-zinc-800 rounded-2xl hover:bg-zinc-700 transition-all text-zinc-400 hover:text-white group"
          >
            <svg className="w-5 h-5 group-active:scale-90 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Asset Explorer</h1>
              {uploadingCount > 0 && (
                <div className="flex items-center gap-2 bg-blue-600/20 px-3 py-1 rounded-full animate-pulse">
                  <div className="w-2.5 h-2.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Syncing {uploadingCount} Files...</span>
                </div>
              )}
            </div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">Unified Resource & Management Stage</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex gap-6 border-b border-zinc-800 pb-1">
            {['all', 'image', 'audio', 'video'].map(f => (
              <button 
                key={f} 
                onClick={() => setFilter(f as any)} 
                className={`text-[11px] font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${filter === f ? 'text-blue-500 border-blue-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex bg-black p-1 rounded-2xl border border-zinc-800">
            <button onClick={() => setViewMode('grid')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600 hover:text-zinc-400'}`}>Grid</button>
            <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600 hover:text-zinc-400'}`}>List</button>
          </div>
          <button onClick={() => setExplorerOpen(false)} className="p-3 hover:text-white text-zinc-500 transition-colors">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-10">
        {/* LEFT NAVIGATION TREE */}
        <div className="w-72 flex flex-col gap-8 shrink-0 border-r border-zinc-800 pr-10">
          <div className="space-y-3">
            <button 
              onClick={handleNewFolderClick}
              className="w-full flex items-center justify-center gap-3 py-4 bg-zinc-800 text-white text-[11px] font-black uppercase rounded-2xl hover:bg-zinc-700 transition-all border border-zinc-700 active:scale-95 shadow-lg"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
              New Folder
            </button>
            
            <div className="relative group overflow-hidden">
               <button className="w-full py-4 bg-blue-600 text-white text-[11px] font-black uppercase rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload Files
               </button>
               <input type="file" multiple onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
            <div className="space-y-2">
              <h4 className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em] px-2 mb-4">Storage Groups</h4>
              <button 
                onClick={() => setCurrentFolder(null)} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${normCurrentId === null ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'}`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                Root Library
              </button>
              {folders.filter(f => (f.parentId || null) === null).map(f => (
                <button 
                  key={f.id} 
                  onClick={() => setCurrentFolder(f.id)} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${normCurrentId === f.id ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'}`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN EXPLORER CONTENT */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-6 bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800/50">
            <Breadcrumbs folders={folders} currentId={normCurrentId} onNavigate={setCurrentFolder} />
            {normCurrentId && (
              <button 
                onClick={() => { setSelectedFolderForShare(normCurrentId); setIsShareModalOpen(true); }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-[10px] font-black uppercase text-zinc-300 hover:text-white transition-all flex items-center gap-2 border border-zinc-700"
              >
                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
                Share Settings
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-20">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center h-full opacity-20 border-2 border-dashed border-zinc-800 rounded-3xl">
                 {!initialized ? (
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                 ) : (
                    <>
                      <svg className="w-16 h-16 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <span className="text-sm font-mono uppercase tracking-[0.5em]">Storage Container Empty</span>
                    </>
                 )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {shouldShowFolders && currentFolders.map(f => (
                  <div key={f.id} className="relative group">
                    <FolderCard folder={f} onClick={() => setCurrentFolder(f.id)} />
                    <button 
                       onClick={() => { setSelectedFolderForShare(f.id); setIsShareModalOpen(true); }}
                       className="absolute top-2 right-2 p-2 bg-black/80 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-zinc-400 hover:text-white shadow-xl"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                    </button>
                  </div>
                ))}
                {currentAssets.map(a => (
                  <AssetCard key={a.id} asset={a} onSelect={() => {}} onDelete={deleteAsset} />
                ))}
              </div>
            ) : (
              <div className="bg-black/20 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-left text-[11px] font-mono border-collapse">
                  <thead className="bg-zinc-800/60 border-b border-zinc-800">
                    <tr>
                      <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-zinc-500">Resource Handle</th>
                      <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-zinc-500">Mime Class</th>
                      <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-zinc-500">Data Volume</th>
                      <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-zinc-500">Logged At</th>
                      <th className="px-6 py-5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {shouldShowFolders && currentFolders.map(f => (
                      <tr key={f.id} onClick={() => setCurrentFolder(f.id)} className="border-b border-zinc-800/40 hover:bg-blue-500/5 cursor-pointer transition-all group">
                        <td className="px-6 py-4 text-zinc-300 flex items-center gap-4">
                          <svg className="w-5 h-5 text-zinc-600 group-hover:text-blue-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                          <span className="font-black uppercase tracking-widest">{f.name}</span>
                        </td>
                        <td className="px-6 py-4 text-zinc-500 font-black">DIR_INSTANCE</td>
                        <td className="px-6 py-4 text-zinc-600">-</td>
                        <td className="px-6 py-4 text-zinc-500">{new Date(f.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={(e) => { e.stopPropagation(); deleteAsset(f.id); }} className="text-zinc-700 hover:text-red-500 transition-all p-2 font-black uppercase text-[9px] tracking-widest">Delete</button>
                        </td>
                      </tr>
                    ))}
                    {currentAssets.map(a => (
                      <tr key={a.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-all">
                        <td className="px-6 py-4 text-zinc-300 flex items-center gap-4">
                           <div className="w-8 h-8 rounded bg-zinc-900 overflow-hidden flex items-center justify-center shrink-0">
                              {a.type === 'image' ? <img src={a.url} className="w-full h-full object-cover" /> : <div className="w-1 h-1 bg-zinc-600 rounded-full" />}
                           </div>
                           <span className="truncate max-w-[200px]">{a.name}</span>
                        </td>
                        <td className="px-6 py-4 text-zinc-500 font-bold uppercase">{a.type}</td>
                        <td className="px-6 py-4 text-zinc-500 font-mono">{(a.size / 1024).toFixed(1)} KB</td>
                        <td className="px-6 py-4 text-zinc-500">{new Date(a.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => deleteAsset(a.id)} className="text-zinc-700 hover:text-red-500 transition-all p-2 font-black uppercase text-[9px] tracking-widest">Destroy</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-10 bg-black/80 backdrop-blur-md animate-in zoom-in duration-200">
           <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg p-10 shadow-[0_30px_100px_rgba(0,0,0,0.8)]">
              <h3 className="text-xl font-black uppercase tracking-tight mb-2">Workspace Propagation</h3>
              <p className="text-[11px] font-mono text-zinc-500 mb-8 uppercase tracking-widest leading-relaxed">Modify propagation vectors and visibility for this resource node.</p>
              
              <div className="space-y-6 mb-10">
                 <div className="flex flex-col gap-3">
                    <label className="text-[9px] font-black uppercase text-zinc-600 px-1 tracking-widest">Target Handle / Email</label>
                    <div className="flex gap-2">
                       <input type="text" placeholder="user@renderless.studio" className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-3.5 text-xs outline-none focus:border-blue-500 transition-all font-mono" />
                       <button className="px-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-[10px] font-black uppercase text-white transition-all">Invite</button>
                    </div>
                 </div>
                 
                 <div className="space-y-2">
                    <h4 className="text-[9px] font-black uppercase text-zinc-600 px-1 tracking-widest">Active Vectors</h4>
                    <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-zinc-800">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black">DT</div>
                          <span className="text-xs font-bold text-zinc-300">Design Team (Group)</span>
                       </div>
                       <span className="text-[9px] font-black text-blue-500 uppercase bg-blue-500/10 px-2 py-1 rounded">Read/Write</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-zinc-800">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-black text-zinc-500">PR</div>
                          <span className="text-xs font-bold text-zinc-300">Producers (Group)</span>
                       </div>
                       <span className="text-[9px] font-black text-zinc-500 uppercase bg-zinc-800 px-2 py-1 rounded">Read Only</span>
                    </div>
                 </div>
              </div>

              <div className="flex gap-4">
                 <button 
                  onClick={() => {
                    const folder = folders.find(f => f.id === selectedFolderForShare);
                    if (folder) updateFolderPermissions(folder.id, ['placeholder-shared-id']);
                    setIsShareModalOpen(false);
                  }}
                  className="flex-1 py-4 bg-blue-600 text-white text-[11px] font-black uppercase rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20"
                 >
                   Apply Permissions
                 </button>
                 <button onClick={() => setIsShareModalOpen(false)} className="flex-1 py-4 bg-zinc-800 text-white text-[11px] font-black uppercase rounded-2xl hover:bg-zinc-700 transition-all">Discard</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
