/**
 * Map Cache Module
 *
 * Caches rendered map images and OSM data in IndexedDB.
 * - Map images: WebP format for instant previews
 * - OSM data: JSON for faster map rendering
 */

const DB_NAME = 'flightPlanMaps';
const DB_VERSION = 2; // Incremented to add osmData store
const MAP_STORE_NAME = 'mapImages';
const OSM_STORE_NAME = 'osmData';
const MAX_MAP_CACHE_ENTRIES = 10;
const MAX_OSM_CACHE_ENTRIES = 20;
const MAX_MAP_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_OSM_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface MapCacheEntry {
  blob: Blob;
  timestamp: number;
}

interface OSMCacheEntry {
  data: unknown;
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize or get the IndexedDB database
 */
function getDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // Map images store
      if (!db.objectStoreNames.contains(MAP_STORE_NAME)) {
        db.createObjectStore(MAP_STORE_NAME);
      }
      // OSM data store
      if (!db.objectStoreNames.contains(OSM_STORE_NAME)) {
        db.createObjectStore(OSM_STORE_NAME);
      }
    };
  });

  return dbPromise;
}

/**
 * Pre-initialize the database connection
 * Call this early to avoid delay when loading cache
 */
export function initMapCache(): void {
  if (typeof window !== 'undefined') {
    getDB().catch(() => {});
  }
}

/**
 * Generate a cache key from content hash and map parameters
 */
export function generateMapCacheKey(
  contentHash: string,
  mapMode: 'utm' | 'mercator',
  printScale: number,
  tickIntervalNM: number,
  timeTickIntervalMin: number
): string {
  return `${contentHash}_${mapMode}_${printScale}_${tickIntervalNM}_${timeTickIntervalMin}`;
}

/**
 * Save a map image to IndexedDB cache
 */
export async function saveMapToCache(key: string, blob: Blob): Promise<void> {
  try {
    const db = await getDB();
    const entry: MapCacheEntry = {
      blob,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MAP_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(MAP_STORE_NAME);
      const request = store.put(entry, key);

      request.onsuccess = () => {
        resolve();
        // Cleanup old entries in background
        cleanupOldMapCaches().catch(() => {});
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch {
    // Ignore save errors
  }
}

/**
 * Load a map image from IndexedDB cache
 * Returns an object URL that must be revoked when no longer needed
 */
export async function loadMapFromCache(key: string): Promise<string | null> {
  try {
    const db = await getDB();

    return new Promise((resolve) => {
      const transaction = db.transaction(MAP_STORE_NAME, 'readonly');
      const store = transaction.objectStore(MAP_STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as MapCacheEntry | undefined;
        if (entry && entry.blob) {
          // Check if cache is still valid (not too old)
          if (Date.now() - entry.timestamp < MAX_MAP_CACHE_AGE_MS) {
            const objectUrl = URL.createObjectURL(entry.blob);
            resolve(objectUrl);
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

/**
 * Clean up old map cache entries
 */
async function cleanupOldMapCaches(): Promise<void> {
  await cleanupStore(MAP_STORE_NAME, MAX_MAP_CACHE_ENTRIES, MAX_MAP_CACHE_AGE_MS);
}

/**
 * Clean up old OSM cache entries
 */
async function cleanupOldOSMCaches(): Promise<void> {
  await cleanupStore(OSM_STORE_NAME, MAX_OSM_CACHE_ENTRIES, MAX_OSM_CACHE_AGE_MS);
}

/**
 * Generic cleanup function for any store
 */
async function cleanupStore(
  storeName: string,
  maxEntries: number,
  maxAgeMs: number
): Promise<void> {
  try {
    const db = await getDB();

    return new Promise((resolve) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();

      const entries: Array<{ key: string; timestamp: number }> = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const entry = cursor.value as { timestamp: number };
          entries.push({ key: cursor.key as string, timestamp: entry.timestamp });
          cursor.continue();
        } else {
          // All entries collected, now clean up
          const now = Date.now();

          // Sort by timestamp (newest first)
          entries.sort((a, b) => b.timestamp - a.timestamp);

          // Find entries to delete (old or excess)
          const toDelete: string[] = [];
          entries.forEach((entry, index) => {
            const isOld = now - entry.timestamp > maxAgeMs;
            const isExcess = index >= maxEntries;
            if (isOld || isExcess) {
              toDelete.push(entry.key);
            }
          });

          // Delete them
          if (toDelete.length > 0) {
            const deleteTransaction = db.transaction(storeName, 'readwrite');
            const deleteStore = deleteTransaction.objectStore(storeName);
            toDelete.forEach((key) => {
              deleteStore.delete(key);
            });
          }

          resolve();
        }
      };

      request.onerror = () => {
        resolve();
      };
    });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Revoke an object URL to free memory
 * Call this when the cached image is no longer needed
 */
export function revokeMapCacheUrl(objectUrl: string): void {
  URL.revokeObjectURL(objectUrl);
}

// =============================================================================
// OSM Data Cache Functions
// =============================================================================

/**
 * Save OSM data to IndexedDB cache
 */
export async function saveOSMDataToCache(key: string, data: unknown): Promise<void> {
  try {
    const db = await getDB();
    const entry: OSMCacheEntry = {
      data,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OSM_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(OSM_STORE_NAME);
      const request = store.put(entry, key);

      request.onsuccess = () => {
        resolve();
        // Cleanup old entries in background
        cleanupOldOSMCaches().catch(() => {});
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch {
    // Ignore save errors
  }
}

/**
 * Load OSM data from IndexedDB cache
 */
export async function loadOSMDataFromCache(key: string): Promise<unknown | null> {
  try {
    const db = await getDB();

    return new Promise((resolve) => {
      const transaction = db.transaction(OSM_STORE_NAME, 'readonly');
      const store = transaction.objectStore(OSM_STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as OSMCacheEntry | undefined;
        if (entry && entry.data) {
          // Check if cache is still valid (not too old)
          if (Date.now() - entry.timestamp < MAX_OSM_CACHE_AGE_MS) {
            resolve(entry.data);
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}
