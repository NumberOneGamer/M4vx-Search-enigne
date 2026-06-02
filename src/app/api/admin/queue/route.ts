import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/db';
import { crawlQueue } from '@/db/schema/crawlQueue';
import { newsArticles } from '@/db/schema/newsArticles';
import { images } from '@/db/schema/images';
import { videos } from '@/db/schema/videos';
import { eq, desc, and, count, isNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const WORKER_QUERIES: Record<string, { table: any; select: any; orderBy: any; where?: any }> = {
  crawler: {
    table: crawlQueue,
    select: {
      id: crawlQueue.id, url: crawlQueue.url, status: crawlQueue.status,
      depth: crawlQueue.depth, priority: crawlQueue.priority,
      attempts: crawlQueue.attempts, errorMessage: crawlQueue.errorMessage,
      createdAt: crawlQueue.createdAt,
    },
    orderBy: desc(crawlQueue.priority),
  },
  news: {
    table: newsArticles,
    select: {
      id: newsArticles.id, url: newsArticles.url, headline: newsArticles.headline,
      status: sql`'${'pending'}'`.as('status'),
      attempts: sql`0`.as('attempts'),
      errorMessage: sql`NULL`.as('errorMessage'),
      createdAt: newsArticles.createdAt,
    },
    orderBy: desc(newsArticles.createdAt),
    where: isNull(newsArticles.indexedAt),
  },
  images: {
    table: images,
    select: {
      id: images.id, url: images.url, title: images.altText,
      status: sql`'${'pending'}'`.as('status'),
      attempts: sql`0`.as('attempts'),
      errorMessage: sql`NULL`.as('errorMessage'),
      createdAt: images.createdAt,
    },
    orderBy: desc(images.createdAt),
    where: isNull(images.indexedAt),
  },
  videos: {
    table: videos,
    select: {
      id: videos.id, url: videos.url, title: videos.title,
      status: sql`'${'pending'}'`.as('status'),
      attempts: sql`0`.as('attempts'),
      errorMessage: sql`NULL`.as('errorMessage'),
      createdAt: videos.createdAt,
    },
    orderBy: desc(videos.createdAt),
    where: isNull(videos.indexedAt),
  },
};

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json({ error: 'Forbidden', message: 'Admin access required', statusCode: 403 }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const worker = searchParams.get('worker') || 'crawler';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

  const config = WORKER_QUERIES[worker];
  if (!config) {
    const totals: Record<string, number> = {};
    for (const [w, c] of Object.entries(WORKER_QUERIES)) {
      try {
        const [r] = await db.select({ count: count() }).from(c.table).where(c.where || sql`1=1`);
        totals[w] = Number(r?.count || 0);
      } catch { totals[w] = 0; }
    }
    return NextResponse.json({ totals, total: Object.values(totals).reduce((a: number, b: number) => a + b, 0) });
  }

  try {
    const whereClause = config.where || sql`1=1`;
    const items = await db
      .select(config.select)
      .from(config.table)
      .where(whereClause)
      .orderBy(config.orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [totalResult] = await db
      .select({ count: count() })
      .from(config.table)
      .where(whereClause);

    const total = Number(totalResult?.count || 0);

    return NextResponse.json({ items, total, page, pageSize, worker });
  } catch (error) {
    return NextResponse.json({ error: 'Queue Error', message: 'Failed to fetch queue', statusCode: 500 }, { status: 500 });
  }
}
