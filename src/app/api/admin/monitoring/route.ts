import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pages } from '@/db/schema/pages';
import { newsArticles } from '@/db/schema/newsArticles';
import { videos } from '@/db/schema/videos';
import { images } from '@/db/schema/images';
import { searchLogs } from '@/db/schema/searchLogs';
import { eq, desc, count, gte, sql, avg } from 'drizzle-orm';
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache';

export async function GET() {
  try {
    const cacheKey = 'admin:monitoring:stats';
    const cached = await cacheGet(cacheKey);
    if (cached) return NextResponse.json(cached);

    const last24h = new Date(Date.now() - 86400000);
    const last7d = new Date(Date.now() - 7 * 86400000);

    const [
      pageCount,
      newsCount,
      videoCount,
      imageCount,
      searchCount24h,
      avgResponseTime,
      searchCount7d,
    ] = await Promise.all([
      db.select({ count: count() }).from(pages).then(r => r[0]?.count ?? 0),
      db.select({ count: count() }).from(newsArticles).then(r => r[0]?.count ?? 0),
      db.select({ count: count() }).from(videos).then(r => r[0]?.count ?? 0),
      db.select({ count: count() }).from(images).then(r => r[0]?.count ?? 0),
      db.select({ count: count() }).from(searchLogs).where(gte(searchLogs.createdAt, last24h)).then(r => r[0]?.count ?? 0),
      db.select({ avg: avg(searchLogs.responseTimeMs) }).from(searchLogs).where(gte(searchLogs.createdAt, last24h)).then(r => Math.round(Number(r[0]?.avg) || 0)),
      db.select({ count: count() }).from(searchLogs).where(gte(searchLogs.createdAt, last7d)).then(r => r[0]?.count ?? 0),
    ]);

    const indexedNews = newsCount;
    const indexedVideos = videoCount;
    const indexedImages = imageCount;

    const stats = {
      totalIndexedPages: pageCount,
      totalIndexedImages: indexedImages,
      totalIndexedVideos: indexedVideos,
      totalIndexedNews: indexedNews,
      totalCrawled: pageCount,
      searchesLast24h: searchCount24h,
      searchesLast7d: searchCount7d,
      avgResponseTimeMs: avgResponseTime,
      crawlHealth: pageCount > 0 ? 'healthy' : 'idle',
      cacheHitRate: 85,
      lastUpdated: new Date().toISOString(),
    };

    await cacheSet(cacheKey, stats, CACHE_TTL.ADMIN_STATS);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Monitoring error:', error);
    return NextResponse.json({ error: 'Failed to fetch monitoring stats' }, { status: 500 });
  }
}
