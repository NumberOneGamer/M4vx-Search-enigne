import { db } from '@/db';
import { searchLogs } from '@/db/schema/searchLogs';
import { searchTerms } from '@/db/schema/searchTerms';
import { clicks } from '@/db/schema/clicks';
import { pages } from '@/db/schema/pages';
import { domains } from '@/db/schema/domains';
import { crawlQueue } from '@/db/schema/crawlQueue';
import { users } from '@/db/schema/users';
import { newsArticles } from '@/db/schema/newsArticles';
import { videos } from '@/db/schema/videos';
import { images } from '@/db/schema/images';
import { sql, eq, and, gte, lte, desc, count } from 'drizzle-orm';
import type { AdminStats } from '@/types';

export async function logSearch(
  query: string,
  resultsCount: number,
  responseTimeMs: number,
  options?: {
    userId?: number;
    sessionId?: string;
    filters?: string;
    page?: number;
    isSuccess?: boolean;
    errorMessage?: string;
    userAgent?: string;
    ipAddress?: string;
  }
): Promise<number> {
  const [log] = await db
    .insert(searchLogs)
    .values({
      userId: options?.userId,
      sessionId: options?.sessionId,
      query,
      filters: options?.filters,
      resultsCount,
      responseTimeMs,
      page: options?.page || 1,
      isSuccess: options?.isSuccess !== false ? 'yes' : 'no',
      errorMessage: options?.errorMessage,
      userAgent: options?.userAgent,
      ipAddress: options?.ipAddress,
    })
    .returning();

  return log.id;
}

export async function logClick(
  searchLogId: number,
  position: number,
  url: string,
  pageId?: number,
  dwellTimeMs?: number
): Promise<void> {
  await db.insert(clicks).values({
    searchLogId,
    pageId,
    position,
    url,
    dwellTimeMs,
  });
}

