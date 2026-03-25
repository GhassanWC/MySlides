export type AssetType = 'icon' | 'image' | 'shape' | 'illustration' | 'background';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  category: string;
  tags: string[];
  fileUrl: string;
  thumbnailUrl?: string; // Optional if you have a smaller version, else use fileUrl
  createdBy: string; // 'system' for built-in, or userId for user-uploaded
  createdAt: number;
}

export interface SlideElement {
  id: string;
  assetId?: string; // Link to the original asset
  type: AssetType;
  url: string; // The ready-to-render URL (e.g. image link, svg content, etc)
  x: number; // Position percentage X (0-100)
  y: number; // Position percentage Y (0-100)
  width: number; // Size percentage Width (0-100)
  height: number; // Size percentage Height (0-100)
  zIndex?: number;
}
