import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Asset, AssetType } from '../types/asset';

const ASSETS_COLLECTION = 'assets';

// Sample built-in assets to seed DB if empty
const BUILT_IN_ASSETS: Partial<Asset>[] = [
  { name: 'Star', type: 'icon', category: 'icons', tags: ['star', 'favorite'], fileUrl: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png' },
  { name: 'Circle', type: 'shape', category: 'shapes', tags: ['circle', 'round'], fileUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Circle_-_black_simple.svg' },
  { name: 'Abstract Gradient', type: 'background', category: 'backgrounds', tags: ['gradient', 'abstract'], fileUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=600&auto=format&fit=crop' },
  { name: 'Mountain View', type: 'image', category: 'images', tags: ['nature', 'mountain'], fileUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop' },
  { name: 'Line Shape', type: 'shape', category: 'shapes', tags: ['line', 'divider'], fileUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Line.svg/800px-Line.svg.png' },
];

export async function fetchAssets(userId?: string): Promise<Asset[]> {
  const assetsRef = collection(db, ASSETS_COLLECTION);
  
  // Try to load system assets
  const systemQuery = query(assetsRef, where('createdBy', '==', 'system'));
  const systemSnapshot = await getDocs(systemQuery);
  const assets: Asset[] = [];

  if (systemSnapshot.empty) {
    // Seed default assets
    for (const ba of BUILT_IN_ASSETS) {
      const newRef = doc(assetsRef);
      const newAsset: Asset = {
        id: newRef.id,
        name: ba.name!,
        type: ba.type!,
        category: ba.category!,
        tags: ba.tags!,
        fileUrl: ba.fileUrl!,
        createdBy: 'system',
        createdAt: Date.now()
      };
      try {
        await setDoc(newRef, newAsset);
        assets.push(newAsset);
      } catch (e) {
        console.error('Failed to seed default asset:', newAsset.name, e);
      }
    }
  } else {
    systemSnapshot.forEach(doc => assets.push(doc.data() as Asset));
  }

  // Load user assets if provided
  if (userId) {
    const userQuery = query(assetsRef, where('createdBy', '==', userId));
    const userSnapshot = await getDocs(userQuery);
    userSnapshot.forEach(doc => assets.push(doc.data() as Asset));
  }

  // Sort by created desc
  return assets.sort((a, b) => b.createdAt - a.createdAt);
}

export async function uploadAsset(
  file: File, 
  userId: string, 
  metadata: { name: string; type: AssetType; category: string; tags: string[] },
  onProgress?: (progress: number) => void
): Promise<Asset> {
  return new Promise((resolve, reject) => {
    const filename = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `assets/${userId}/${filename}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const assetsRef = collection(db, ASSETS_COLLECTION);
        const newRef = doc(assetsRef);
        
        const newAsset: Asset = {
          id: newRef.id,
          name: metadata.name,
          type: metadata.type,
          category: metadata.category,
          tags: metadata.tags,
          fileUrl: downloadURL,
          createdBy: userId,
          createdAt: Date.now()
        };
        
        await setDoc(newRef, newAsset);
        resolve(newAsset);
      }
    );
  });
}
