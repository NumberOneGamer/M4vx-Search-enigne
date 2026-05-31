import { pgTable, serial, varchar, text, integer, timestamp, doublePrecision, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { newsPublishers } from './newsPublishers';

export const newsArticles = pgTable('news_articles', {
  id: serial('id').primaryKey(),
  url: varchar('url', { length: 2048 }).notNull().unique(),
  headline: text('headline').notNull(),
  description: text('description'),
  body: text('body'),
  author: varchar('author', { length: 500 }),
  publisherId: integer('publisher_id').references(() => newsPublishers.id),
  publishDate: timestamp('publish_date'),
  updatedDate: timestamp('updated_date'),
  featuredImage: text('featured_image'),
  category: varchar('category', { length: 100 }),
  source: varchar('source', { length: 500 }),
  contentHash: varchar('content_hash', { length: 64 }),
  isIndexed: boolean('is_indexed').default(false),
  indexedAt: timestamp('indexed_at'),
  viewCount: integer('view_count').default(0),
  searchCount: integer('search_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  headlineIdx: index('news_headline_idx').on(table.headline),
  categoryIdx: index('news_category_idx').on(table.category),
  publisherIdx: index('news_publisher_idx').on(table.publisherId),
  publishDateIdx: index('news_publish_date_idx').on(table.publishDate),
  urlIdx: uniqueIndex('news_url_idx').on(table.url),
  contentHashIdx: index('news_content_hash_idx').on(table.contentHash),
}));

export const newsArticlesRelations = relations(newsArticles, ({ one }) => ({
  publisher: one(newsPublishers, {
    fields: [newsArticles.publisherId],
    references: [newsPublishers.id],
  }),
}));
