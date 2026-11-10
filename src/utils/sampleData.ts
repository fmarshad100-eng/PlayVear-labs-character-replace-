import fullFrontImg from '../assets/images/char_full_front.webp';
import sideLeftImg from '../assets/images/char_side_left.webp';
import sideRightImg from '../assets/images/char_side_right.webp';
import smileImg from '../assets/images/char_smile.webp';
import { CharacterAngleSlot, VideoAsset } from '../types';

export const SAMPLE_VIDEOS: VideoAsset[] = [];

export const SAMPLE_CHARACTER_SLOTS: CharacterAngleSlot[] = [
  {
    id: 'angle-full-front',
    type: 'front',
    label: 'Full-Body Front',
    angleDescription: 'Head-to-toe front profile view',
    url: fullFrontImg
  },
  {
    id: 'angle-side-right',
    type: 'profile',
    label: 'Close Side Right',
    angleDescription: '90° right jawline & ear side profile',
    url: sideRightImg
  },
  {
    id: 'angle-side-left',
    type: 'profile',
    label: 'Close Side Left',
    angleDescription: '90° left jawline & ear side profile',
    url: sideLeftImg
  },
  {
    id: 'angle-expression',
    type: 'expression',
    label: 'Dynamic Smile',
    angleDescription: 'Warm expressive smiling front profile',
    url: smileImg
  }
];

/**
 * Stitches multiple angle photos into a single composite character sheet canvas
 */
export async function generateCompositeCharacterSheet(images: string[]): Promise<string> {
  if (images.length === 0) return '';
  if (images.length === 1) return images[0];

  return new Promise((resolve) => {
    const loadedImages: HTMLImageElement[] = [];
    let loadedCount = 0;

    const timeout = setTimeout(() => {
      resolve(images[0]);
    }, 4000);

    images.forEach((src, idx) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        loadedImages[idx] = img;
        loadedCount++;
        if (loadedCount === images.length) {
          clearTimeout(timeout);
          const cols = images.length <= 4 ? 2 : 3;
          const rows = images.length <= 4 ? 2 : 3;
          const maxTiles = cols * rows;
          const tileSize = cols === 2 ? 512 : 384;
          const canvas = document.createElement('canvas');
          canvas.width = tileSize * cols;
          canvas.height = tileSize * rows;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(images[0]);
            return;
          }

          ctx.fillStyle = '#080c14';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          loadedImages.forEach((imgEl, i) => {
            if (i < maxTiles && imgEl) {
              const col = i % cols;
              const row = Math.floor(i / cols);
              const posX = col * tileSize;
              const posY = row * tileSize;

              const minDim = Math.min(imgEl.width, imgEl.height);
              const sx = (imgEl.width - minDim) / 2;
              const sy = (imgEl.height - minDim) / 2;
              ctx.drawImage(imgEl, sx, sy, minDim, minDim, posX, posY, tileSize, tileSize);

              ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
              ctx.lineWidth = 2;
              ctx.strokeRect(posX, posY, tileSize, tileSize);
            }
          });

          resolve(canvas.toDataURL('image/jpeg', 0.9));
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === images.length) {
          clearTimeout(timeout);
          resolve(images[0]);
        }
      };
      img.src = src;
    });
  });
}

export const CHARACTER_STORAGE_KEY = 'playvear_user_custom_slots_v1';

// In-memory cache fallback in case localStorage or IndexedDB is restricted
let memorySlotsCache: CharacterAngleSlot[] | null = null;

