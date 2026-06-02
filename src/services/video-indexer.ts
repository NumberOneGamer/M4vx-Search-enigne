import { db } from '@/db';
import { videos } from '@/db/schema/videos';
import { eq, and, desc, gte, lte, count, inArray, sql, ilike, or } from 'drizzle-orm';
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache';

export interface VideoSearchOptions {
  query: string;
  page?: number;
  pageSize?: number;
  duration?: 'short' | 'medium' | 'long';
  uploadDate?: 'today' | 'week' | 'month' | 'year';
  quality?: 'hd' | 'fullhd' | '4k';
  source?: string;
  sort?: 'relevance' | 'date' | 'views';
}

export interface VideoSearchResult {
  results: {
    id: number;
    title: string;
    url: string;
    description: string | null;
    thumbnailUrl: string | null;
    duration: number | null;
    channelName: string | null;
    channelUrl: string | null;
    publishDate: string | null;
    viewCount: number | null;
    tags: string | null;
    source: string | null;
    embedUrl: string | null;
    quality: string | null;
    score: number;
  }[];
  totalResults: number;
  page: number;
  pageSize: number;
}

const DURATION_RANGES: Record<string, [number, number]> = {
  short: [0, 240],
  medium: [240, 1200],
  long: [1200, Infinity],
};

export async function searchVideos(options: VideoSearchOptions): Promise<VideoSearchResult> {
  try {
  const { query, page = 1, pageSize = 10, duration, uploadDate, quality, source, sort = 'relevance' } = options;
  const cacheKey = `video:search:${query}:${page}:${pageSize}:${duration}:${uploadDate}:${quality}:${source}:${sort}`;
  const cached = await cacheGet<VideoSearchResult>(cacheKey);
  if (cached) return cached;

  const conditions: ReturnType<typeof eq>[] = [];
  conditions.push(eq(videos.isIndexed, true));

  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (queryTerms.length > 0) {
    conditions.push(
      or(
        ...queryTerms.map(term => or(
          ilike(videos.title, `%${term}%`),
          ilike(videos.description, `%${term}%`)
        ))
      ) as any
    );
  }

  if (duration && DURATION_RANGES[duration]) {
    const [minDur, maxDur] = DURATION_RANGES[duration];
    conditions.push(gte(videos.duration, minDur));
    if (maxDur !== Infinity) {
      conditions.push(lte(videos.duration, maxDur));
    }
  }

  if (uploadDate) {
    const now = new Date();
    let cutoff: Date;
    switch (uploadDate) {
      case 'today': cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'week': cutoff = new Date(now.getTime() - 7 * 86400000); break;
      case 'month': cutoff = new Date(now.getTime() - 30 * 86400000); break;
      case 'year': cutoff = new Date(now.getTime() - 365 * 86400000); break;
    }
    conditions.push(gte(videos.publishDate, cutoff));
  }

  if (quality) {
    conditions.push(eq(videos.quality, quality));
  }

  if (source) {
    conditions.push(eq(videos.source, source));
  }

  const whereClause = and(...conditions);

  let ordering;
  switch (sort) {
    case 'date': ordering = desc(videos.publishDate); break;
    case 'views': ordering = desc(videos.viewCount); break;
    default: ordering = desc(videos.searchCount); break;
  }

  const offset = (page - 1) * pageSize;

  const [totalResult] = await db
    .select({ count: count() })
    .from(videos)
    .where(whereClause);

  const totalResults = totalResult?.count ?? 0;

  const rows = await db
    .select()
    .from(videos)
    .where(whereClause)
    .orderBy(ordering)
    .limit(pageSize)
    .offset(offset);

  const results = rows.map((row) => {
    let score = row.viewCount ?? 0;
    if (queryTerms.length > 0) {
      const title = (row.title ?? '').toLowerCase();
      const desc = (row.description ?? '').toLowerCase();
      for (const term of queryTerms) {
        if (title.includes(term)) score += 10;
        if (desc.includes(term)) score += 5;
      }
    }
    return {
      id: row.id,
      title: row.title,
      url: row.url,
      description: row.description,
      thumbnailUrl: row.thumbnailUrl,
      duration: row.duration,
      channelName: row.channelName,
      channelUrl: row.channelUrl,
      publishDate: row.publishDate?.toISOString() ?? null,
      viewCount: row.viewCount,
      tags: row.tags,
      source: row.source,
      embedUrl: row.embedUrl,
      quality: row.quality,
      score,
    };
  });

  const result: VideoSearchResult = { results, totalResults, page, pageSize };
  await cacheSet(cacheKey, result, CACHE_TTL.SEARCH_RESULTS);
  return result;
  } catch (error) {
    console.error('Video search error:', error);
    return { results: [], totalResults: 0, page: options.page || 1, pageSize: options.pageSize || 10 };
  }
}

export async function getRelatedVideos(videoId: number, limit = 6) {
  const video = await db
    .select({ tags: videos.tags, channelName: videos.channelName })
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1)
    .then((r) => r[0]);

  if (!video) return [];

  const conditions: ReturnType<typeof eq>[] = [eq(videos.isIndexed, true)];

  if (video.tags) {
    const tagList = video.tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tagList.length > 0) {
      conditions.push(
        sql`${videos.tags} && ARRAY[${tagList.map((t) => `'${t.replace(/'/g, "''")}'`).join(',')}]::text[]`
      );
    }
  }

  const related = await db
    .select()
    .from(videos)
    .where(and(...conditions))
    .orderBy(desc(videos.viewCount))
    .limit(limit + 1);

  return related.filter((v) => v.id !== videoId).slice(0, limit);
}

export async function getVideoStats() {
  const [totalResult, indexedResult] = await Promise.all([
    db.select({ count: count() }).from(videos),
    db.select({ count: count() }).from(videos).where(eq(videos.isIndexed, true)),
  ]);
  return {
    total: totalResult[0]?.count ?? 0,
    indexed: indexedResult[0]?.count ?? 0,
  };
}
