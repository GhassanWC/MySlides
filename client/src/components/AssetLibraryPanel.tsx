import { useState, useEffect, useRef } from 'react';
import { Asset, AssetType } from '../types/asset';
import { fetchAssets, uploadAsset } from '../lib/assetService';
import { useAuth } from '../contexts/AuthContext';

interface AssetLibraryPanelProps {
  onInsertAsset: (asset: Asset) => void;
}

export function AssetLibraryPanel({ onInsertAsset }: AssetLibraryPanelProps) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'all' | 'icons' | 'images' | 'shapes' | 'uploads'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetchAssets(user.id).then(fetched => {
      setAssets(fetched);
    }).finally(() => setLoading(false));
  }, [user?.id]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    
    let type: AssetType = 'image';
    let category = 'images';
    if (file.type.includes('svg')) { type = 'icon'; category = 'icons'; }

    setUploading(true);
    setProgress(0);
    try {
      const newAsset = await uploadAsset(file, user.id, {
        name: file.name.split('.')[0],
        type,
        category,
        tags: [category, 'upload']
      }, (p) => setProgress(p));
      
      setAssets(prev => [newAsset, ...prev]);
    } catch (err) {
      console.error('Upload Error:', err);
      alert('Upload failed: ' + (err instanceof Error ? err.message : typeof err === 'object' && err !== null && 'message' in err ? String((err as any).message) : JSON.stringify(err)));
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredAssets = assets.filter(a => {
    if (activeTab === 'icons' && a.category !== 'icons') return false;
    if (activeTab === 'images' && a.category !== 'images') return false;
    if (activeTab === 'shapes' && a.category !== 'shapes') return false;
    if (activeTab === 'uploads' && a.createdBy !== user?.id) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.name.toLowerCase().includes(q) && !a.tags.some(t => t.toLowerCase().includes(q))) {
        return false;
      }
    }
    return true;
  });

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'icons', label: 'Icons' },
    { id: 'images', label: 'Images' },
    { id: 'shapes', label: 'Shapes' },
    { id: 'uploads', label: 'My Uploads' },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-white font-sans">
      <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4 shrink-0 bg-gray-50/50">
        <div className="flex items-center gap-2 text-[#1A1A1A] font-semibold">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#6C63FF]">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          Asset Library
        </div>
      </div>

      <div className="p-4 border-b border-gray-100 bg-white shrink-0 space-y-4">
        {/* Search Bar */}
        <div className="relative bg-[#F4F4F5] rounded-[12px] border border-transparent focus-within:border-gray-300 focus-within:bg-white transition-colors duration-200 flex items-center overflow-hidden">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 text-gray-400">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="w-full bg-transparent border-0 text-[13px] py-2.5 pl-9 pr-4 focus:ring-0 focus:outline-none placeholder:text-gray-500 text-[#1A1A1A]"
          />
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-[10px] overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-max text-[11px] py-1.5 px-3 rounded-md font-medium transition whitespace-nowrap ${activeTab === tab.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 relative">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center text-gray-500 mt-8 space-y-2">
            <p className="font-semibold text-gray-800 text-sm">No assets found</p>
            <p className="text-xs">Try a different search or upload one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredAssets.map(asset => (
              <div 
                key={asset.id} 
                onClick={() => onInsertAsset(asset)}
                className="group relative aspect-square bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex items-center justify-center p-2"
              >
                <img 
                  src={asset.thumbnailUrl || asset.fileUrl} 
                  alt={asset.name} 
                  className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] text-white font-medium truncate text-center">{asset.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div className="p-4 border-t border-gray-100 bg-white shrink-0">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/png, image/jpeg, image/svg+xml, image/webp" 
        />
        <button
          onClick={handleUploadClick}
          disabled={uploading}
          className="w-full py-2.5 bg-white border-2 border-dashed border-gray-300 hover:border-[#6C63FF] hover:bg-indigo-50/50 rounded-xl text-sm text-gray-600 font-medium transition-colors flex items-center justify-center gap-2 relative overflow-hidden"
        >
          {uploading ? (
            <>
              <div className="absolute left-0 top-0 bottom-0 bg-indigo-100 transition-all duration-300" style={{ width: `${progress}%` }} />
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 relative z-10" />
              <span className="relative z-10 text-indigo-700">Uploading {Math.round(progress)}%</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              Upload Asset
            </>
          )}
        </button>
      </div>
    </div>
  );
}