export async function getAdminStats(): Promise<AdminStats> {
  const [totalPagesResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pages);

  const [totalDomainsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(domains);

  const [totalSearchesResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(searchLogs);

  const [totalUsersResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);

  const [queueSizeResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(crawlQueue)
    .where(eq(crawlQueue.status, 'pending'));

  const [avgResponseTimeResult] = await db
    .select({ avg: sql<number>`COALESCE(AVG(response_time_ms), 0)` })
    .from(searchLogs);

  const [totalNewsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(newsArticles);
  const [totalVideosResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(videos);
  const [totalImagesResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(images);
  const [indexedNewsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(newsArticles)
    .where(eq(newsArticles.isIndexed, true));
  const [indexedVideosResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(videos)
    .where(eq(videos.isIndexed, true));
  const [indexedImagesResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(images)
    .where(eq(images.isIndexed, true));

  const topQueries = await db
    .select({ term: searchTerms.term, frequency: searchTerms.frequency })
    .from(searchTerms)
    .orderBy(desc(searchTerms.frequency))
    .limit(10);

  const searchTrend = await db
    .select({
      date: sql<string>`DATE(created_at)::text`,
      count: sql<number>`count(*)`,
    })
    .from(searchLogs)
    .where(gte(searchLogs.createdAt, sql`NOW() - INTERVAL '7 days'`))
    .groupBy(sql`DATE(created_at)`)
    .orderBy(sql`DATE(created_at)`);

  const domainDistribution = await db
    .select({
      name: domains.name,
      count: sql<number>`count(*)`,
    })
    .from(domains)
    .leftJoin(pages, eq(pages.domainId, domains.id))
    .groupBy(domains.name)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const crawlRate = await db
    .select({
      date: sql<string>`DATE(completed_at)::text`,
      count: sql<number>`count(*)`,
    })
    .from(crawlQueue)
    .where(
      and(
        eq(crawlQueue.status, 'completed'),
        gte(crawlQueue.completedAt, sql`NOW() - INTERVAL '7 days'`)
      )
    )
    .groupBy(sql`DATE(completed_at)`)
    .orderBy(sql`DATE(completed_at)`);

  return {
    totalPages: Number(totalPagesResult?.count || 0),
    totalDomains: Number(totalDomainsResult?.count || 0),
    totalSearches: Number(totalSearchesResult?.count || 0),
    totalUsers: Number(totalUsersResult?.count || 0),
    queueSize: Number(queueSizeResult?.count || 0),
    avgResponseTime: Math.round(Number(avgResponseTimeResult?.avg || 0)),
    totalNewsArticles: Number(totalNewsResult?.count || 0),
    totalVideos: Number(totalVideosResult?.count || 0),
    totalImages: Number(totalImagesResult?.count || 0),
    indexedNews: Number(indexedNewsResult?.count || 0),
    indexedVideos: Number(indexedVideosResult?.count || 0),
    indexedImages: Number(indexedImagesResult?.count || 0),
    topQueries: topQueries as AdminStats['topQueries'],
    searchTrend: (searchTrend as Array<{ date: string; count: number }>),
    crawlRate: (crawlRate as Array<{ date: string; count: number }>),
    domainDistribution: (domainDistribution as Array<{ name: string; count: number }>),
  };
}

export async function getSearchAnalytics(
  from?: string,
  to?: string,
  limit = 50
): Promise<{
  totalSearches: number;
  totalClicks: number;
  ctr: number;
  avgResponseTime: number;
  topQueries: Array<{ term: string; count: number }>;
  searchesByDay: Array<{ date: string; count: number }>;
  zeroResultQueries: Array<{ term: string; count: number }>;
  failedSearches: number;
  searchesToday: number;
  searchesThisWeek: number;
  searchesThisMonth: number;
  avgPositionClicked: number;
  mostClickedDomains: Array<{ domain: string; count: number }>;
  mostClickedResults: Array<{ url: string; count: number }>;
  totalIndexedPages: number;
  totalIndexedNews: number;
  totalIndexedVideos: number;
  totalIndexedImages: number;
}> {
  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();

  const totalSearchesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(searchLogs)
    .where(
      and(
        gte(searchLogs.createdAt, fromDate),
        lte(searchLogs.createdAt, toDate)
      )
    );

  const totalClicksResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(clicks)
    .where(
      and(
        gte(clicks.createdAt, fromDate),
        lte(clicks.createdAt, toDate)
      )
    );

  const avgResponseTimeResult = await db
    .select({ avg: sql<number>`COALESCE(AVG(response_time_ms), 0)` })
    .from(searchLogs)
    .where(
      and(
        gte(searchLogs.createdAt, fromDate),
        lte(searchLogs.createdAt, toDate)
      )
    );

  const topQueries = await db
    .select({
      term: searchLogs.query,
      count: sql<number>`count(*)`,
    })
    .from(searchLogs)
    .where(
      and(
        gte(searchLogs.createdAt, fromDate),
        lte(searchLogs.createdAt, toDate)
      )
    )
    .groupBy(searchLogs.query)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  const searchesByDay = await db
    .select({
      date: sql<string>`DATE(created_at)::text`,
      count: sql<number>`count(*)`,
    })
    .from(searchLogs)
    .where(
      and(
        gte(searchLogs.createdAt, fromDate),
        lte(searchLogs.createdAt, toDate)
      )
    )
    .groupBy(sql`DATE(created_at)`)
    .orderBy(sql`DATE(created_at)`);

  const zeroResultQueries = await db
    .select({
      term: searchLogs.query,
      count: sql<number>`count(*)`,
    })
    .from(searchLogs)
    .where(
      and(
        eq(searchLogs.resultsCount, 0),
        gte(searchLogs.createdAt, fromDate),
        lte(searchLogs.createdAt, toDate)
      )
    )
    .groupBy(searchLogs.query)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const [failedSearchesResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(searchLogs)
    .where(
      and(
        eq(searchLogs.isSuccess, 'no'),
        gte(searchLogs.createdAt, fromDate),
        lte(searchLogs.createdAt, toDate)
      )
    );

  const [searchesTodayResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(searchLogs)
    .where(sql`DATE(created_at) = CURRENT_DATE`);

  const [searchesThisWeekResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(searchLogs)
    .where(gte(searchLogs.createdAt, sql`CURRENT_DATE - INTERVAL '7 days'`));

  const [searchesThisMonthResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(searchLogs)
    .where(gte(searchLogs.createdAt, sql`CURRENT_DATE - INTERVAL '30 days'`));

  const [avgPositionResult] = await db
    .select({ avg: sql<number>`COALESCE(AVG(position), 0)` })
    .from(clicks)
    .where(
      and(
        gte(clicks.createdAt, fromDate),
        lte(clicks.createdAt, toDate)
      )
    );

  const mostClickedDomains = await db
    .select({
      domain: sql<string>`SPLIT_PART(REPLACE(REPLACE(REPLACE(url, 'https://', ''), 'http://', ''), 'www.', ''), '/', 1)`,
      count: sql<number>`count(*)`,
    })
    .from(clicks)
    .where(
      and(
        gte(clicks.createdAt, fromDate),
        lte(clicks.createdAt, toDate)
      )
    )
    .groupBy(sql`SPLIT_PART(REPLACE(REPLACE(REPLACE(url, 'https://', ''), 'http://', ''), 'www.', ''), '/', 1)`)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const mostClickedResults = await db
    .select({
      url: clicks.url,
      count: sql<number>`count(*)`,
    })
    .from(clicks)
    .where(
      and(
        gte(clicks.createdAt, fromDate),
        lte(clicks.createdAt, toDate)
      )
    )
    .groupBy(clicks.url)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const [totalPages] = await db.select({ count: count() }).from(pages);
  const [totalNews] = await db.select({ count: count() }).from(newsArticles);
  const [totalVideos] = await db.select({ count: count() }).from(videos);
  const [totalImages] = await db.select({ count: count() }).from(images);

  const totalSearches = Number(totalSearchesResult[0]?.count ?? 0);
  const totalClicks = Number(totalClicksResult[0]?.count ?? 0);

  return {
    totalSearches,
    totalClicks,
    ctr: totalSearches > 0 ? Math.round((totalClicks / totalSearches) * 10000) / 100 : 0,
    avgResponseTime: Math.round(Number(avgResponseTimeResult[0]?.avg ?? 0)),
    topQueries: topQueries as Array<{ term: string; count: number }>,
    searchesByDay: (searchesByDay as Array<{ date: string; count: number }>),
    zeroResultQueries: zeroResultQueries as Array<{ term: string; count: number }>,
    failedSearches: Number(failedSearchesResult?.count || 0),
    searchesToday: Number(searchesTodayResult?.count || 0),
    searchesThisWeek: Number(searchesThisWeekResult?.count || 0),
    searchesThisMonth: Number(searchesThisMonthResult?.count || 0),
    avgPositionClicked: Math.round(Number(avgPositionResult?.avg || 0) * 100) / 100,
    mostClickedDomains: (mostClickedDomains as Array<{ domain: string; count: number }>),
    mostClickedResults: (mostClickedResults as Array<{ url: string; count: number }>),
    totalIndexedPages: Number(totalPages?.count || 0),
    totalIndexedNews: Number(totalNews?.count || 0),
    totalIndexedVideos: Number(totalVideos?.count || 0),
    totalIndexedImages: Number(totalImages?.count || 0),
  };
}
