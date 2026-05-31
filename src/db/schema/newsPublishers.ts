import { pgTable, serial, varchar, text, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { newsArticles } from './newsArticles';

export const newsPublishers = pgTable('news_publishers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  url: varchar('url', { length: 2048 }).notNull().unique(),
  logoUrl: text('logo_url'),
  domainUrl: varchar('domain_url', { length: 2048 }),
  isApproved: boolean('is_approved').default(false),
  isBanned: boolean('is_banned').default(false),
  banReason: text('ban_reason'),
  totalArticles: integer('total_articles').default(0),
  totalViews: integer('total_views').default(0),
  lastArticleAt: timestamp('last_article_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  urlIdx: index('publisher_url_idx').on(table.url),
  nameIdx: index('publisher_name_idx').on(table.name),
}));

export const newsPublishersRelations = relations(newsPublishers, ({ many }) => ({
  articles: many(newsArticles),
}));
