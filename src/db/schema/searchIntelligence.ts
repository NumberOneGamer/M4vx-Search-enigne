import { pgTable, serial, varchar, text, integer, timestamp, doublePrecision, index } from 'drizzle-orm/pg-core';

export const searchIntelligence = pgTable('search_intelligence', {
  id: serial('id').primaryKey(),
  term: varchar('term', { length: 500 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('trending'),
  frequency: integer('frequency').default(1),
  score: doublePrecision('score').default(0),
  period: varchar('period', { length: 20 }),
  expiresAt: timestamp('expires_at'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  termTypeIdx: index('si_term_type_idx').on(table.term, table.type),
  typeIdx: index('si_type_idx').on(table.type),
  scoreIdx: index('si_score_idx').on(table.score),
  periodIdx: index('si_period_idx').on(table.period),
}));
