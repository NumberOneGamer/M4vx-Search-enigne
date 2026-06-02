import { db } from '@/db';
import { newsArticles } from '@/db/schema/newsArticles';
import { newsPublishers } from '@/db/schema/newsPublishers';
import { eq, and, desc, sql, isNull, inArray, gte, lte, count, ilike, or } from 'drizzle-orm';
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache';

export interface NewsSearchOptions {
  query: string;
  page?: number;
  pageSize?: number;
  timeFrame?: 'hour' | 'today' | 'week' | 'month' | 'year';
  category?: string;
  publisher?: string;
  sort?: 'relevance' | 'date';
}

export interface NewsSearchResult {
  results: {
    id: number;
    headline: string;
    url: string;
    description: string | null;
    body?: string | null;
    author: string | null;
    publisher: string | null;
    publisherLogo: string | null;
    publishDate: string | null;
    updatedDate: string | null;
    featuredImage: string | null;
    category: string | null;
    source: string | null;
    score: number;
  }[];
  totalResults: number;
  page: number;
  pageSize: number;
}

export async function searchNews(options: NewsSearchOptions): Promise<NewsSearchResult> {
  try {
  const { query, page = 1, pageSize = 10, timeFrame, category, publisher, sort = 'relevance' } = options;
  const cacheKey = `news:search:${query}:${page}:${pageSize}:${timeFrame}:${category}:${publisher}:${sort}`;
  const cached = await cacheGet<NewsSearchResult>(cacheKey);
  if (cached) return cached;

  const conditions: ReturnType<typeof eq>[] = [];
  conditions.push(eq(newsArticles.isIndexed, true));

  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (queryTerms.length > 0) {
    conditions.push(
      or(
        ...queryTerms.map(term => or(
          ilike(newsArticles.headline, `%${term}%`),
          ilike(newsArticles.description, `%${term}%`)
        ))
      ) as any
    );
  }

  if (category) {
    conditions.push(eq(newsArticles.category, category));
  }
  if (publisher) {
    const pubCondition = sql`${newsArticles.publisherId} = (SELECT id FROM ${newsPublishers} WHERE ${newsPublishers.name} = ${publisher} LIMIT 1)`;
    conditions.push(pubCondition as any);
  }
  if (timeFrame) {
    const now = new Date();
    let cutoff: Date;
    switch (timeFrame) {
      case 'hour': cutoff = new Date(now.getTime() - 3600000); break;
      case 'today': cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'week': cutoff = new Date(now.getTime() - 7 * 86400000); break;
      case 'month': cutoff = new Date(now.getTime() - 30 * 86400000); break;
      case 'year': cutoff = new Date(now.getTime() - 365 * 86400000); break;
    }
    conditions.push(gte(newsArticles.publishDate, cutoff));
  }

  const whereClause = and(...conditions);

  let ordering = desc(newsArticles.publishDate);
  if (sort === 'relevance') {
    ordering = desc(newsArticles.searchCount);
  }

  const offset = (page - 1) * pageSize;

  const [totalResult] = await db
    .select({ count: count() })
    .from(newsArticles)
    .where(whereClause);

  const totalResults = totalResult?.count ?? 0;

  const rows = await db
    .select({
      id: newsArticles.id,
      headline: newsArticles.headline,
      url: newsArticles.url,
      description: newsArticles.description,
      body: newsArticles.body,
      author: newsArticles.author,
      publisherName: newsPublishers.name,
      publisherLogo: newsPublishers.logoUrl,
      publishDate: newsArticles.publishDate,
      updatedDate: newsArticles.updatedDate,
      featuredImage: newsArticles.featuredImage,
      category: newsArticles.category,
      source: newsArticles.source,
      viewCount: newsArticles.viewCount,
    })
    .from(newsArticles)
    .leftJoin(newsPublishers, eq(newsArticles.publisherId, newsPublishers.id))
    .where(whereClause)
    .orderBy(ordering)
    .limit(pageSize)
    .offset(offset);

  const results = rows.map((row) => {
    let score = row.viewCount ?? 0;
    if (queryTerms.length > 0) {
      const headline = (row.headline ?? '').toLowerCase();
      const desc = (row.description ?? '').toLowerCase();
      for (const term of queryTerms) {
        if (headline.includes(term)) score += 10;
        if (desc.includes(term)) score += 5;
      }
    }
    return {
      id: row.id,
      headline: row.headline,
      url: row.url,
      description: row.description,
      body: row.body,
      author: row.author,
      publisher: row.publisherName,
      publisherLogo: row.publisherLogo,
      publishDate: row.publishDate?.toISOString() ?? null,
      updatedDate: row.updatedDate?.toISOString() ?? null,
      featuredImage: row.featuredImage,
      category: row.category,
      source: row.source,
      score,
    };
  });

  const result: NewsSearchResult = { results, totalResults, page, pageSize };
  await cacheSet(cacheKey, result, CACHE_TTL.SEARCH_RESULTS);
  return result;
  } catch (error) {
    console.error('News search error:', error);
    return { results: [], totalResults: 0, page: options.page || 1, pageSize: options.pageSize || 10 };
  }
}

