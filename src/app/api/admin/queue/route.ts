import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/db';
import { crawlQueue } from '@/db/schema/crawlQueue';
import { eq, desc, and, count } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin access required', statusCode: 403 },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

  try {
    const conditions = [];
    if (status && ['pending', 'running', 'completed', 'failed'].includes(status)) {
      conditions.push(eq(crawlQueue.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db
      .select()
      .from(crawlQueue)
      .where(whereClause)
      .orderBy(desc(crawlQueue.priority), desc(crawlQueue.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(crawlQueue)
      .where(whereClause);

    const total = Number(totalResult[0]?.count || 0);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Queue Error', message: 'Failed to fetch queue', statusCode: 500 },
      { status: 500 }
    );
  }
}
