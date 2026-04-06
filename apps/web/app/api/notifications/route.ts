export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db, notifications } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const offset = (page - 1) * limit;

    const conditions = [eq(notifications.userId, session.userId)];
    if (unreadOnly) {
      conditions.push(eq(notifications.read, false));
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(whereClause);

    const total = countResult?.count || 0;

    const rows = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        metadata: notifications.metadata,
        read: notifications.read,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      notifications: rows.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { ids, markAllRead } = body as { ids?: string[]; markAllRead?: boolean };

    if (!ids && !markAllRead) {
      return NextResponse.json({ error: 'Provide ids or markAllRead' }, { status: 400 });
    }

    const now = new Date();
    let updated = 0;

    if (markAllRead) {
      const result = await db
        .update(notifications)
        .set({ read: true, readAt: now })
        .where(and(eq(notifications.userId, session.userId), eq(notifications.read, false)));
      updated = result.rowCount ?? 0;
    } else if (ids && ids.length > 0) {
      // Update each id individually, verifying ownership
      for (const id of ids) {
        const result = await db
          .update(notifications)
          .set({ read: true, readAt: now })
          .where(and(eq(notifications.id, id), eq(notifications.userId, session.userId)));
        updated += result.rowCount ?? 0;
      }
    }

    return NextResponse.json({ updated });
  } catch (error) {
    console.error('Failed to update notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
