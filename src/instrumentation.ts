export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { registerInitialCache } = await import("@fortedigital/nextjs-cache-handler/instrumentation");
        const CacheHandler = (await import("../cache-handler.js")).default;
        await registerInitialCache(CacheHandler as any);
    }
}
