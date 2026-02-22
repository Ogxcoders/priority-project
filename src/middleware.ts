import { NextRequest, NextResponse } from 'next/server';

// ── Allowed origins (set via env, comma-separated) ──
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim());

// ── Simple in-memory rate limiter ──
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 100;       // max requests per window

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return false;
    }

    entry.count++;
    return entry.count > RATE_LIMIT_MAX;
}

// Clean up stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, val] of rateLimitMap) {
            if (now > val.resetTime) rateLimitMap.delete(key);
        }
    }, 300_000);
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ── 1. Rate Limiting ──
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';

    if (isRateLimited(ip)) {
        return new NextResponse('Too Many Requests', { status: 429 });
    }

    // ── 2. Block direct API access from disallowed origins ──
    const origin = request.headers.get('origin');
    if (pathname.startsWith('/api/') && origin && !ALLOWED_ORIGINS.includes(origin)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    // ── 3. Security Headers ──
    const response = NextResponse.next();

    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.headers.set(
        'Content-Security-Policy',
        [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // Next.js needs these
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self' https://login.trendss.net wss://login.trendss.net https://accounts.google.com",
            "frame-src https://accounts.google.com",
        ].join('; ')
    );

    // ── 4. CORS for API routes ──
    if (pathname.startsWith('/api/')) {
        if (origin && ALLOWED_ORIGINS.includes(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin);
        }
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (request.method === 'OPTIONS') {
            return new NextResponse(null, { status: 204, headers: response.headers });
        }
    }

    return response;
}

export const config = {
    matcher: [
        // Match all routes except static files and _next internals
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
