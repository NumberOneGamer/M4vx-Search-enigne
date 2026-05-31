import { pgTable, serial, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users';
import { pages } from './pages';

export const searchHistory = pgTable('search_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  query: text('query').notNull(),
  filters: text('filters'),
  clickedResultId: integer('clicked_result_id').references(() => pages.id),
  clickedUrl: varchar('clicked_url', { length: 2048 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type SearchHistory = typeof searchHistory.$inferSelect;
export type NewSearchHistory = typeof searchHistory.$inferInsert;
