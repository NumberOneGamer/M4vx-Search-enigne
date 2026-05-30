import { pgTable, serial, integer, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const searchLogs = pgTable('search_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  sessionId: varchar('session_id', { length: 255 }),
  query: text('query').notNull(),
  filters: text('filters'),
  resultsCount: integer('results_count').default(0),
  responseTimeMs: integer('response_time_ms').default(0),
  page: integer('page').default(1),
  isSuccess: varchar('is_success', { length: 10 }).default('yes'),
  errorMessage: text('error_message'),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  queryIdx: index('sl_query_idx').on(table.query),
  createdAtIdx: index('sl_created_at_idx').on(table.createdAt),
  userIdIdx: index('sl_user_id_idx').on(table.userId),
}));

export type SearchLog = typeof searchLogs.$inferSelect;
export type NewSearchLog = typeof searchLogs.$inferInsert;
