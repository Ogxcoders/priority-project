/**
 * IndexedDB Cache Layer — Production-Ready
 * 
 * Replaces localStorage with async IndexedDB for:
 * - 50–500MB storage (vs 5MB localStorage)
 * - Non-blocking async I/O (doesn't block main thread)
 * - Survives quota errors gracefully
 * - Supports cache versioning for schema migrations
 * - TTL-based expiration
 */

const DB_NAME = 'priority-commander-cache';
const DB_VERSION = 1;
const STORE_NAME = 'cache';
const CACHE_SCHEMA_VERSION = 1; // Bump this when data shape changes

interface CacheEntry<T = unknown> {
    key: string;
    value: T;
    timestamp: number;
    schemaVersion: number;
    ttl: number; // milliseconds, 0 = no expiry
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB not available'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('schemaVersion', 'schemaVersion', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            dbPromise = null;
            reject(request.error);
        };
    });

    return dbPromise;
}

/**
 * Get a value from the cache.
 * Returns null if not found, expired, or schema version mismatch.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
    try {
        const db = await openDB();
        return new Promise<T | null>((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => {
                const entry = request.result as CacheEntry<T> | undefined;
                if (!entry) {
                    resolve(null);
                    return;
                }

                // Schema version mismatch — stale data
                if (entry.schemaVersion !== CACHE_SCHEMA_VERSION) {
                    // Clean up stale entry in background
                    cacheDelete(key).catch(() => { /* ignore */ });
                    resolve(null);
                    return;
                }

                // TTL check
                if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl) {
                    cacheDelete(key).catch(() => { /* ignore */ });
                    resolve(null);
                    return;
                }

                resolve(entry.value);
            };

            request.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

/**
 * Set a value in the cache.
 * @param ttl Time-to-live in milliseconds. 0 = no expiry. Default: 24 hours.
 */
export async function cacheSet<T>(key: string, value: T, ttl: number = 86400000): Promise<void> {
    try {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            const entry: CacheEntry<T> = {
                key,
                value,
                timestamp: Date.now(),
                schemaVersion: CACHE_SCHEMA_VERSION,
                ttl,
            };

            const request = store.put(entry);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch {
        // Quota exceeded or other error — silently fail
    }
}

/**
 * Delete a specific key from the cache.
 */
export async function cacheDelete(key: string): Promise<void> {
    try {
        const db = await openDB();
        return new Promise<void>((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
        });
    } catch {
        // ignore
    }
}

/**
 * Clear all cache entries.
 */
export async function cacheClear(): Promise<void> {
    try {
        const db = await openDB();
        return new Promise<void>((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
        });
    } catch {
        // ignore
    }
}

/**
 * Get multiple keys at once (batch read).
 */
export async function cacheGetMulti<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    try {
        const db = await openDB();
        return new Promise<Map<string, T>>((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            let completed = 0;

            for (const key of keys) {
                const request = store.get(key);
                request.onsuccess = () => {
                    const entry = request.result as CacheEntry<T> | undefined;
                    if (entry && entry.schemaVersion === CACHE_SCHEMA_VERSION) {
                        if (entry.ttl === 0 || Date.now() - entry.timestamp <= entry.ttl) {
                            results.set(key, entry.value);
                        }
                    }
                    completed++;
                    if (completed === keys.length) resolve(results);
                };
                request.onerror = () => {
                    completed++;
                    if (completed === keys.length) resolve(results);
                };
            }

            if (keys.length === 0) resolve(results);
        });
    } catch {
        return results;
    }
}

/**
 * Set multiple keys at once (batch write).
 */
export async function cacheSetMulti<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    try {
        const db = await openDB();
        return new Promise<void>((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            for (const { key, value, ttl = 86400000 } of entries) {
                store.put({
                    key,
                    value,
                    timestamp: Date.now(),
                    schemaVersion: CACHE_SCHEMA_VERSION,
                    ttl,
                } as CacheEntry<T>);
            }

            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    } catch {
        // ignore
    }
}

/**
 * Prune expired entries (call periodically).
 */
export async function cachePrune(): Promise<number> {
    let pruned = 0;
    try {
        const db = await openDB();
        return new Promise<number>((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.openCursor();

            request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor) {
                    resolve(pruned);
                    return;
                }

                const entry = cursor.value as CacheEntry;

                // Remove stale schema versions
                if (entry.schemaVersion !== CACHE_SCHEMA_VERSION) {
                    cursor.delete();
                    pruned++;
                }
                // Remove expired entries
                else if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl) {
                    cursor.delete();
                    pruned++;
                }

                cursor.continue();
            };

            request.onerror = () => resolve(pruned);
        });
    } catch {
        return pruned;
    }
}

/**
 * Migrate from localStorage to IndexedDB (one-time).
 * Call this on app startup to seamlessly transition.
 */
export async function migrateFromLocalStorage(userId: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;

    const migrationKey = `idb_migrated_${userId}`;
    if (localStorage.getItem(migrationKey)) return;

    try {
        const keys = [
            { ls: `cache_profile_${userId}`, idb: `profile_${userId}` },
            { ls: `cache_proj_${userId}`, idb: `projects_${userId}` },
            { ls: `cache_tasks_${userId}`, idb: `tasks_${userId}` },
            { ls: `cache_sub_${userId}`, idb: `subtasks_${userId}` },
        ];

        const entries: Array<{ key: string; value: unknown; ttl: number }> = [];

        for (const { ls, idb } of keys) {
            const raw = localStorage.getItem(ls);
            if (raw) {
                try {
                    entries.push({ key: idb, value: JSON.parse(raw), ttl: 86400000 });
                } catch { /* corrupt data */ }
            }
        }

        if (entries.length > 0) {
            await cacheSetMulti(entries);
        }

        // Mark migration complete
        localStorage.setItem(migrationKey, '1');

        // Clean up old localStorage keys
        for (const { ls } of keys) {
            localStorage.removeItem(ls);
        }
    } catch {
        // Migration failed — not critical, fresh data will be fetched
    }
}
