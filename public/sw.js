/**
 * Service Worker — Priority Commander PWA
 * 
 * Strategies:
 * - Static assets: Cache-First (fonts, icons, images)
 * - Pages: Stale-While-Revalidate (serve cached, update in background)
 * - API calls: Network-First with cache fallback
 * - Offline fallback page
 */

const CACHE_VERSION = 'pc-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Static assets to precache on install
const PRECACHE_URLS = [
    '/',
    '/quests',
    '/board',
    '/map',
    '/profile',
    '/offline',
];

// Patterns for cache strategies
const STATIC_PATTERNS = [
    /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp|avif)$/,
    /fonts\.googleapis\.com/,
    /fonts\.gstatic\.com/,
];

const API_PATTERNS = [
    /login\.trendss\.net/,
    /\/api\//,
];

// ── Install: Precache static assets ──
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
            .catch(err => {
                console.warn('[SW] Precache failed:', err);
                return self.skipWaiting();
            })
    );
});

// ── Activate: Clean old caches ──
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== API_CACHE)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// ── Fetch: Route to appropriate strategy ──
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip chrome-extension and other non-http
    if (!url.protocol.startsWith('http')) return;

    // Strategy: API calls → Network-First
    if (API_PATTERNS.some(p => p.test(url.href))) {
        event.respondWith(networkFirst(request, API_CACHE));
        return;
    }

    // Strategy: Static assets → Cache-First
    if (STATIC_PATTERNS.some(p => p.test(url.pathname) || p.test(url.href))) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    // Strategy: Pages → Stale-While-Revalidate
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
        return;
    }

    // Default: Network-First
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// ── Cache-First Strategy ──
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('Offline', { status: 503 });
    }
}

// ── Network-First Strategy ──
async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// ── Stale-While-Revalidate Strategy ──
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request)
        .then(response => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => cached || new Response('Offline', { status: 503 }));

    return cached || fetchPromise;
}

// ── Background Sync: Process queued writes ──
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-writes') {
        event.waitUntil(processQueuedWrites());
    }
});

async function processQueuedWrites() {
    // Read queue from IndexedDB or postMessage to client
    const clients = await self.clients.matchAll();
    for (const client of clients) {
        client.postMessage({ type: 'PROCESS_SYNC_QUEUE' });
    }
}

// ── Push Notifications (future-ready) ──
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || 'Priority Commander', {
            body: data.body || 'You have updates!',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-72.png',
            tag: data.tag || 'default',
            data: data.url || '/',
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.openWindow(event.notification.data || '/')
    );
});

// ── Message handler for cache management ──
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data?.type === 'CLEAR_CACHES') {
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
    }
});
