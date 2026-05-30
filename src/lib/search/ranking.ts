import { db } from '@/db';
import { pages } from '@/db/schema/pages';
import { domains } from '@/db/schema/domains';
import { backlinks } from '@/db/schema/backlinks';
import { clicks } from '@/db/schema/clicks';
import { eq, sql, gte, and, lt } from 'drizzle-orm';
import type { RankingFactors } from '@/types';
import { DEFAULT_RANKING_FACTORS } from '@/types';

const FRESHNESS_HALF_LIFE_DAYS = 30;

function calculateFreshnessScore(lastCrawledAt: Date | null): number {
  if (!lastCrawledAt) return 0.1;
  const daysSinceCrawl = (Date.now() - lastCrawledAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.pow(2, -daysSinceCrawl / FRESHNESS_HALF_LIFE_DAYS);
}

function calculateContentQualityScore(
  wordCount: number | null,
  hasTitle: boolean,
  hasDescription: boolean,
  hasHeadings: boolean
): number {
  let score = 0;

  if (wordCount && wordCount >= 300 && wordCount <= 10000) {
    score += 0.4;
  } else if (wordCount && wordCount > 100) {
    score += 0.2;
  }

  if (hasTitle) score += 0.2;
  if (hasDescription) score += 0.2;
  if (hasHeadings) score += 0.2;

  return Math.min(score, 1);
}

async function getBacklinkScore(pageId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(backlinks)
    .where(eq(backlinks.targetPageId, pageId))
    .limit(1);

  const count = Number(result[0]?.count || 0);
  return Math.min(Math.log10(count + 1) / 3, 1);
}

async function getEngagementScore(pageId: number): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(clicks)
    .where(
      and(
        eq(clicks.pageId, pageId),
        gte(clicks.createdAt, thirtyDaysAgo)
      )
    )
    .limit(1);

  const count = Number(result[0]?.count || 0);
  return Math.min(count / 100, 1);
}

async function getDomainAuthorityScore(domainId: number): Promise<number> {
  const [domain] = await db
    .select()
    .from(domains)
    .where(eq(domains.id, domainId))
    .limit(1);

  if (!domain) return 0;
  return Math.min(domain.authorityScore / 10, 1);
}

export async function calculatePageRankingScore(
  pageId: number,
  keyword: string,
  keywordRelevance: number,
  factors: RankingFactors = DEFAULT_RANKING_FACTORS
): Promise<{
  relevanceScore: number;
  contentQualityScore: number;
  freshnessScore: number;
  backlinkScore: number;
  engagementScore: number;
  domainAuthorityScore: number;
  overallScore: number;
}> {
  const [page] = await db
    .select()
    .from(pages)
    .where(eq(pages.id, pageId))
    .limit(1);

  if (!page) {
    return {
      relevanceScore: 0,
      contentQualityScore: 0,
      freshnessScore: 0,
      backlinkScore: 0,
      engagementScore: 0,
      domainAuthorityScore: 0,
      overallScore: 0,
    };
  }

  const relevanceScore = Math.min(keywordRelevance, 1);
  const contentQualityScore = calculateContentQualityScore(
    page.wordCount,
    !!page.title,
    !!page.metaDescription,
    !!page.headings
  );
  const freshnessScore = calculateFreshnessScore(page.crawledAt);
  const backlinkScore = await getBacklinkScore(pageId);
  const engagementScore = await getEngagementScore(pageId);
  const domainAuthorityScore = await getDomainAuthorityScore(page.domainId);

  const overallScore =
    relevanceScore * factors.relevanceWeight +
    contentQualityScore * factors.contentQualityWeight +
    freshnessScore * factors.freshnessWeight +
    backlinkScore * factors.backlinkWeight +
    engagementScore * factors.engagementWeight +
    domainAuthorityScore * factors.domainAuthorityWeight;

  return {
    relevanceScore: Math.round(relevanceScore * 100) / 100,
    contentQualityScore: Math.round(contentQualityScore * 100) / 100,
    freshnessScore: Math.round(freshnessScore * 100) / 100,
    backlinkScore: Math.round(backlinkScore * 100) / 100,
    engagementScore: Math.round(engagementScore * 100) / 100,
    domainAuthorityScore: Math.round(domainAuthorityScore * 100) / 100,
    overallScore: Math.round(overallScore * 100) / 100,
  };
}

export async function calculateSearchRelevance(
  keyword: string,
  pageTitle: string | null,
  pageContent: string | null,
  pageHeadings: string | null
): Promise<number> {
  const keywordLower = keyword.toLowerCase();
  let score = 0;

  if (!pageTitle && !pageContent) return 0;

  if (pageTitle) {
    const titleLower = pageTitle.toLowerCase();
    if (titleLower.includes(keywordLower)) {
      score += 0.3;
      const titleWords = titleLower.split(/\s+/);
      const keywordWords = keywordLower.split(/\s+/);
      const matchCount = keywordWords.filter((w) => titleWords.includes(w)).length;
      score += (matchCount / keywordWords.length) * 0.2;
    }
  }

  if (pageHeadings) {
    const headingsLower = pageHeadings.toLowerCase();
    if (headingsLower.includes(keywordLower)) {
      score += 0.2;
    }
  }

  if (pageContent) {
    const contentLower = pageContent.toLowerCase();
    const regex = new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = contentLower.match(regex);
    if (matches) {
      const frequency = matches.length;
      score += Math.min(frequency / 100, 0.2);
    }
  }

  return Math.min(score, 1);
}
