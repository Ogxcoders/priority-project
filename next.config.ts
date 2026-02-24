import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Standalone output for Docker (copies only needed files) ──
  output: 'standalone',

  // ── Redis cache handler in production ──
  cacheHandler: process.env.NODE_ENV === 'production' ? require.resolve('./cache-handler.js') : undefined,
  cacheMaxMemorySize: 0,

  // ── Security + Performance Headers ──
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
    // Service Worker — must not be cached by CDN
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
    // PWA Manifest
    {
      source: '/manifest.json',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=86400' },
        { key: 'Content-Type', value: 'application/manifest+json' },
      ],
    },
    // Static assets — long cache
    {
      source: '/icons/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ],

  // ── Allowed image domains ──
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'login.trendss.net' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },  // Google profile pics
    ],
  },

  // ── Disable x-powered-by header ──
  poweredByHeader: false,

  // ── Strict mode for better error catching ──
  reactStrictMode: true,

  // ── Experimental: optimize package imports ──
  experimental: {
    optimizePackageImports: ['appwrite', 'chart.js'],
  },
};

export default nextConfig;
