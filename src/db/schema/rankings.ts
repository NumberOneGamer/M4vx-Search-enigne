import { pgTable, serial, integer, varchar, doublePrecision, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { pages } from './pages';

export const rankings = pgTable('rankings', {
  id: serial('id').primaryKey(),
  pageId: integer('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  keyword: varchar('keyword', { length: 500 }).notNull(),
  relevanceScore: doublePrecision('relevance_score').default(0),
  contentQualityScore: doublePrecision('content_quality_score').default(0),
  freshnessScore: doublePrecision('freshness_score').default(0),
  backlinkScore: doublePrecision('backlink_score').default(0),
  engagementScore: doublePrecision('engagement_score').default(0),
  domainAuthorityScore: doublePrecision('domain_authority_score').default(0),
  overallScore: doublePrecision('overall_score').default(0),
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
}, (table) => ({
  keywordIdx: index('rk_keyword_idx').on(table.keyword),
  pageIdx: index('rk_page_idx').on(table.pageId),
  overallScoreIdx: index('rk_overall_score_idx').on(table.overallScore),
  pageKeywordUnique: uniqueIndex('rk_page_keyword_unique').on(table.pageId, table.keyword),
}));

export type Ranking = typeof rankings.$inferSelect;
export type NewRanking = typeof rankings.$inferInsert;
