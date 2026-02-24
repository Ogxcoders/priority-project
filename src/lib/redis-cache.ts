/**
 * Redis Server-Side Cache — Production-Ready
 * 
 * Caches Appwrite query results server-side to avoid cold DB round trips.
 * Uses ioredis for connection pooling and automatic reconnection.
 * 
 * Usage in API routes:
 *   const data = await withRedisCache('user:123:projects', 60, () => fetchFromAppwrite());
 */

import Redis from 'ioredis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
    if (redis) return redis;

    const url = process.env.REDIS_URL;
    const password = process.env.REDIS_PASSWORD;

    if (!url) return null;

    try {
        redis = new Redis(url, {
            password: password || undefined,
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                if (times > 5) return null; // Stop retrying after 5 attempts
                return Math.min(times * 200, 2000);
            },
            lazyConnect: true,
            enableReadyCheck: true,
            connectTimeout: 5000,
            keyPrefix: 'pc:',
        });

        redis.on('error', (err) => {
            console.warn('[Redis] Connection error:', err.message);
        });

        redis.on('connect', () => {
            console.log('[Redis] Connected');
        });

        redis.connect().catch(() => {
            console.warn('[Redis] Initial connection failed — will retry');
        });

        return redis;
    } catch {
        console.warn('[Redis] Failed to create client');
        return null;
    }
}

/**
 * Cache-aside pattern: Check Redis first, fallback to fetcher.
 * 
 * @param key Cache key
 * @param ttlSeconds Time-to-live in seconds
 * @param fetcher Function to call on cache miss
 * @returns Cached or fresh data
 */
export async function withRedisCache<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
): Promise<T> {
    const client = getRedis();

    if (!client) {
        // Redis not available — direct fetch
        return fetcher();
    }

    try {
        // Try cache first
        const cached = await client.get(key);
        if (cached) {
            return JSON.parse(cached) as T;
        }
    } catch {
        // Cache read failed — continue to fetcher
    }

    // Cache miss — fetch fresh data
    const data = await fetcher();

    // Store in cache (non-blocking)
    try {
        client.setex(key, ttlSeconds, JSON.stringify(data)).catch(() => { /* ignore */ });
    } catch {
        // Cache write failed — not critical
    }

    return data;
}

/**
 * Invalidate a specific cache key.
 */
export async function invalidateCache(key: string): Promise<void> {
    const client = getRedis();
    if (!client) return;

    try {
        await client.del(key);
    } catch {
        // ignore
    }
}

/**
 * Invalidate all cache keys matching a pattern.
 * Example: invalidateCachePattern('user:123:*')
 */
export async function invalidateCachePattern(pattern: string): Promise<number> {
    const client = getRedis();
    if (!client) return 0;

    try {
        const keys = await client.keys(`pc:${pattern}`);
        if (keys.length === 0) return 0;
        // Remove the prefix since ioredis adds it automatically
        const cleanKeys = keys.map(k => k.replace(/^pc:/, ''));
        return await client.del(...cleanKeys);
    } catch {
        return 0;
    }
}

/**
 * Health check for Redis connection.
 */
export async function redisHealthCheck(): Promise<boolean> {
    const client = getRedis();
    if (!client) return false;

    try {
        const result = await client.ping();
        return result === 'PONG';
    } catch {
        return false;
    }
}
