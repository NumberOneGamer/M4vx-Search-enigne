import { pgTable, serial, varchar, text, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { domains } from './domains';

export const crawlQueue = pgTable('crawl_queue', {
  id: serial('id').primaryKey(),
  domainId: integer('domain_id').notNull().references(() => domains.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 2048 }).notNull(),
  priority: integer('priority').notNull().default(0),
  depth: integer('depth').notNull().default(0),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  errorMessage: text('error_message'),
  scheduledAt: timestamp('scheduled_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  urlIdx: uniqueIndex('queue_url_idx').on(table.url),
  statusIdx: index('queue_status_idx').on(table.status),
  domainIdx: index('queue_domain_idx').on(table.domainId),
  priorityIdx: index('queue_priority_idx').on(table.priority),
}));

export type CrawlQueue = typeof crawlQueue.$inferSelect;
export type NewCrawlQueue = typeof crawlQueue.$inferInsert;
