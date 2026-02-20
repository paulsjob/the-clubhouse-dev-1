
import { create } from 'zustand';
import { Asset, Folder, ViewMode, AssetFilter } from './types';
import { assetDb } from './db';

interface AssetsState {
  assets: Asset[];
  folders: Folder[];
  currentFolderId: string | null;
  viewMode: ViewMode;
  filter: AssetFilter;
  isExplorerOpen: boolean;
  isPanelOpen: boolean;
  initialized: boolean;
  uploadingCount: number;
  isNewFolderDialogOpen: boolean;

  // Actions
  init: () => Promise<void>;
  setExplorerOpen: (open: boolean) => void;
  setPanelOpen: (open: boolean) => void;
  setCurrentFolder: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setFilter: (filter: AssetFilter) => void;
  setNewFolderDialogOpen: (open: boolean) => void;
  
  // CRUD
  uploadFiles: (files: FileList) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  updateFolderPermissions: (folderId: string, permissions: Folder['permissions']) => Promise<void>;
  shareFolder: (folderId: string, email: string, role: 'read' | 'write' | 'admin') => Promise<void>;
  unshareFolder: (folderId: string, userId: string) => Promise<void>;
}

export const useAssetsStore = create<AssetsState>((set, get) => ({
  assets: [],
  folders: [],
  currentFolderId: null,
  viewMode: 'grid',
  filter: 'all',
  isExplorerOpen: false,
  isPanelOpen: false,
  initialized: false,
  uploadingCount: 0,
  isNewFolderDialogOpen: false,

  init: async () => {
    if (get().initialized) return;
    try {
      await assetDb.init();
      const [assets, folders] = await Promise.all([
        assetDb.getAllAssets(),
        assetDb.getAllFolders()
      ]);
      
      const normalizedFolders = folders.map(f => ({ 
        ...f, 
        parentId: f.parentId || null,
        permissions: f.permissions || { sharedWith: [], isPublic: false }
      }));
      const normalizedAssets = assets.map(a => ({ ...a, folderId: a.folderId || null }));

      for (const asset of normalizedAssets) {
        if (!asset.url) {
          const blob = await assetDb.getBlob(asset.id);
          if (blob) asset.url = URL.createObjectURL(blob);
        }
      }
      set({ assets: normalizedAssets, folders: normalizedFolders, initialized: true });
    } catch (err) {
      console.error("Failed to initialize Asset DB:", err);
    }
  },

  setExplorerOpen: (open) => set({ isExplorerOpen: open }),
  setPanelOpen: (open) => set({ isPanelOpen: open }),
  setCurrentFolder: (id) => set({ currentFolderId: id || null }),
  setViewMode: (viewMode) => set({ viewMode }),
  setFilter: (filter) => set({ filter }),
  setNewFolderDialogOpen: (isNewFolderDialogOpen) => set({ isNewFolderDialogOpen }),

  uploadFiles: async (files) => {
    if (!get().initialized) await get().init();
    
    set({ uploadingCount: files.length });
    const currentFolderId = get().currentFolderId;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const type: any = file.type.startsWith('image') ? 'image' : 
                     file.type.startsWith('audio') ? 'audio' :
                     file.type.startsWith('video') ? 'video' : 'animation';
      
      const asset: Asset = {
        id: Math.random().toString(36).substr(2, 9) + '-' + Date.now(),
        name: file.name,
        type,
        mimeType: file.type,
        size: file.size,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        folderId: currentFolderId,
        url: URL.createObjectURL(file)
      };

      await assetDb.saveAsset(asset, file);
      set(state => ({ 
        assets: [...state.assets, asset],
        uploadingCount: state.uploadingCount - 1
      }));
    }
  },

  createFolder: async (name) => {
    if (!get().initialized) await get().init();
    
    try {
      const parentId = get().currentFolderId || null;
      const existingFoldersInContext = get().folders.filter(f => (f.parentId || null) === parentId);
      
      let finalName = name;
      let counter = 2;
      while (existingFoldersInContext.some(f => f.name.toLowerCase() === finalName.toLowerCase())) {
        finalName = `${name} (${counter++})`;
      }

      const folder: Folder = {
        id: 'folder-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now(),
        name: finalName,
        parentId: parentId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        permissions: { sharedWith: [], isPublic: false }
      };
      
      await assetDb.saveFolder(folder);
      set(state => ({ 
        folders: [...state.folders, folder],
        filter: 'all'
      }));
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  },

  deleteAsset: async (id) => {
    const isFolder = get().folders.some(f => f.id === id);
    if (isFolder) {
      await assetDb.deleteFolder(id);
      set(state => ({ folders: state.folders.filter(f => f.id !== id) }));
    } else {
      await assetDb.deleteAsset(id);
      set(state => ({ assets: state.assets.filter(a => a.id !== id) }));
    }
  },

  updateFolderPermissions: async (folderId, permissions) => {
    const folders = get().folders.map(f => 
      f.id === folderId ? { ...f, permissions } : f
    );
    const folder = folders.find(f => f.id === folderId);
    if (folder) await assetDb.saveFolder(folder);
    set({ folders });
  },

  shareFolder: async (folderId, email, role) => {
    const folders = get().folders;
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const newSharedWith = [...(folder.permissions?.sharedWith || [])];
    const existingIndex = newSharedWith.findIndex(s => s.email === email);
    
    if (existingIndex >= 0) {
      newSharedWith[existingIndex] = { ...newSharedWith[existingIndex], role };
    } else {
      newSharedWith.push({
        id: 'user-' + Math.random().toString(36).substr(2, 5),
        email,
        role
      });
    }

    const updatedFolder = {
      ...folder,
      permissions: {
        ...folder.permissions,
        sharedWith: newSharedWith
      }
    };

    await assetDb.saveFolder(updatedFolder);
    set(state => ({
      folders: state.folders.map(f => f.id === folderId ? updatedFolder : f)
    }));
  },

  unshareFolder: async (folderId, userId) => {
    const folders = get().folders;
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const updatedFolder = {
      ...folder,
      permissions: {
        ...folder.permissions,
        sharedWith: (folder.permissions?.sharedWith || []).filter(s => s.id !== userId)
      }
    };

    await assetDb.saveFolder(updatedFolder);
    set(state => ({
      folders: state.folders.map(f => f.id === folderId ? updatedFolder : f)
    }));
  }
}));
