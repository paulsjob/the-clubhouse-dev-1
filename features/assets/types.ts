
export type AssetType = 'image' | 'audio' | 'video' | 'animation';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  mimeType: string;
  size: number;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  folderId: string | null;
  url: string; // Object URL
  thumbnailUrl?: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  permissions: {
    sharedWith: {
      id: string;
      email: string;
      role: 'read' | 'write' | 'admin';
    }[];
    isPublic?: boolean;
  };
  watch?: boolean;
}

export type ViewMode = 'grid' | 'list';
export type AssetFilter = 'all' | AssetType;
