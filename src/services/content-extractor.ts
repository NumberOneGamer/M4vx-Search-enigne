import { db } from '@/db';
import { pages } from '@/db/schema/pages';
import { newsArticles } from '@/db/schema/newsArticles';
import { newsPublishers } from '@/db/schema/newsPublishers';
import { videos } from '@/db/schema/videos';
import { images } from '@/db/schema/images';
import { eq, sql, and, isNull, isNotNull, desc } from 'drizzle-orm';

const VIDEO_PLATFORMS = [
  { host: 'youtube.com', extract: (url: string) => { const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/); return m ? `https://www.youtube.com/embed/${m[1]}` : null; } },
  { host: 'youtu.be', extract: (url: string) => { const m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/); return m ? `https://www.youtube.com/embed/${m[1]}` : null; } },
  { host: 'vimeo.com', extract: (url: string) => { const m = url.match(/vimeo\.com\/(\d+)/); return m ? `https://player.vimeo.com/video/${m[1]}` : null; } },
  { host: 'dailymotion.com', extract: (url: string) => { const m = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/); return m ? `https://www.dailymotion.com/embed/video/${m[1]}` : null; } },
];

function extractNewsMeta(html: string | null) {
  if (!html) return {};
  const author = html.match(/<meta[^>]+name="author"[^>]+content="([^"]+)"/i)?.[1]
    || html.match(/<meta[^>]+property="article:author"[^>]+content="([^"]+)"/i)?.[1]
    || null;
  const publishedTime = html.match(/<meta[^>]+property="article:published_time"[^>]+content="([^"]+)"/i)?.[1]
    || html.match(/<meta[^>]+name="date"[^>]+content="([^"]+)"/i)?.[1]
    || null;
  const category = html.match(/<meta[^>]+property="article:section"[^>]+content="([^"]+)"/i)?.[1]
    || null;
  const publisher = html.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i)?.[1]
    || null;
  return { author, publishedTime, category, publisher };
}

function extractImagesFromHtml(html: string | null, baseUrl: string): Array<{ url: string; altText: string | null; width: number | null; height: number | null }> {
  if (!html) return [];
  const imgs: Array<{ url: string; altText: string | null; width: number | null; height: number | null }> = [];
  const regex = /<img[^>]+src\s*=\s*"([^"]+)"[^>]*>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const src = m[1];
    if (!src || src.startsWith('data:') || src.includes('logo') || src.includes('icon') || src.includes('avatar')) continue;
    try {
      const absUrl = new URL(src, baseUrl).href;
      const alt = m[0].match(/alt\s*=\s*"([^"]*)"/i)?.[1] || null;
      const width = m[0].match(/width\s*=\s*"?(\d+)"?/i) ? parseInt(m[0].match(/width\s*=\s*"?(\d+)"?/i)![1]) : null;
      const height = m[0].match(/height\s*=\s*"?(\d+)"?/i) ? parseInt(m[0].match(/height\s*=\s*"?(\d+)"?/i)![1]) : null;
      imgs.push({ url: absUrl, altText: alt, width, height });
    } catch { continue; }
  }
  return imgs;
}

function extractVideosFromHtml(html: string | null, baseUrl: string): Array<{ url: string; title: string | null; embedUrl: string | null }> {
  if (!html) return [];
  const vids: Array<{ url: string; title: string | null; embedUrl: string | null }> = [];

  const iframeRegex = /<iframe[^>]+src\s*=\s*"([^"]+)"[^>]*>[\s\S]*?<\/iframe>/gi;
  let m;
  while ((m = iframeRegex.exec(html)) !== null) {
    const src = m[1];
    try {
      const absUrl = new URL(src, baseUrl).href;
      const host = new URL(absUrl).hostname.replace('www.', '');
      const platform = VIDEO_PLATFORMS.find((p) => host.includes(p.host));
      vids.push({ url: absUrl, title: null, embedUrl: platform?.extract(absUrl) || absUrl });
    } catch { continue; }
  }

  const linkRegex = /<a[^>]+href\s*=\s*"([^"]+)"[^>]*>(.*?)<\/a>/gi;
  while ((m = linkRegex.exec(html)) !== null) {
    const href = m[1];
    try {
      const absUrl = new URL(href, baseUrl).href;
      const host = new URL(absUrl).hostname.replace('www.', '');
      const platform = VIDEO_PLATFORMS.find((p) => host.includes(p.host));
      if (platform) {
        const alreadyExists = vids.some((v) => v.url === absUrl);
        if (!alreadyExists) {
          vids.push({ url: absUrl, title: stripTags(m[2]) || null, embedUrl: platform.extract(absUrl) });
        }
      }
    } catch { continue; }
  }

  return vids;
}

