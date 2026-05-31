import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pages } from '@/db/schema/pages';
import { domains } from '@/db/schema/domains';
import { eq, sql, desc, ilike, and, or, inArray, lt, gt } from 'drizzle-orm';
import { searchSchema } from '@/lib/validation';
import { searchRankedPages, getRankingFactors } from '@/services/ranker';
import { logSearch } from '@/services/analytics';
import { getSuggestions, getRelatedSearches, recordSearchTerm } from '@/lib/search/suggester';
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache';
import { generateSessionId } from '@/lib/utils';
import { parseQuery, buildDateCondition } from '@/lib/search/query-parser';
import type { SearchResponse, SearchResult } from '@/types';

const FTS_COL = sql`to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, ''))`;
const FTS_QUERY = (q: string) => sql`plainto_tsquery('english', ${q})`;
const PHRASE_QUERY = (q: string) => sql`phraseto_tsquery('english', ${q})`;

function extractSnippet(content: string, query: string, exactPhrases: string[] = [], maxLen = 200): string {
  if (!content) return '';
  const allTerms = [...query.split(/\s+/).filter(Boolean), ...exactPhrases];
  if (!allTerms.length) return content.slice(0, maxLen);
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = allTerms.map(t => `(${esc(t)})`).join('|');
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

function extractAiSummary(results: Array<{ title: string | null; content: string | null }>, query: string): string | null {
  const scored: Array<{ text: string; score: number }> = [];
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (!terms.length) return null;

  for (const r of results) {
    if (!r.content) continue;
    const parts = r.content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.split(/\s+/).length >= 5);
    for (const s of parts) {
      const lower = s.toLowerCase();
      let score = 0;
      for (const t of terms) { if (lower.includes(t)) score++; }
      if (score > 0) scored.push({ text: s, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const { text } of scored) {
    const key = text.toLowerCase().slice(0, 40);
    if (!seen.has(key)) { seen.add(key); unique.push(text); }
    if (unique.length >= 2) break;
  }

  return unique.length ? unique.join('. ') + '.' : null;
}

function generateRelatedQuestions(query: string): string[] {
  if (!query.trim()) return [];
  return [
    `What is ${query}?`, `How does ${query} work?`, `${query} examples`,
    `${query} vs alternatives`, `${query} best practices`,
  ].slice(0, 5);
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

  let { q, page, pageSize, type, language, fileType, site, sort, excludeTerms: rawExclude, dateAfter: rawDateAfter, dateBefore: rawDateBefore, datePreset: rawDatePreset, exactPhrases: rawPhrases } = parsed.data;

  const parsedQuery = parseQuery(q);
  const effectiveSite = parsedQuery.siteFilter || site;
  const effectiveFileType = parsedQuery.fileTypeFilter || fileType;
  const effectiveExclude = [...new Set([...parsedQuery.excludeTerms, ...(rawExclude ? rawExclude.split(',') : [])])];
  const effectiveExactPhrases = [...new Set([...parsedQuery.exactPhrases, ...(rawPhrases ? rawPhrases.split('|') : [])])];
  const effectiveQ = parsedQuery.cleanQuery || q;
  const dateCond = buildDateCondition(rawDatePreset || parsedQuery.datePreset);
  const effectiveDateAfter = rawDateAfter || parsedQuery.dateAfter || dateCond.after;
  const effectiveDateBefore = rawDateBefore || parsedQuery.dateBefore || dateCond.before;

  const cacheKey = `search:${effectiveQ}:${page}:${pageSize}:${type}:${sort}:${effectiveSite || ''}:${effectiveFileType || ''}:${effectiveDateAfter || ''}:${effectiveDateBefore || ''}`;
  const cached = await cacheGet<SearchResponse>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const [factors] = await Promise.all([
      getRankingFactors(),
    ]);

    const rankedPages = await searchRankedPages(effectiveQ, factors, pageSize * 3);
    const pageIds = rankedPages.map((rp) => rp.pageId);

    const conditions: ReturnType<typeof and>[] = [];
    if (type !== 'all') conditions.push(eq(pages.contentType, type));
    if (effectiveSite) conditions.push(ilike(pages.url, `%${effectiveSite}%`));
    if (effectiveFileType) conditions.push(ilike(pages.url, `%.${effectiveFileType}`));
    if (effectiveDateAfter) conditions.push(gt(pages.crawledAt, new Date(effectiveDateAfter)));
    if (effectiveDateBefore) {
      const endDate = new Date(effectiveDateBefore);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push(lt(pages.crawledAt, endDate));
    }

    const scoreMap = new Map(rankedPages.map((rp) => [rp.pageId, rp.score]));
    const allKeywords = [...effectiveQ.split(/\s+/).filter(Boolean), ...effectiveExactPhrases];

    type PageRow = { id: number; title: string | null; url: string; description: string | null; content: string | null; domainId: number; crawledAt: Date | null; contentType: string | null; wordCount: number | null; };
    let results: PageRow[] = [];
    let totalResults = 0;

    if (rankedPages.length > 0) {
      conditions.push(inArray(pages.id, pageIds));
      const query = db.select({
        id: pages.id, title: pages.title, url: pages.url, description: pages.metaDescription,
        content: pages.content, domainId: pages.domainId, crawledAt: pages.crawledAt,
        contentType: pages.contentType, wordCount: pages.wordCount,
      }).from(pages);
      if (conditions.length > 0) query.where(and(...conditions));
      if (sort === 'date') query.orderBy(desc(pages.crawledAt));
      results = await query;
      totalResults = results.length;
      const rankOrder = new Map(rankedPages.map((rp, i) => [rp.pageId, i]));
      results.sort((a, b) => (rankOrder.get(a.id) ?? Infinity) - (rankOrder.get(b.id) ?? Infinity));
      if (sort === 'date') results.sort((a, b) => new Date(b.crawledAt || 0).getTime() - new Date(a.crawledAt || 0).getTime());
      results = results.slice((page - 1) * pageSize, page * pageSize);
    } else {
      if (effectiveExactPhrases.length > 0) {
        conditions.push(or(...effectiveExactPhrases.map(phrase =>
          sql`to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '')) @@ ${PHRASE_QUERY(phrase)}`
        )));
      }
      conditions.unshift(sql`${FTS_COL} @@ ${FTS_QUERY(effectiveQ)}`);
      const countKey = `count:${effectiveQ}:${effectiveSite || ''}:${effectiveFileType || ''}`;
      const cachedCount = await cacheGet<number>(countKey).catch(() => null);

      const query = db.select({
        id: pages.id, title: pages.title, url: pages.url, description: pages.metaDescription,
        content: pages.content, domainId: pages.domainId, crawledAt: pages.crawledAt,
        contentType: pages.contentType, wordCount: pages.wordCount,
      }).from(pages);
      if (conditions.length > 0) query.where(and(...conditions));
      if (sort === 'date') query.orderBy(desc(pages.crawledAt));
      else query.orderBy(sql`ts_rank(${FTS_COL}, ${FTS_QUERY(effectiveQ)}) DESC`);
      results = await query.limit(pageSize).offset((page - 1) * pageSize);

      if (cachedCount !== null) {
        totalResults = cachedCount;
      } else {
        const [countRes] = await db
          .select({ count: sql<number>`count(*)` })
          .from(pages)
          .where(and(...conditions));
        totalResults = Number(countRes?.count || results.length);
        cacheSet(countKey, totalResults, CACHE_TTL.SEARCH_RESULTS).catch(() => {});
      }
    }

    if (effectiveExclude.length > 0) {
      results = results.filter(r => {
        const lower = ((r.content || '') + ' ' + (r.title || '')).toLowerCase();
        return !effectiveExclude.some(term => lower.includes(term));
      });
    }

    const domainIds = [...new Set(results.map((r) => r.domainId))];
    const [domainRecords, suggestions, relatedSearches] = await Promise.all([
      domainIds.length > 0
        ? db.select({ id: domains.id, name: domains.name, url: domains.url }).from(domains).where(inArray(domains.id, domainIds))
        : Promise.resolve([] as Array<{ id: number; name: string; url: string }>),
      getSuggestions(effectiveQ),
      getRelatedSearches(effectiveQ),
    ]);
    const domainMap = new Map(domainRecords.map((d) => [d.id, d.name || d.url]));

    const aiSummary = results.length > 0 ? extractAiSummary(results, effectiveQ) : null;
    const relatedQuestions = results.length > 0 ? generateRelatedQuestions(effectiveQ) : [];

    const searchResults: SearchResult[] = results.map((r, i) => ({
      id: r.id,
      title: r.title || 'Untitled',
      url: r.url,
      description: extractSnippet(r.content || '', effectiveQ, effectiveExactPhrases) || r.description || '',
      highlightedKeywords: allKeywords,
      domain: domainMap.get(r.domainId) || '',
      lastCrawledAt: r.crawledAt?.toISOString() || null,
      position: (page - 1) * pageSize + i + 1,
      score: scoreMap.get(r.id) || 0,
      contentType: r.contentType || undefined,
      wordCount: r.wordCount || undefined,
      favicon: domainMap.get(r.domainId)
        ? `https://www.google.com/s2/favicons?domain=${domainMap.get(r.domainId)}&sz=32`
        : undefined,
    }));

    const responseTimeMs = Date.now() - startTime;

    const response: SearchResponse = {
      results: searchResults,
      totalResults,
      page,
      pageSize,
      totalPages: Math.ceil(totalResults / pageSize),
      query: effectiveQ,
      relatedSearches,
      suggestions,
      responseTimeMs,
      aiSummary,
      relatedQuestions,
      appliedFilters: effectiveSite || effectiveFileType || effectiveExclude.length > 0 || effectiveDateAfter || effectiveDateBefore || effectiveExactPhrases.length > 0
        ? {
            site: effectiveSite || undefined,
            fileType: effectiveFileType || undefined,
            excludeTerms: effectiveExclude.length > 0 ? effectiveExclude : undefined,
            dateAfter: effectiveDateAfter || undefined,
            dateBefore: effectiveDateBefore || undefined,
            datePreset: rawDatePreset || parsedQuery.datePreset || undefined,
            exactPhrases: effectiveExactPhrases.length > 0 ? effectiveExactPhrases : undefined,
          }
        : undefined,
    };

    Promise.all([
      cacheSet(cacheKey, response, CACHE_TTL.SEARCH_RESULTS),
      recordSearchTerm(effectiveQ),
      logSearch(effectiveQ, results.length, responseTimeMs, {
        sessionId: searchParams.get('sessionId') || generateSessionId(),
        page,
        userAgent: request.headers.get('user-agent') || undefined,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      }),
    ]).catch(() => {});

    return NextResponse.json(response);

  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    logSearch(effectiveQ, 0, responseTimeMs, {
      sessionId: searchParams.get('sessionId') || generateSessionId(),
      isSuccess: false,
      errorMessage: error instanceof Error ? error.message : 'Search failed',
    }).catch(() => {});

    return NextResponse.json(
      { error: 'Search Error', message: 'Search failed', statusCode: 500 },
      { status: 500 }
    );
  }
}
