import { pgTable, serial, varchar, text, doublePrecision, integer, timestamp, boolean } from 'drizzle-orm/pg-core';

export const domains = pgTable('domains', {
  id: serial('id').primaryKey(),
  url: varchar('url', { length: 2048 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  authorityScore: doublePrecision('authority_score').notNull().default(1.0),
  crawlRate: integer('crawl_rate').notNull().default(1),
  isBlocklisted: boolean('is_blocklisted').notNull().default(false),
  blocklistReason: text('blocklist_reason'),
  totalPages: integer('total_pages').notNull().default(0),
  lastCrawledAt: timestamp('last_crawled_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Domain = typeof domains.$inferSelect;
export type NewDomain = typeof domains.$inferInsert;
