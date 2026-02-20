import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Standalone output for Docker (copies only needed files) ──
  output: 'standalone',

  // ── Redis cache handler in production ──
  cacheHandler: process.env.NODE_ENV === 'production' ? require.resolve('./cache-handler.js') : undefined,
  cacheMaxMemorySize: 0,

  // ── Security Headers ──
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
};

export default nextConfig;
