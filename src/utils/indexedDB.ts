/**
 * PlanDroid Offline IndexedDB Layer
 * Provides robust, asynchronous persistent storage across sessions, page reloads, and browser restarts.
 */

const DB_NAME = 'PlanDroidDB';
const DB_VERSION = 1;

export const STORES = {
  TASKS: 'tasks',
  HABITS: 'habits',
  CATEGORIES: 'categories',
  FOCUS_SESSIONS: 'focusSessions',
  CONFIG: 'config',
  SETTINGS: 'settings',
  DAILY_GOAL: 'dailyGoal',
  ACTIVE_TIMER: 'activeTimer',
} as const;

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase | null> | null = null;

export function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

/**
 * Initializes and returns the IndexedDB database instance
 */
export function openDB(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) {
    return Promise.resolve(null);
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Key-value store per domain
        Object.values(STORES).forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        });
      };

      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        resolve(dbInstance);
      };

      request.onerror = (err) => {
        console.warn('IndexedDB open error, continuing with localStorage fallback:', err);
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB initialization failed:', err);
      resolve(null);
    }
  });

  return dbInitPromise;
}

/**
 * Persists an item to an IndexedDB store
 */
export async function setItemInIndexedDB(storeName: string, key: string, value: any): Promise<void> {
  try {
    const db = await openDB();
    if (!db) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.warn(`Failed to write to IndexedDB store ${storeName}:`, err);
  }
}

/**
 * Retrieves an item from an IndexedDB store
 */
export async function getItemFromIndexedDB<T>(storeName: string, key: string): Promise<T | null> {
  try {
    const db = await openDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => {
          resolve((req.result as T) ?? null);
        };
        req.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

/**
 * Clears an entire store in IndexedDB
 */
export async function clearStoreInIndexedDB(storeName: string): Promise<void> {
  try {
    const db = await openDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    // safe fallback
  }
}
