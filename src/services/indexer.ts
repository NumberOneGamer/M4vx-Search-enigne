import { db } from '@/db';
import { pages } from '@/db/schema/pages';
import { rankings } from '@/db/schema/rankings';
import { eq, sql, and, desc, isNull } from 'drizzle-orm';
import { tokenizeAndStem, extractKeywords } from '@/lib/search/tokenizer';
import { calculateSearchRelevance, calculatePageRankingScore } from '@/lib/search/ranking';
import { DEFAULT_RANKING_FACTORS } from '@/types';

async function getUnindexedPages(limit = 10): Promise<typeof pages.$inferSelect[]> {
  return db
    .select()
    .from(pages)
    .where(
      and(
        isNull(pages.lastIndexedAt),
        sql`${pages.content} IS NOT NULL`
      )
    )
    .orderBy(pages.createdAt)
    .limit(limit);
}

async function indexPage(page: typeof pages.$inferSelect): Promise<void> {
  const content = page.content || '';
  const title = page.title || '';
  const headings = page.headings || '';

  const combinedText = `${title} ${title} ${headings} ${content}`;
  const keywords = extractKeywords(combinedText, 100);

  const existingRankings = await db
    .select()
    .from(rankings)
    .where(eq(rankings.pageId, page.id));

  const existingKeywordSet = new Set(existingRankings.map((r) => r.keyword));

  for (const [keyword, frequency] of keywords) {
    const relevance = await calculateSearchRelevance(keyword, title, content, headings);
    const score = await calculatePageRankingScore(
      page.id,
      keyword,
      relevance,
      DEFAULT_RANKING_FACTORS
    );

    if (existingKeywordSet.has(keyword)) {
      await db
        .update(rankings)
        .set({
          relevanceScore: score.relevanceScore,
          contentQualityScore: score.contentQualityScore,
          freshnessScore: score.freshnessScore,
          backlinkScore: score.backlinkScore,
          engagementScore: score.engagementScore,
          domainAuthorityScore: score.domainAuthorityScore,
          overallScore: score.overallScore,
          calculatedAt: new Date(),
        })
        .where(
          and(eq(rankings.pageId, page.id), eq(rankings.keyword, keyword))
        );
    } else {
      await db
        .insert(rankings)
        .values({
          pageId: page.id,
          keyword,
          relevanceScore: score.relevanceScore,
          contentQualityScore: score.contentQualityScore,
          freshnessScore: score.freshnessScore,
          backlinkScore: score.backlinkScore,
          engagementScore: score.engagementScore,
          domainAuthorityScore: score.domainAuthorityScore,
          overallScore: score.overallScore,
        });
    }
  }

  await db
    .update(pages)
    .set({ lastIndexedAt: new Date() })
    .where(eq(pages.id, page.id));
}

export async function reindexPage(pageId: number): Promise<void> {
  const [page] = await db
    .select()
    .from(pages)
    .where(eq(pages.id, pageId))
    .limit(1);

  if (page) {
    await indexPage(page);
  }
}

export async function reindexAllPages(): Promise<void> {
  console.log('[Indexer] Starting full reindex...');

  let processed = 0;
  let batch = await getUnindexedPages(50);

  while (batch.length > 0) {
    for (const page of batch) {
      await indexPage(page);
      processed++;
    }

    console.log(`[Indexer] Indexed ${processed} pages...`);
    batch = await getUnindexedPages(50);
  }

  console.log(`[Indexer] Full reindex complete. Indexed ${processed} pages.`);
}

export async function getIndexStats(): Promise<{
  totalPages: number;
  indexedPages: number;
  totalKeywords: number;
}> {
  const [totalPages] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pages);

  const [indexedPages] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pages)
    .where(sql`${pages.lastIndexedAt} IS NOT NULL`);

  const [totalKeywords] = await db
    .select({ count: sql<number>`count(*)` })
    .from(rankings);

  return {
    totalPages: Number(totalPages?.count || 0),
    indexedPages: Number(indexedPages?.count || 0),
    totalKeywords: Number(totalKeywords?.count || 0),
  };
}

async function indexLoop(): Promise<void> {
  console.log('[Indexer] Starting index loop...');

  while (true) {
    try {
      const batch = await getUnindexedPages(10);
      if (batch.length === 0) {
        console.log('[Indexer] No pages to index, waiting 30s...');
        await new Promise((resolve) => setTimeout(resolve, 30000));
        continue;
      }

      console.log(`[Indexer] Indexing ${batch.length} pages...`);
      for (const page of batch) {
        await indexPage(page);
      }
    } catch (error) {
      console.error('[Indexer] Error:', error);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
}

export async function startIndexer(): Promise<void> {
  console.log('[Indexer] Initializing...');
  await indexLoop();
}

if (require.main === module) {
  startIndexer().catch(console.error);
}
