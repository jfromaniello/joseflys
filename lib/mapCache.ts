/**
 * Map Cache Module
 *
 * Caches OSM data in IndexedDB for faster map rendering.
 */

const DB_NAME = 'flightPlanMaps';
const DB_VERSION = 2;
const OSM_STORE_NAME = 'osmData';
const MAX_OSM_CACHE_ENTRIES = 20;
const MAX_OSM_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

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
      // OSM data store
      if (!db.objectStoreNames.contains(OSM_STORE_NAME)) {
        db.createObjectStore(OSM_STORE_NAME);
      }
      // Clean up old mapImages store if it exists
      if (db.objectStoreNames.contains('mapImages')) {
        db.deleteObjectStore('mapImages');
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
 * Clean up old OSM cache entries
 */
async function cleanupOldOSMCaches(): Promise<void> {
  try {
    const db = await getDB();

    return new Promise((resolve) => {
      const transaction = db.transaction(OSM_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(OSM_STORE_NAME);
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
            const isOld = now - entry.timestamp > MAX_OSM_CACHE_AGE_MS;
            const isExcess = index >= MAX_OSM_CACHE_ENTRIES;
            if (isOld || isExcess) {
              toDelete.push(entry.key);
            }
          });

          // Delete them
          if (toDelete.length > 0) {
            const deleteTransaction = db.transaction(OSM_STORE_NAME, 'readwrite');
            const deleteStore = deleteTransaction.objectStore(OSM_STORE_NAME);
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
