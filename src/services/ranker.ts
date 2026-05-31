import { db } from '@/db';
import { pages } from '@/db/schema/pages';
import { rankings } from '@/db/schema/rankings';
import { eq, sql, and, gte, desc } from 'drizzle-orm';
import { calculatePageRankingScore, calculateSearchRelevance } from '@/lib/search/ranking';
import { tokenizeAndStem } from '@/lib/search/tokenizer';
import { DEFAULT_RANKING_FACTORS, type RankingFactors } from '@/types';
import { settings as settingsTable } from '@/db/schema/settings';

export async function searchRankedPages(
  query: string,
  factors: RankingFactors = DEFAULT_RANKING_FACTORS,
  limit = 50
): Promise<Array<{ pageId: number; score: number }>> {
  const queryTokens = tokenizeAndStem(query);
  if (queryTokens.length === 0) return [];

  const keywordConditions = queryTokens.map(
    (token) => sql`LOWER(${rankings.keyword}) = ${token.toLowerCase()}`
  );

  const results = await db
    .select({
      pageId: rankings.pageId,
      overallScore: rankings.overallScore,
      freshnessScore: rankings.freshnessScore,
      backlinkScore: rankings.backlinkScore,
      engagementScore: rankings.engagementScore,
      domainAuthorityScore: rankings.domainAuthorityScore,
      contentQualityScore: rankings.contentQualityScore,
      relevanceScore: rankings.relevanceScore,
    })
    .from(rankings)
    .where(sql`(${sql.join(keywordConditions, sql` OR `)})`)
    .orderBy(desc(rankings.overallScore))
    .limit(limit * 3);

  const pageScores = new Map<number, number>();
  for (const r of results) {
    const current = pageScores.get(r.pageId) || 0;
    pageScores.set(r.pageId, Math.max(current, Number(r.overallScore) || 0));
  }

  const sorted = [...pageScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  return sorted.map(([pageId, score]) => ({ pageId, score }));
}

export async function recalculateRankingsForPage(pageId: number): Promise<void> {
  const [page] = await db
    .select()
    .from(pages)
    .where(eq(pages.id, pageId))
    .limit(1);

  if (!page || !page.content) return;

  const content = page.content || '';
  const title = page.title || '';
  const headings = page.headings || '';

  const combinedText = `${title} ${title} ${headings} ${content}`;
  const tokens = tokenizeAndStem(combinedText);
  const keywordSet = new Set(tokens);

  for (const keyword of keywordSet) {
    const relevance = await calculateSearchRelevance(keyword, title, content, headings);
    const score = await calculatePageRankingScore(pageId, keyword, relevance);

    await db
      .insert(rankings)
      .values({
        pageId,
        keyword,
        ...score,
      })
      .onConflictDoUpdate({
        target: [rankings.pageId, rankings.keyword],
        set: {
          relevanceScore: score.relevanceScore,
          contentQualityScore: score.contentQualityScore,
          freshnessScore: score.freshnessScore,
          backlinkScore: score.backlinkScore,
          engagementScore: score.engagementScore,
          domainAuthorityScore: score.domainAuthorityScore,
          overallScore: score.overallScore,
          calculatedAt: new Date(),
        },
      });
  }
}

export async function getRankingFactors(): Promise<RankingFactors> {
  try {
    const rankingSettings = await db
      .select()
      .from(settingsTable)
      .where(sql`${settingsTable.key} LIKE 'ranking_%'`);

    const factors: RankingFactors = { ...DEFAULT_RANKING_FACTORS };
    for (const s of rankingSettings) {
      const key = s.key.replace('ranking_', '') as keyof RankingFactors;
      if (key in factors) {
        factors[key] = parseFloat(s.value);
      }
    }
    return factors;
  } catch {
    return DEFAULT_RANKING_FACTORS;
  }
}

