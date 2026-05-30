import { pgTable, serial, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { domains } from './domains';

export const pages = pgTable('pages', {
  id: serial('id').primaryKey(),
  domainId: integer('domain_id').notNull().references(() => domains.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 2048 }).notNull().unique(),
  title: text('title'),
  metaDescription: text('meta_description'),
  headings: text('headings'),
  content: text('content'),
  wordCount: integer('word_count').default(0),
  contentHash: varchar('content_hash', { length: 64 }),
  httpStatus: integer('http_status'),
  contentType: varchar('content_type', { length: 100 }),
  crawlDepth: integer('crawl_depth').default(0),
  crawledAt: timestamp('crawled_at'),
  lastIndexedAt: timestamp('last_indexed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  domainIdx: index('pages_domain_idx').on(table.domainId),
  urlIdx: index('pages_url_idx').on(table.url),
  contentHashIdx: index('pages_content_hash_idx').on(table.contentHash),
  titleSearchIdx: index('pages_title_search_idx').on(table.title),
}));

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
