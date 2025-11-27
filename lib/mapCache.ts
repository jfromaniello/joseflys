/**
 * Map Cache Module
 *
 * Caches rendered map images in IndexedDB using WebP format.
 * Used to show instant previews while OSM data loads.
 */

const DB_NAME = 'flightPlanMaps';
const DB_VERSION = 1;
const STORE_NAME = 'mapImages';
const MAX_CACHE_ENTRIES = 10;
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  blob: Blob;
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize or get the IndexedDB database
 */
function getDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    console.log('[MapCache] Reusing existing DB connection');
    return dbPromise;
  }

  console.log('[MapCache] Opening new DB connection...');
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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
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
    const entry: CacheEntry = {
      blob,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry, key);

      request.onsuccess = () => {
        resolve();
        // Cleanup old entries in background
        cleanupOldCaches().catch(() => {});
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
    console.time('[MapCache] getDB');
    const db = await getDB();
    console.timeEnd('[MapCache] getDB');

    return new Promise((resolve) => {
      console.time('[MapCache] transaction');
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        console.timeEnd('[MapCache] transaction');
        const entry = request.result as CacheEntry | undefined;
        if (entry && entry.blob) {
          // Check if cache is still valid (not too old)
          if (Date.now() - entry.timestamp < MAX_CACHE_AGE_MS) {
            const objectUrl = URL.createObjectURL(entry.blob);
            console.log('[MapCache] Loaded, size:', Math.round(entry.blob.size / 1024), 'KB');
            resolve(objectUrl);
          } else {
            resolve(null);
          }
        } else {
          console.log('[MapCache] Not found');
          resolve(null);
        }
      };

      request.onerror = () => {
        console.timeEnd('[MapCache] transaction');
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

/**
 * Clean up old cache entries
 * Keeps only the most recent MAX_CACHE_ENTRIES and removes entries older than MAX_CACHE_AGE_MS
 */
async function cleanupOldCaches(): Promise<void> {
  try {
    const db = await getDB();

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      const entries: Array<{ key: string; timestamp: number }> = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const entry = cursor.value as CacheEntry;
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
            const isOld = now - entry.timestamp > MAX_CACHE_AGE_MS;
            const isExcess = index >= MAX_CACHE_ENTRIES;
            if (isOld || isExcess) {
              toDelete.push(entry.key);
            }
          });

          // Delete them
          if (toDelete.length > 0) {
            const deleteTransaction = db.transaction(STORE_NAME, 'readwrite');
            const deleteStore = deleteTransaction.objectStore(STORE_NAME);
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
