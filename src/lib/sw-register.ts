/**
 * Service Worker Registration — Production-Ready
 * 
 * Handles:
 * - SW registration with update detection
 * - Auto-update on new version
 * - Message passing to SW
 */

export function registerServiceWorker(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Register after page load to not block initial render
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
            });

            // Check for updates periodically (every 60 minutes)
            setInterval(() => {
                registration.update().catch(() => { /* ignore */ });
            }, 60 * 60 * 1000);

            // Handle updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available — auto-activate
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                });
            });

            // Reload on controller change (new SW activated)
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });

            // Listen for messages from SW
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data?.type === 'PROCESS_SYNC_QUEUE') {
                    // Import dynamically to avoid circular deps
                    import('./background-sync').then(({ processQueue }) => {
                        processQueue().catch(console.error);
                    });
                }
            });

        } catch (err) {
            console.warn('[SW] Registration failed:', err);
        }
    });
}

/**
 * Request background sync (if supported).
 */
export function requestBackgroundSync(tag: string = 'sync-writes'): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then(registration => {
        if ('sync' in registration) {
            (registration as any).sync.register(tag).catch(() => { /* ignore */ });
        }
    });
}

/**
 * Clear all SW caches.
 */
export function clearServiceWorkerCaches(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_CACHES' });
}
