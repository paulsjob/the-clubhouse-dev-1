
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
  permissions?: {
    entries: string[]; // Placeholder for user/group IDs
  };
  watch?: boolean; // Placeholder flag
}

export type ViewMode = 'grid' | 'list';
export type AssetFilter = 'all' | AssetType;