// IndexedDB Helper for permanent robust storage
function openSlotsDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open('playvear_character_db', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('slots')) {
          db.createObjectStore('slots', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveSlotsToIDB(slots: CharacterAngleSlot[]): Promise<void> {
  try {
    const db = await openSlotsDB();
    if (!db) return;
    const tx = db.transaction('slots', 'readwrite');
    const store = tx.objectStore('slots');
    const cleanSlots = slots.map((s) => ({
      id: s.id,
      type: s.type,
      label: s.label,
      angleDescription: s.angleDescription,
      url: s.url || null
    }));
    store.put({ key: 'custom_slots', data: cleanSlots });
  } catch (err) {
    console.warn('IDB write failed:', err);
  }
}

export async function loadSlotsFromIDB(): Promise<CharacterAngleSlot[] | null> {
  try {
    const db = await openSlotsDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('slots', 'readonly');
        const store = tx.objectStore('slots');
        const req = store.get('custom_slots');
        req.onsuccess = () => {
          const val = req.result?.data;
          if (Array.isArray(val) && val.length === 4 && val.some((s: any) => Boolean(s.url))) {
            memorySlotsCache = val as CharacterAngleSlot[];
            resolve(val);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export async function clearSlotsFromIDB(): Promise<void> {
  try {
    const db = await openSlotsDB();
    if (!db) return;
    const tx = db.transaction('slots', 'readwrite');
    const store = tx.objectStore('slots');
    store.delete('custom_slots');
  } catch (err) {
    console.warn('IDB delete failed:', err);
  }
}

/**
 * Generates a clean 16:9 JPEG thumbnail frame from an uploaded video file
 */
export async function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    let isDone = false;
    const finish = (result: string) => {
      if (!isDone) {
        isDone = true;
        clearTimeout(timer);
        URL.revokeObjectURL(objectUrl);
        resolve(result);
      }
    };

    const timer = setTimeout(() => {
      finish('');
    }, 4000);

    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      } catch {
        // seek error fallback
      }
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = video.videoWidth || 320;
        const height = video.videoHeight || 180;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const thumb = canvas.toDataURL('image/jpeg', 0.82);
          finish(thumb);
          return;
        }
      } catch (err) {
        console.warn('Thumbnail canvas extraction error:', err);
      }
      finish('');
    };

    video.onerror = () => finish('');
  });
}

/**
 * Saves a list of user-uploaded videos to IndexedDB so they stay saved across reloads
 */
