import { db } from '@/db';
import { searchIntelligence } from '@/db/schema/searchIntelligence';
import { eq, and, desc, gte, lte, count, sql, ne, like } from 'drizzle-orm';
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache';

export async function trackSearchTerm(term: string): Promise<void> {
  if (!term.trim()) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  await db
    .insert(searchIntelligence)
    .values({
      term: term.toLowerCase().trim(),
      type: 'trending',
      frequency: 1,
      score: 1,
      period: today.toISOString().slice(0, 10),
      expiresAt: new Date(now.getTime() + 7 * 86400000),
    })
    .onConflictDoUpdate({
      target: [searchIntelligence.term, searchIntelligence.type, searchIntelligence.period],
      set: {
        frequency: sql`${searchIntelligence.frequency} + 1`,
        score: sql`${searchIntelligence.score} + 1`,
        updatedAt: now,
      },
    });
}

export async function getTrendingSearches(limit = 10): Promise<{ term: string; score: number; type: string }[]> {
  const cacheKey = `si:trending:${limit}`;
  const cached = await cacheGet<{ term: string; score: number; type: string }[]>(cacheKey);
  if (cached) return cached;

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const rows = await db
    .select({
      term: searchIntelligence.term,
      score: sql<number>`SUM(${searchIntelligence.score})`,
      type: searchIntelligence.type,
    })
    .from(searchIntelligence)
    .where(
      and(
        gte(searchIntelligence.createdAt, weekAgo),
        eq(searchIntelligence.type, 'trending')
      )
    )
    .groupBy(searchIntelligence.term, searchIntelligence.type)
    .orderBy(desc(sql<number>`SUM(${searchIntelligence.score})`))
    .limit(limit);

  const results = rows.map((r) => ({ term: r.term, score: Number(r.score), type: r.type }));
  await cacheSet(cacheKey, results, CACHE_TTL.TRENDING);
  return results;
}

export async function getDailyTrends(limit = 10): Promise<{ term: string; score: number }[]> {
  const cacheKey = `si:daily:${limit}`;
  const cached = await cacheGet<{ term: string; score: number }[]>(cacheKey);
  if (cached) return cached;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      term: searchIntelligence.term,
      score: sql<number>`SUM(${searchIntelligence.frequency})`,
    })
    .from(searchIntelligence)
    .where(
      and(
        gte(searchIntelligence.createdAt, today),
        eq(searchIntelligence.type, 'trending')
      )
    )
    .groupBy(searchIntelligence.term)
    .orderBy(desc(sql<number>`SUM(${searchIntelligence.frequency})`))
    .limit(limit);

  const results = rows.map((r) => ({ term: r.term, score: Number(r.score) }));
  await cacheSet(cacheKey, results, CACHE_TTL.SUGGESTIONS);
  return results;
}

export async function getRisingSearches(limit = 10): Promise<{ term: string; score: number }[]> {
  const cacheKey = `si:rising:${limit}`;
  const cached = await cacheGet<{ term: string; score: number }[]>(cacheKey);
  if (cached) return cached;

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const twoWeeksAgo = new Date(today.getTime() - 14 * 86400000);

  const [recentWeek, prevWeek] = await Promise.all([
    db
      .select({
        term: searchIntelligence.term,
        freq: sql<number>`SUM(${searchIntelligence.frequency})`,
      })
      .from(searchIntelligence)
      .where(
        and(
          gte(searchIntelligence.createdAt, weekAgo),
          eq(searchIntelligence.type, 'trending')
        )
      )
      .groupBy(searchIntelligence.term),
    db
      .select({
        term: searchIntelligence.term,
        freq: sql<number>`SUM(${searchIntelligence.frequency})`,
      })
      .from(searchIntelligence)
      .where(
        and(
          gte(searchIntelligence.createdAt, twoWeeksAgo),
          lte(searchIntelligence.createdAt, weekAgo),
          eq(searchIntelligence.type, 'trending')
        )
      )
      .groupBy(searchIntelligence.term),
  ]);

  const prevFreq = new Map(prevWeek.map((r) => [r.term, Number(r.freq) || 0]));

  const rising = recentWeek
    .map((r) => {
      const prev = prevFreq.get(r.term) || 0;
      const growth = prev > 0 ? (Number(r.freq) - prev) / prev : Number(r.freq);
      return { term: r.term, score: growth };
    })
    .filter((r) => r.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  await cacheSet(cacheKey, rising, CACHE_TTL.SUGGESTIONS);
  return rising;
}

export async function getTrendingSuggestions(prefix: string, limit = 5): Promise<string[]> {
  const rows = await db
    .select({ term: searchIntelligence.term })
    .from(searchIntelligence)
    .where(
      and(
        like(searchIntelligence.term, `${prefix.toLowerCase()}%`),
        eq(searchIntelligence.type, 'trending')
      )
    )
    .groupBy(searchIntelligence.term)
    .orderBy(desc(sql<number>`SUM(${searchIntelligence.score})`))
    .limit(limit);

  return rows.map((r) => r.term);
}

export async function getRelatedSearchIntelligence(query: string, limit = 6): Promise<string[]> {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0) return [];

  const rows = await db
    .select({
      term: searchIntelligence.term,
      score: sql<number>`SUM(${searchIntelligence.score})`,
    })
    .from(searchIntelligence)
    .where(
      and(
        ne(searchIntelligence.term, query.toLowerCase().trim()),
        eq(searchIntelligence.type, 'trending')
      )
    )
    .groupBy(searchIntelligence.term)
    .orderBy(desc(sql<number>`SUM(${searchIntelligence.score})`))
    .limit(limit * 3);

  const scored = rows.map((r) => {
    let matchScore = 0;
    for (const term of terms) {
      if (r.term.includes(term)) matchScore += 3;
    }
    return { term: r.term, matchScore };
  });

  return scored
    .filter((r) => r.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit)
    .map((r) => r.term);
}