export async function getTrendingNews(limit = 5) {
  const cacheKey = `news:trending:${limit}`;
  const cached = await cacheGet<typeof results>(cacheKey);
  if (cached) return cached;

  const results = await db
    .select({
      id: newsArticles.id,
      headline: newsArticles.headline,
      url: newsArticles.url,
      featuredImage: newsArticles.featuredImage,
      category: newsArticles.category,
      publishDate: newsArticles.publishDate,
      publisherName: newsPublishers.name,
    })
    .from(newsArticles)
    .leftJoin(newsPublishers, eq(newsArticles.publisherId, newsPublishers.id))
    .where(eq(newsArticles.isIndexed, true))
    .orderBy(desc(newsArticles.viewCount))
    .limit(limit);

  await cacheSet(cacheKey, results, CACHE_TTL.TRENDING);
  return results;
}

export async function getBreakingNews(limit = 5) {
  const cacheKey = `news:breaking:${limit}`;
  const cached = await cacheGet<typeof results>(cacheKey);
  if (cached) return cached;

  const last24h = new Date(Date.now() - 86400000);
  const results = await db
    .select({
      id: newsArticles.id,
      headline: newsArticles.headline,
      url: newsArticles.url,
      featuredImage: newsArticles.featuredImage,
      category: newsArticles.category,
      publishDate: newsArticles.publishDate,
      publisherName: newsPublishers.name,
    })
    .from(newsArticles)
    .leftJoin(newsPublishers, eq(newsArticles.publisherId, newsPublishers.id))
    .where(
      and(
        eq(newsArticles.isIndexed, true),
        gte(newsArticles.publishDate, last24h)
      )
    )
    .orderBy(desc(newsArticles.publishDate))
    .limit(limit);

  await cacheSet(cacheKey, results, CACHE_TTL.TRENDING);
  return results;
}

export async function getNewsCategories() {
  const results = await db
    .select({ category: newsArticles.category, count: count() })
    .from(newsArticles)
    .where(eq(newsArticles.isIndexed, true))
    .groupBy(newsArticles.category)
    .orderBy(desc(count()));

  return results;
}

export async function getNewsByCategory(category: string, limit = 10) {
  const results = await db
    .select({
      id: newsArticles.id,
      headline: newsArticles.headline,
      url: newsArticles.url,
      description: newsArticles.description,
      featuredImage: newsArticles.featuredImage,
      category: newsArticles.category,
      publishDate: newsArticles.publishDate,
      publisherName: newsPublishers.name,
    })
    .from(newsArticles)
    .leftJoin(newsPublishers, eq(newsArticles.publisherId, newsPublishers.id))
    .where(
      and(eq(newsArticles.isIndexed, true), eq(newsArticles.category, category))
    )
    .orderBy(desc(newsArticles.publishDate))
    .limit(limit);

  return results;
}