export async function saveVideoGalleryToIDB(videos: VideoAsset[], selectedId: string | null): Promise<void> {
  try {
    const db = await openSlotsDB();
    if (!db) return;
    const tx = db.transaction('slots', 'readwrite');
    const store = tx.objectStore('slots');

    const storableItems = videos.map((v) => ({
      id: v.id,
      name: v.name,
      url: v.url.startsWith('blob:') ? '' : v.url,
      blob: v.file || null,
      dataUrl: v.dataUrl || null,
      startFrameUrl: v.startFrameUrl || null,
      duration: v.duration || 10,
      trimStart: v.trimStart || 0,
      trimEnd: v.trimEnd || 10,
      isSample: v.isSample || false
    }));

    store.put({
      key: 'custom_video_gallery_list',
      items: storableItems,
      selectedId: selectedId || null,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn('Failed to save video gallery to IDB:', err);
  }
}

/**
 * Loads the user-uploaded video list from IndexedDB if saved
 */
export async function loadVideoGalleryFromIDB(): Promise<{ videos: VideoAsset[]; selectedId: string | null } | null> {
  try {
    const db = await openSlotsDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('slots', 'readonly');
        const store = tx.objectStore('slots');
        const req = store.get('custom_video_gallery_list');
        req.onsuccess = () => {
          const res = req.result;
          if (res && Array.isArray(res.items) && res.items.length > 0) {
            const loaded: VideoAsset[] = res.items.map((item: any) => {
              let videoUrl = item.url;
              if (item.blob) {
                try {
                  videoUrl = URL.createObjectURL(item.blob);
                } catch {
                  videoUrl = item.url;
                }
              }
              return {
                id: item.id,
                name: item.name,
                url: videoUrl || item.url,
                dataUrl: item.dataUrl || undefined,
                startFrameUrl: item.startFrameUrl || undefined,
                duration: item.duration || 10,
                trimStart: item.trimStart || 0,
                trimEnd: item.trimEnd || 10,
                isSample: item.isSample || false,
                file: item.blob
              };
            });
            resolve({
              videos: loaded,
              selectedId: res.selectedId || loaded[0]?.id || null
            });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

/**
 * Clears the user-uploaded video list from IndexedDB
 */
export async function clearVideoGalleryFromIDB(): Promise<void> {
  try {
    const db = await openSlotsDB();
    if (!db) return;
    const tx = db.transaction('slots', 'readwrite');
    const store = tx.objectStore('slots');
    store.delete('custom_video_gallery_list');
  } catch (err) {
    console.warn('Failed to clear video gallery from IDB:', err);
  }
}

/**
 * Saves a user-uploaded video to IndexedDB so it stays saved across reloads
 */
export async function saveVideoToIDB(file: File): Promise<void> {
  try {
    const db = await openSlotsDB();
    if (!db) return;
    const tx = db.transaction('slots', 'readwrite');
    const store = tx.objectStore('slots');
    store.put({
      key: 'custom_video_file',
      blob: file,
      name: file.name,
      type: file.type,
      size: file.size,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn('Failed to save video to IndexedDB:', err);
  }
}

/**
 * Loads the user-uploaded video from IndexedDB if saved
 */
export async function loadVideoFromIDB(): Promise<VideoAsset | null> {
  try {
    const db = await openSlotsDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('slots', 'readonly');
        const store = tx.objectStore('slots');
        const req = store.get('custom_video_file');
        req.onsuccess = () => {
          const res = req.result;
          if (res && res.blob) {
            const objectUrl = URL.createObjectURL(res.blob);
            resolve({
              id: 'saved-custom-video',
              name: res.name || 'custom_video.mp4',
              url: objectUrl,
              duration: 10,
              trimStart: 0,
              trimEnd: 10,
              isSample: false,
              file: res.blob
            });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

/**
 * Clears the user-uploaded video from IndexedDB
 */
export async function clearVideoFromIDB(): Promise<void> {
  try {
    const db = await openSlotsDB();
    if (!db) return;
    const tx = db.transaction('slots', 'readwrite');
    const store = tx.objectStore('slots');
    store.delete('custom_video_file');
  } catch (err) {
    console.warn('Failed to clear video from IDB:', err);
  }
}

/**
 * Loads custom character slots saved in localStorage (or memory cache)
 */
export function loadSavedCustomSlots(): CharacterAngleSlot[] | null {
  if (memorySlotsCache && memorySlotsCache.some((s) => Boolean(s.url))) {
    return memorySlotsCache;
  }
  try {
    const raw = localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 4) {
        const hasImage = parsed.some((s) => typeof s?.url === 'string' && s.url.length > 0);
        if (hasImage) {
          memorySlotsCache = parsed as CharacterAngleSlot[];
          return memorySlotsCache;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load character slots from localStorage:', err);
  }
  return null;
}

/**
 * Saves custom character slots to localStorage, memory, and IndexedDB
 */
export function saveCustomSlots(slots: CharacterAngleSlot[]): void {
  const cleanSlots = slots.map((s) => ({
    id: s.id,
    type: s.type,
    label: s.label,
    angleDescription: s.angleDescription,
    url: s.url || null
  }));

  memorySlotsCache = cleanSlots;

  try {
    localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(cleanSlots));
  } catch (err) {
    console.warn('Failed to save character slots to localStorage:', err);
  }

  // Also asynchronously persist to IndexedDB
  saveSlotsToIDB(cleanSlots).catch(() => {});
}

/**
 * Clears saved custom character slots from localStorage, memory, and IndexedDB
 */
export function clearSavedCustomSlots(): void {
  memorySlotsCache = null;
  try {
    localStorage.removeItem(CHARACTER_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear character slots from localStorage:', err);
  }
  clearSlotsFromIDB().catch(() => {});
}

/**
 * Converts an uploaded image file from gallery into an optimized WebP/JPEG data URL
 * Guaranteed to resolve with fallback within 2 seconds.
 */
export async function fileToCompressedDataUrl(
  file: File,
  maxWidth = 640,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const rawResult = e.target?.result as string;
      if (!rawResult) {
        resolve('');
        return;
      }

      // Safety timeout in case image decoder is slow
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(rawResult);
        }
      }, 1500);

      const img = new Image();
      img.onload = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);

        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawResult);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData && webpData.startsWith('data:image/webp')) {
            resolve(webpData);
          } else {
            resolve(canvas.toDataURL('image/jpeg', quality));
          }
        } catch {
          resolve(rawResult);
        }
      };

      img.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(rawResult);
        }
      };

      img.src = rawResult;
    };

    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}
