import { pgTable, serial, varchar, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const searchTerms = pgTable('search_terms', {
  id: serial('id').primaryKey(),
  term: varchar('term', { length: 500 }).notNull().unique(),
  language: varchar('language', { length: 10 }).default('en'),
  frequency: integer('frequency').notNull().default(1),
  resultCount: integer('result_count').default(0),
  isTrending: varchar('is_trending', { length: 10 }).default('no'),
  lastSearchedAt: timestamp('last_searched_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  termIdx: index('st_term_idx').on(table.term),
  frequencyIdx: index('st_frequency_idx').on(table.frequency),
}));

export type SearchTerm = typeof searchTerms.$inferSelect;
export type NewSearchTerm = typeof searchTerms.$inferInsert;
