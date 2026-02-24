/**
 * Background Sync — Production-Ready
 * 
 * Handles:
 * - navigator.sendBeacon for tab-close writes
 * - Offline queue with retry logic
 * - Debounced field saves
 */

interface PendingWrite {
    id: string;
    url: string;
    method: 'POST' | 'PUT' | 'DELETE';
    body: Record<string, unknown>;
    timestamp: number;
    retries: number;
}

const QUEUE_KEY = 'pc_sync_queue';
const MAX_RETRIES = 3;

/**
 * Get the offline write queue from localStorage (small, fast access needed).
 */
function getQueue(): PendingWrite[] {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Save the queue back to localStorage.
 */
function saveQueue(queue: PendingWrite[]): void {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch { /* ignore */ }
}

/**
 * Add a write to the offline queue.
 */
export function queueWrite(url: string, method: 'POST' | 'PUT' | 'DELETE', body: Record<string, unknown>): void {
    const queue = getQueue();
    queue.push({
        id: Math.random().toString(36).substring(2, 10),
        url,
        method,
        body,
        timestamp: Date.now(),
        retries: 0,
    });
    saveQueue(queue);
}

/**
 * Process the offline queue — call when back online.
 */
export async function processQueue(): Promise<number> {
    const queue = getQueue();
    if (queue.length === 0) return 0;

    let processed = 0;
    const remaining: PendingWrite[] = [];

    for (const item of queue) {
        try {
            const response = await fetch(item.url, {
                method: item.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.body),
            });

            if (response.ok) {
                processed++;
            } else if (item.retries < MAX_RETRIES) {
                remaining.push({ ...item, retries: item.retries + 1 });
            }
            // Drop items that exceeded max retries
        } catch {
            if (item.retries < MAX_RETRIES) {
                remaining.push({ ...item, retries: item.retries + 1 });
            }
        }
    }

    saveQueue(remaining);
    return processed;
}

/**
 * Send a beacon on tab close — fire-and-forget.
 * Use for critical writes that must survive navigation.
 */
export function sendBeacon(url: string, data: Record<string, unknown>): boolean {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return false;

    try {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        return navigator.sendBeacon(url, blob);
    } catch {
        return false;
    }
}

/**
 * Register online/offline listeners for automatic queue processing.
 */
export function registerSyncListeners(): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleOnline = () => {
        processQueue().then(count => {
            if (count > 0) {
                console.log(`[BackgroundSync] Processed ${count} queued writes`);
            }
        });
    };

    window.addEventListener('online', handleOnline);

    // Also try processing on load if online
    if (navigator.onLine) {
        setTimeout(handleOnline, 2000);
    }

    return () => {
        window.removeEventListener('online', handleOnline);
    };
}

/**
 * Create a debounced save function for text fields.
 * Returns a function that debounces calls by `delay` ms.
 */
export function createDebouncedSave(
    saveFn: (id: string, field: string, value: unknown) => Promise<void>,
    delay: number = 400
): (id: string, field: string, value: unknown) => void {
    const timers = new Map<string, NodeJS.Timeout>();

    return (id: string, field: string, value: unknown) => {
        const key = `${id}:${field}`;
        const existing = timers.get(key);
        if (existing) clearTimeout(existing);

        timers.set(key, setTimeout(() => {
            timers.delete(key);
            saveFn(id, field, value).catch(console.error);
        }, delay));
    };
}

/**
 * Register beforeunload handler to beacon pending writes.
 */
export function registerBeaconOnUnload(getBeaconUrl: () => string, getPendingData: () => Record<string, unknown> | null): () => void {
    if (typeof window === 'undefined') return () => {};

    const handler = () => {
        const data = getPendingData();
        if (data) {
            sendBeacon(getBeaconUrl(), data);
        }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
}
