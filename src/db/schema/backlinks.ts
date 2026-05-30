import { pgTable, serial, integer, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { pages } from './pages';

export const backlinks = pgTable('backlinks', {
  id: serial('id').primaryKey(),
  sourcePageId: integer('source_page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  targetPageId: integer('target_page_id').references(() => pages.id, { onDelete: 'cascade' }),
  sourceUrl: varchar('source_url', { length: 2048 }).notNull(),
  targetUrl: varchar('target_url', { length: 2048 }).notNull(),
  anchorText: text('anchor_text'),
  relAttributes: varchar('rel_attributes', { length: 255 }),
  isExternal: varchar('is_external', { length: 10 }).notNull().default('internal'),
  discoveredAt: timestamp('discovered_at').notNull().defaultNow(),
}, (table) => ({
  sourceIdx: index('bl_source_idx').on(table.sourcePageId),
  targetIdx: index('bl_target_idx').on(table.targetPageId),
  targetUrlIdx: index('bl_target_url_idx').on(table.targetUrl),
}));

export type Backlink = typeof backlinks.$inferSelect;
export type NewBacklink = typeof backlinks.$inferInsert;