function stripTags(t: string | null): string {
  return (t || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

async function extractNewsFromPage(page: typeof pages.$inferSelect, html: string | null): Promise<void> {
  if (!page.content || page.wordCount && page.wordCount < 100) return;

  const [existing] = await db
    .select({ id: newsArticles.id })
    .from(newsArticles)
    .where(eq(newsArticles.url, page.url))
    .limit(1);
  if (existing) return;

  const meta = extractNewsMeta(html);
  if (!meta.publishedTime && page.contentType !== 'article') return;

  let publisherId: number | null = null;
  if (meta.publisher) {
    const domainName = new URL(page.url).hostname;
    const [existingPub] = await db
      .select({ id: newsPublishers.id })
      .from(newsPublishers)
      .where(eq(newsPublishers.name, meta.publisher))
      .limit(1);
    if (existingPub) {
      publisherId = existingPub.id;
    } else {
      const [newPub] = await db
        .insert(newsPublishers)
        .values({ name: meta.publisher, url: domainName, isApproved: false })
        .returning({ id: newsPublishers.id });
      publisherId = newPub.id;
    }
  }

  await db
    .insert(newsArticles)
    .values({
      url: page.url,
      headline: page.title || 'Untitled',
      description: page.metaDescription || page.content.slice(0, 300),
      body: page.content,
      author: meta.author,
      publisherId,
      publishDate: meta.publishedTime ? new Date(meta.publishedTime) : page.crawledAt,
      category: meta.category,
      contentHash: page.contentHash,
      isIndexed: true,
      indexedAt: new Date(),
    })
    .onConflictDoNothing({ target: newsArticles.url });
}

async function extractImagesFromPage(page: typeof pages.$inferSelect, html: string | null): Promise<void> {
  const pageImages = extractImagesFromHtml(html, page.url);
  if (pageImages.length === 0) return;

  for (const img of pageImages) {
    const [existing] = await db
      .select({ id: images.id })
      .from(images)
      .where(eq(images.url, img.url))
      .limit(1);
    if (existing) continue;

    await db
      .insert(images)
      .values({
        url: img.url,
        altText: img.altText,
        pageTitle: page.title,
        pageUrl: page.url,
        contextContent: page.content ? page.content.slice(0, 500) : null,
        width: img.width,
        height: img.height,
      })
      .onConflictDoNothing({ target: images.url });
  }
}

async function extractVideosFromPage(page: typeof pages.$inferSelect, html: string | null): Promise<void> {
  const pageVideos = extractVideosFromHtml(html, page.url);
  if (pageVideos.length === 0) return;

  for (const vid of pageVideos) {
    const [existing] = await db
      .select({ id: videos.id })
      .from(videos)
      .where(eq(videos.url, vid.url))
      .limit(1);
    if (existing) continue;

    await db
      .insert(videos)
      .values({
        url: vid.url,
        title: vid.title || page.title || 'Untitled',
        description: page.metaDescription || null,
        embedUrl: vid.embedUrl,
        source: vid.url.includes('youtube') || vid.url.includes('youtu.be') ? 'youtube' : vid.url.includes('vimeo') ? 'vimeo' : 'other',
        isIndexed: true,
        indexedAt: new Date(),
      })
      .onConflictDoNothing({ target: videos.url });
  }
}

export async function extractContentFromPage(pageId: number): Promise<void> {
  const [page] = await db
    .select()
    .from(pages)
    .where(eq(pages.id, pageId))
    .limit(1);

  if (!page || !page.url) return;

  const html = null;

  await Promise.all([
    extractNewsFromPage(page, html).catch(() => {}),
    extractImagesFromPage(page, html).catch(() => {}),
    extractVideosFromPage(page, html).catch(() => {}),
  ]);
}

export async function extractAllUnprocessedPages(): Promise<number> {
  const unprocessedPages = await db
    .select({ id: pages.id, url: pages.url, title: pages.title, content: pages.content, metaDescription: pages.metaDescription, contentType: pages.contentType, wordCount: pages.wordCount, contentHash: pages.contentHash, crawledAt: pages.crawledAt })
    .from(pages)
    .where(
      and(
        isNotNull(pages.lastIndexedAt),
        isNotNull(pages.content),
      )
    )
    .orderBy(desc(pages.crawledAt))
    .limit(50);

  let processed = 0;
  for (const page of unprocessedPages) {
    const typedPage = page as typeof pages.$inferSelect;
    try {
      await extractNewsFromPage(typedPage, null);
      processed++;
    } catch { continue; }
  }
  return processed;
}

export async function extractImagesFromAllPages(): Promise<number> {
  const recentPages = await db
    .select()
    .from(pages)
    .where(and(isNotNull(pages.lastIndexedAt), isNotNull(pages.content)))
    .orderBy(desc(pages.crawledAt))
    .limit(100);

  let count = 0;
  for (const page of recentPages) {
    try {
      await extractImagesFromPage(page, null);
      count++;
    } catch { continue; }
  }
  return count;
}

export async function extractVideosFromAllPages(): Promise<number> {
  const recentPages = await db
    .select()
    .from(pages)
    .where(and(isNotNull(pages.lastIndexedAt), isNotNull(pages.content)))
    .orderBy(desc(pages.crawledAt))
    .limit(100);

  let count = 0;
  for (const page of recentPages) {
    try {
      await extractVideosFromPage(page, null);
      count++;
    } catch { continue; }
  }
  return count;
}
