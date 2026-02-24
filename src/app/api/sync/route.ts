/**
 * API Route: /api/sync
 * 
 * Handles navigator.sendBeacon writes on tab close.
 * Receives pending write IDs and logs them for recovery.
 * 
 * In production, this could trigger server-side retry logic.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, pendingIds, timestamp } = body;

        if (!userId || !pendingIds) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Log pending writes for monitoring/recovery
        console.log(`[Sync] User ${userId} has ${pendingIds.length} pending writes at ${new Date(timestamp).toISOString()}`);

        // In production, you could:
        // 1. Store in Redis for retry
        // 2. Queue in a job system
        // 3. Send to monitoring service

        return NextResponse.json({ ok: true, received: pendingIds.length });
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
