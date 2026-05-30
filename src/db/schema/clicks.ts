import { pgTable, serial, integer, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { searchLogs } from './searchLogs';
import { pages } from './pages';

export const clicks = pgTable('clicks', {
  id: serial('id').primaryKey(),
  searchLogId: integer('search_log_id').notNull().references(() => searchLogs.id, { onDelete: 'cascade' }),
  pageId: integer('page_id').references(() => pages.id, { onDelete: 'set null' }),
  position: integer('position').notNull(),
  url: text('url').notNull(),
  isResultClick: varchar('is_result_click', { length: 10 }).default('yes'),
  dwellTimeMs: integer('dwell_time_ms'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  searchLogIdx: index('cl_search_log_idx').on(table.searchLogId),
  pageIdx: index('cl_page_idx').on(table.pageId),
}));

export type Click = typeof clicks.$inferSelect;
export type NewClick = typeof clicks.$inferInsert;
