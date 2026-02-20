const { CacheHandler } = require("@neshca/cache-handler");
const createLruHandler = require("@neshca/cache-handler/local-lru").default;
const { createClient } = require("redis");
const { PHASE_PRODUCTION_BUILD } = require("next/constants");

const createCompositeHandler = require("@fortedigital/nextjs-cache-handler/composite").default;
const createRedisHandler = require("@fortedigital/nextjs-cache-handler/redis-strings").default;
const createBufferStringHandler = require("@fortedigital/nextjs-cache-handler/buffer-string-decorator").default;
const { Next15CacheHandler } = require("@fortedigital/nextjs-cache-handler");

CacheHandler.onCreation(() => {
    if (global.cacheHandlerConfig) return global.cacheHandlerConfig;
    if (global.cacheHandlerConfigPromise) return global.cacheHandlerConfigPromise;

    if (process.env.NODE_ENV === "development") {
        const lruCache = createLruHandler();
        return { handlers: [lruCache] };
    }

    global.cacheHandlerConfigPromise = (async () => {
        let redisClient = null;
        if (PHASE_PRODUCTION_BUILD !== process.env.NEXT_PHASE) {
            try {
                redisClient = createClient({
                    url: process.env.REDIS_URL || 'redis://localhost:6379',
                    password: process.env.REDIS_PASSWORD || undefined,
                });
                redisClient.on("error", () => {
                    global.cacheHandlerConfig = null;
                    global.cacheHandlerConfigPromise = null;
                });
                await redisClient.connect();
            } catch (error) {
                console.warn("Failed to create Redis client:", error);
            }
        }

        const lruCache = createLruHandler();

        if (!redisClient) {
            global.cacheHandlerConfigPromise = null;
            global.cacheHandlerConfig = { handlers: [lruCache] };
            return global.cacheHandlerConfig;
        }

        const redisCacheHandler = createRedisHandler({
            client: redisClient,
            keyPrefix: "nextjs:",
        });

        global.cacheHandlerConfigPromise = null;

        global.cacheHandlerConfig = {
            handlers: [
                createCompositeHandler({
                    handlers: [
                        lruCache,
                        createBufferStringHandler(redisCacheHandler),
                    ],
                    setStrategy: (ctx) => (ctx?.tags.includes("memory-cache") ? 0 : 1),
                }),
            ],
        };

        return global.cacheHandlerConfig;
    })();

    return global.cacheHandlerConfigPromise;
});

module.exports = Next15CacheHandler;
