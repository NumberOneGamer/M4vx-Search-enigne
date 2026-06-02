import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { newsArticles } from '@/db/schema/newsArticles';
import { videos } from '@/db/schema/videos';
import { images } from '@/db/schema/images';
import { pages } from '@/db/schema/pages';
import { eq, desc, asc, count } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  const offset = (page - 1) * pageSize;

  switch (type) {
    case 'web': {
      const [totalResult] = await db.select({ count: count() }).from(pages);
      const total = totalResult?.count ?? 0;
      const items = await db
        .select({ id: pages.id, title: pages.title, url: pages.url, metaDescription: pages.metaDescription, createdAt: pages.createdAt })
        .from(pages)
        .orderBy(desc(pages.createdAt))
        .limit(pageSize)
        .offset(offset);
      return NextResponse.json({ items, total, page, pageSize, type });
    }
    case 'news': {
      const [totalResult] = await db.select({ count: count() }).from(newsArticles);
      const total = totalResult?.count ?? 0;
      const items = await db
        .select({ id: newsArticles.id, headline: newsArticles.headline, url: newsArticles.url, category: newsArticles.category, isIndexed: newsArticles.isIndexed, createdAt: newsArticles.createdAt })
        .from(newsArticles)
        .orderBy(desc(newsArticles.createdAt))
        .limit(pageSize)
        .offset(offset);
      return NextResponse.json({ items, total, page, pageSize, type });
    }
    case 'videos': {
      const [totalResult] = await db.select({ count: count() }).from(videos);
      const total = totalResult?.count ?? 0;
      const items = await db
        .select({ id: videos.id, title: videos.title, url: videos.url, channelName: videos.channelName, isIndexed: videos.isIndexed, createdAt: videos.createdAt })
        .from(videos)
        .orderBy(desc(videos.createdAt))
        .limit(pageSize)
        .offset(offset);
      return NextResponse.json({ items, total, page, pageSize, type });
    }
    case 'images': {
      const [totalResult] = await db.select({ count: count() }).from(images);
      const total = totalResult?.count ?? 0;
      const items = await db
        .select({ id: images.id, url: images.url, altText: images.altText, pageTitle: images.pageTitle, mimeType: images.mimeType, createdAt: images.createdAt })
        .from(images)
        .orderBy(desc(images.createdAt))
        .limit(pageSize)
        .offset(offset);
      return NextResponse.json({ items, total, page, pageSize, type });
    }
    default: {
      const [webTotal] = await db.select({ count: count() }).from(pages);
      const [newsTotal] = await db.select({ count: count() }).from(newsArticles);
      const [videoTotal] = await db.select({ count: count() }).from(videos);
      const [imageTotal] = await db.select({ count: count() }).from(images);
      return NextResponse.json({
        counts: {
          web: webTotal?.count ?? 0,
          news: newsTotal?.count ?? 0,
          videos: videoTotal?.count ?? 0,
          images: imageTotal?.count ?? 0,
        },
      });
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, action, ids } = body;

    if (!type || !action || !ids?.length) {
      return NextResponse.json({ error: 'type, action, and ids are required' }, { status: 400 });
    }

    let affected = 0;

    if (action === 'delete') {
      switch (type) {
        case 'news':
          await db.delete(newsArticles).where(eq(newsArticles.id, ids[0]));
          break;
        case 'videos':
          await db.delete(videos).where(eq(videos.id, ids[0]));
          break;
        case 'images':
          await db.delete(images).where(eq(images.id, ids[0]));
          break;
      }
      affected = 1;
    }

    if (action === 'reindex') {
      switch (type) {
        case 'news':
          await db.update(newsArticles).set({ isIndexed: false, indexedAt: null }).where(eq(newsArticles.id, ids[0]));
          break;
        case 'videos':
          await db.update(videos).set({ isIndexed: false, indexedAt: null }).where(eq(videos.id, ids[0]));
          break;
        case 'images':
          await db.update(images).set({ isIndexed: false, indexedAt: null }).where(eq(images.id, ids[0]));
          break;
      }
      affected = 1;
    }

    return NextResponse.json({ success: true, affected });
  } catch (error) {
    console.error('Content management error:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
