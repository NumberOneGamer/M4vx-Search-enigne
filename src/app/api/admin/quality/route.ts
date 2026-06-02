import { NextResponse } from 'next/server';
import { db } from '@/db';
import { searchLogs } from '@/db/schema/searchLogs';
import { clicks } from '@/db/schema/clicks';
import { pages } from '@/db/schema/pages';
import { newsArticles } from '@/db/schema/newsArticles';
import { videos } from '@/db/schema/videos';
import { images } from '@/db/schema/images';
import { eq, desc, count, gte, sql, and, isNull, avg } from 'drizzle-orm';
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache';

export async function GET() {
  try {
    const cacheKey = 'admin:quality:stats';
    const cached = await cacheGet(cacheKey);
    if (cached) return NextResponse.json(cached);

    const last24h = new Date(Date.now() - 86400000);
    const last7d = new Date(Date.now() - 7 * 86400000);

    const [totalSearches, searches24h, searches7d, pageCount, newsCount, videoCount, imageCount] = await Promise.all([
      db.select({ count: count() }).from(searchLogs).then(r => r[0]?.count ?? 0),
      db.select({ count: count() }).from(searchLogs).where(gte(searchLogs.createdAt, last24h)).then(r => r[0]?.count ?? 0),
      db.select({ count: count() }).from(searchLogs).where(gte(searchLogs.createdAt, last7d)).then(r => r[0]?.count ?? 0),
      db.select({ count: count() }).from(pages).then(r => Number(r[0]?.count || 0)),
      db.select({ count: count() }).from(newsArticles).then(r => Number(r[0]?.count || 0)),
      db.select({ count: count() }).from(videos).then(r => Number(r[0]?.count || 0)),
      db.select({ count: count() }).from(images).then(r => Number(r[0]?.count || 0)),
    ]);

    const [zeroResultSearches] = await db
      .select({ count: count() })
      .from(searchLogs)
      .where(and(eq(searchLogs.resultsCount, 0), gte(searchLogs.createdAt, last7d)));

    const [totalClicks] = await db
      .select({ count: count() })
      .from(clicks)
      .where(gte(clicks.createdAt, last7d));

    const ctr = searches7d > 0 ? ((totalClicks?.count ?? 0) / searches7d) * 100 : 0;

    const [avgPosition] = await db
      .select({ avg: avg(clicks.position) })
      .from(clicks)
      .where(gte(clicks.createdAt, last7d));

    const [avgResponse] = await db
      .select({ avg: avg(searchLogs.responseTimeMs) })
      .from(searchLogs)
      .where(gte(searchLogs.createdAt, last7d));

    const [failedSearches] = await db
      .select({ count: count() })
      .from(searchLogs)
      .where(and(eq(searchLogs.isSuccess, 'no'), gte(searchLogs.createdAt, last7d)));

    const topZeroResult = await db
      .select({ query: searchLogs.query, count: count() })
      .from(searchLogs)
      .where(and(eq(searchLogs.resultsCount, 0), gte(searchLogs.createdAt, last7d)))
      .groupBy(searchLogs.query)
      .orderBy(desc(count()))
      .limit(10);

    const topQueries = await db
      .select({ query: searchLogs.query, count: count(), resultsCount: sql`AVG(${searchLogs.resultsCount})` })
      .from(searchLogs)
      .where(gte(searchLogs.createdAt, last7d))
      .groupBy(searchLogs.query)
      .orderBy(desc(count()))
      .limit(10);

    const stats = {
      totalSearches,
      searchesLast24h: searches24h,
      searchesLast7d: searches7d,
      totalIndexedPages: pageCount,
      totalIndexedNews: newsCount,
      totalIndexedVideos: videoCount,
      totalIndexedImages: imageCount,
      zeroResultSearches: zeroResultSearches?.count ?? 0,
      zeroResultRate: searches7d > 0 ? ((zeroResultSearches?.count ?? 0) / searches7d) * 100 : 0,
      totalClicks: totalClicks?.count ?? 0,
      ctr: Math.round(ctr * 100) / 100,
      avgClickPosition: avgPosition?.avg ? Math.round(Number(avgPosition.avg) * 10) / 10 : 0,
      avgResponseTimeMs: avgResponse?.avg ? Math.round(Number(avgResponse.avg)) : 0,
      failedSearches: failedSearches?.count ?? 0,
      topZeroResultQueries: topZeroResult.map((r) => ({ query: r.query, count: r.count })),
      topQueries: topQueries.map((r) => ({ query: r.query, count: r.count, avgResults: Math.round(Number(r.resultsCount) * 10) / 10 })),
    };

    await cacheSet(cacheKey, stats, CACHE_TTL.ADMIN_STATS);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Quality stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch quality stats' }, { status: 500 });
  }
}
