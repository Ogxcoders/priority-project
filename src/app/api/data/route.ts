/**
 * API Route: /api/data
 * 
 * Server-side cached data endpoint.
 * Uses Redis to cache Appwrite query results, reducing cold DB round trips.
 * 
 * Query params:
 *   ?userId=xxx — fetch all data for a user
 *   ?invalidate=true — force cache invalidation
 * 
 * This is used by the client as an optional optimization layer.
 * The client can still talk to Appwrite directly for real-time needs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRedisCache, invalidateCachePattern } from '@/lib/redis-cache';
import { Client, Databases, Query } from 'appwrite';

// Server-side Appwrite client
function getServerAppwrite() {
    const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

    return new Databases(client);
}

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'priority-commander';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const invalidate = searchParams.get('invalidate') === 'true';

    if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Force invalidation if requested
    if (invalidate) {
        await invalidateCachePattern(`user:${userId}:*`);
        return NextResponse.json({ ok: true, invalidated: true });
    }

    try {
        const databases = getServerAppwrite();

        // Fetch all data with Redis caching (60s TTL)
        const [profile, projects, tasks, subtasks] = await Promise.all([
            withRedisCache(`user:${userId}:profile`, 60, async () => {
                const res = await databases.listDocuments(DB_ID, 'profiles', [
                    Query.equal('userId', userId),
                    Query.limit(1),
                ]);
                return res.documents[0] || null;
            }),
            withRedisCache(`user:${userId}:projects`, 60, async () => {
                const res = await databases.listDocuments(DB_ID, 'projects', [
                    Query.equal('userId', userId),
                    Query.orderAsc('priority'),
                    Query.limit(100),
                ]);
                return res.documents;
            }),
            withRedisCache(`user:${userId}:tasks`, 60, async () => {
                const res = await databases.listDocuments(DB_ID, 'tasks', [
                    Query.equal('userId', userId),
                    Query.limit(500),
                ]);
                return res.documents;
            }),
            withRedisCache(`user:${userId}:subtasks`, 60, async () => {
                const res = await databases.listDocuments(DB_ID, 'subtasks', [
                    Query.equal('userId', userId),
                    Query.limit(1000),
                ]);
                return res.documents;
            }),
        ]);

        return NextResponse.json(
            { profile, projects, tasks, subtasks },
            {
                headers: {
                    'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120',
                },
            }
        );
    } catch (err) {
        console.error('[API/data] Error:', err);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
