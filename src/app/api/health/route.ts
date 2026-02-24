/**
 * API Route: /api/health
 * 
 * Health check endpoint for monitoring.
 * Checks Redis connectivity and returns system status.
 */

import { NextResponse } from 'next/server';
import { redisHealthCheck } from '@/lib/redis-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    const redisOk = await redisHealthCheck();

    const status = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        redis: redisOk ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '0.1.0',
    };

    return NextResponse.json(status, {
        status: redisOk ? 200 : 503,
        headers: {
            'Cache-Control': 'no-store',
        },
    });
}
