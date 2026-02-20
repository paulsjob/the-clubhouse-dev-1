
import React, { useState, useEffect, useRef } from 'react';
import { useAssetsStore } from '../store';

export const NewFolderDialog: React.FC = () => {
  const { isNewFolderDialogOpen, setNewFolderDialogOpen, createFolder } = useAssetsStore();
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  if (!isNewFolderDialogOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName) {
      await createFolder(trimmedName);
      setNewFolderDialogOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setNewFolderDialogOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200" onKeyDown={handleKeyDown}>
      <div 
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-[0_40px_120px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <h3 className="text-lg font-black uppercase tracking-tight text-white leading-none">New Folder</h3>
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-1.5">Create resource container</span>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-zinc-600 px-1 tracking-widest">Folder Name</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production Assets"
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-4 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setNewFolderDialogOpen(false)}
              className="flex-1 py-4 bg-zinc-800 text-zinc-400 text-[11px] font-black uppercase rounded-2xl hover:bg-zinc-700 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-4 bg-blue-600 text-white text-[11px] font-black uppercase rounded-2xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-20 disabled:grayscale"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
