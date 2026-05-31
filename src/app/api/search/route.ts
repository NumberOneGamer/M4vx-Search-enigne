import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pages } from '@/db/schema/pages';
import { domains } from '@/db/schema/domains';
import { eq, sql, desc, ilike, and, inArray } from 'drizzle-orm';
import { searchSchema } from '@/lib/validation';
import { searchRankedPages, getRankingFactors } from '@/services/ranker';
import { logSearch } from '@/services/analytics';
import { getSuggestions, getRelatedSearches, recordSearchTerm } from '@/lib/search/suggester';
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache';
import { generateSessionId } from '@/lib/utils';
import type { SearchResponse, SearchResult } from '@/types';

const FTS_COL = sql`to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, ''))`;
const FTS_QUERY = (q: string) => sql`plainto_tsquery('english', ${q})`;

function extractSnippet(content: string, query: string, maxLen = 200): string {
  if (!content) return '';
  const terms = query.split(/\s+/).filter(Boolean);
  if (!terms.length) return content.slice(0, maxLen);
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = terms.map(t => `(${esc(t)})`).join('|');
  const re = new RegExp(pattern, 'gi');
  const match = re.exec(content);
  if (!match) return content.slice(0, maxLen);
  const start = Math.max(0, match.index - 80);
  const end = Math.min(content.length, match.index + match[0].length + 120);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  return snippet;
}

function buildBaseQuery(conditions: ReturnType<typeof and>[]) {
  return db
    .select({
      id: pages.id,
      title: pages.title,
      url: pages.url,
      description: pages.metaDescription,
      content: pages.content,
      domainId: pages.domainId,
      crawledAt: pages.crawledAt,
      contentType: pages.contentType,
    })
    .from(pages)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
}

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  const parsed = searchSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation Error', message: parsed.error.errors[0].message, statusCode: 400 },
      { status: 400 }
    );
  }

  const { q, page, pageSize, type, language, fileType, site, sort } = parsed.data;

  const cacheKey = `search:${q}:${page}:${pageSize}:${type}:${sort}`;
  const cached = await cacheGet<SearchResponse>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const factors = await getRankingFactors();
    const rankedPages = await searchRankedPages(q, factors, pageSize * 3);

    const pageIds = rankedPages.map((rp) => rp.pageId);

    const conditions: ReturnType<typeof and>[] = [];
    if (type !== 'all') {
      conditions.push(eq(pages.contentType, type));
    }
    if (fileType) {
      conditions.push(ilike(pages.url, `%.${fileType}`));
    }
    if (site) {
      conditions.push(ilike(pages.url, `%${site}%`));
    }

    const scoreMap = new Map(rankedPages.map((rp) => [rp.pageId, rp.score]));

    let results: Awaited<ReturnType<typeof buildBaseQuery>>;

    if (rankedPages.length > 0) {
      conditions.push(inArray(pages.id, pageIds));
      const query = buildBaseQuery(conditions);
      if (sort === 'date') {
        query.orderBy(desc(pages.crawledAt));
      }
      results = await query;
      const rankOrder = new Map(rankedPages.map((rp, i) => [rp.pageId, i]));
      results.sort((a, b) => (rankOrder.get(a.id) ?? Infinity) - (rankOrder.get(b.id) ?? Infinity));
      if (sort === 'date') {
        results.sort((a, b) => new Date(b.crawledAt || 0).getTime() - new Date(a.crawledAt || 0).getTime());
      }
      results = results.slice((page - 1) * pageSize, page * pageSize);
    } else {
      conditions.unshift(sql`${FTS_COL} @@ ${FTS_QUERY(q)}`);
      const query = buildBaseQuery(conditions);
      if (sort === 'date') {
        query.orderBy(desc(pages.crawledAt));
      } else {
        query.orderBy(sql`ts_rank(${FTS_COL}, ${FTS_QUERY(q)}) DESC`);
      }
      results = await query.limit(pageSize).offset((page - 1) * pageSize);
    }

    const domainIds = [...new Set(results.map((r) => r.domainId))];
    const domainRecords = domainIds.length > 0
      ? await db
          .select({ id: domains.id, name: domains.name, url: domains.url })
          .from(domains)
          .where(inArray(domains.id, domainIds))
      : [];
    const domainMap = new Map(domainRecords.map((d) => [d.id, d.name || d.url]));

    const searchResults: SearchResult[] = results.map((r, i) => ({
      id: r.id,
      title: r.title || 'Untitled',
      url: r.url,
      description: extractSnippet(r.content || '', q) || r.description || '',
      highlightedKeywords: q.split(/\s+/),
      domain: domainMap.get(r.domainId) || '',
      lastCrawledAt: r.crawledAt?.toISOString() || null,
      position: (page - 1) * pageSize + i + 1,
      score: scoreMap.get(r.id) || 0,
      contentType: r.contentType || undefined,
    }));

    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(pages)
      .where(sql`${FTS_COL} @@ ${FTS_QUERY(q)}`);
    const totalResults = Number(totalCountResult[0]?.count || results.length);

    const suggestions = await getSuggestions(q);
    const relatedSearches = await getRelatedSearches(q);

    const responseTimeMs = Date.now() - startTime;

    const response: SearchResponse = {
      results: searchResults,
      totalResults,
      page,
      pageSize,
      totalPages: Math.ceil(totalResults / pageSize),
      query: q,
      relatedSearches,
      suggestions,
      responseTimeMs,
    };

    await cacheSet(cacheKey, response, CACHE_TTL.SEARCH_RESULTS);
    await recordSearchTerm(q);

    const sessionId = searchParams.get('sessionId') || generateSessionId();
    logSearch(q, results.length, responseTimeMs, {
      sessionId,
      page,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    }).catch(() => {});

    return NextResponse.json(response);

  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    const sessionId = searchParams.get('sessionId') || generateSessionId();
    logSearch(q, 0, responseTimeMs, {
      sessionId,
      isSuccess: false,
      errorMessage: error instanceof Error ? error.message : 'Search failed',
    }).catch(() => {});

    return NextResponse.json(
      { error: 'Search Error', message: 'Search failed', statusCode: 500 },
      { status: 500 }
    );
  }
}
