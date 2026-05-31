import { pgTable, serial, varchar, text, integer, timestamp, doublePrecision, boolean, index } from 'drizzle-orm/pg-core';

export const images = pgTable('images', {
  id: serial('id').primaryKey(),
  url: varchar('url', { length: 2048 }).notNull().unique(),
  altText: text('alt_text'),
  caption: text('caption'),
  pageTitle: text('page_title'),
  pageUrl: varchar('page_url', { length: 2048 }),
  contextContent: text('context_content'),
  width: integer('width'),
  height: integer('height'),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 50 }),
  dominantColor: varchar('dominant_color', { length: 20 }),
  contentHash: varchar('content_hash', { length: 64 }),
  isIndexed: boolean('is_indexed').default(false),
  indexedAt: timestamp('indexed_at'),
  searchCount: integer('search_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  pageUrlIdx: index('image_page_url_idx').on(table.pageUrl),
  mimeTypeIdx: index('image_mime_type_idx').on(table.mimeType),
  dominantColorIdx: index('image_color_idx').on(table.dominantColor),
  widthIdx: index('image_width_idx').on(table.width),
  heightIdx: index('image_height_idx').on(table.height),
  urlIdx: index('image_url_idx').on(table.url),
}));
