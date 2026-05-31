import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  theme: text('theme').default('system'),
  resultsPerPage: integer('results_per_page').default(10),
  defaultSort: text('default_sort').default('relevance'),
  safeSearch: text('safe_search').default('moderate'),
  openInNewTab: text('open_in_new_tab').default('yes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
