
import { Asset, Folder } from './types';

const DB_NAME = 'RenderlessAssets';
const VERSION = 1;
const STORES = {
  ASSETS: 'assets',
  FOLDERS: 'folders',
  BLOBS: 'blobs' // For actual file data
};

export class AssetDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, VERSION);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORES.ASSETS)) db.createObjectStore(STORES.ASSETS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.FOLDERS)) db.createObjectStore(STORES.FOLDERS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.BLOBS)) db.createObjectStore(STORES.BLOBS);
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private getStore(name: string, mode: IDBTransactionMode = 'readonly') {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.transaction(name, mode).objectStore(name);
  }

  async getAllAssets(): Promise<Asset[]> {
    return new Promise((resolve) => {
      const request = this.getStore(STORES.ASSETS).getAll();
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAllFolders(): Promise<Folder[]> {
    return new Promise((resolve) => {
      const request = this.getStore(STORES.FOLDERS).getAll();
      request.onsuccess = () => resolve(request.result);
    });
  }

  async saveAsset(asset: Asset, blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const assetStore = this.getStore(STORES.ASSETS, 'readwrite');
      const blobStore = this.getStore(STORES.BLOBS, 'readwrite');
      const req1 = assetStore.put(asset);
      const req2 = blobStore.put(blob, asset.id);
      
      let count = 0;
      const check = () => { if(++count === 2) resolve(); };
      req1.onsuccess = check;
      req2.onsuccess = check;
      req1.onerror = () => reject(req1.error);
      req2.onerror = () => reject(req2.error);
    });
  }

  async saveFolder(folder: Folder): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.getStore(STORES.FOLDERS, 'readwrite').put(folder);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteAsset(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.ASSETS, STORES.BLOBS], 'readwrite');
      tx.objectStore(STORES.ASSETS).delete(id);
      tx.objectStore(STORES.BLOBS).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteFolder(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.getStore(STORES.FOLDERS, 'readwrite').delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getBlob(id: string): Promise<Blob> {
    return new Promise((resolve) => {
      const request = this.getStore(STORES.BLOBS).get(id);
      request.onsuccess = () => resolve(request.result);
    });
  }
}

export const assetDb = new AssetDB();
