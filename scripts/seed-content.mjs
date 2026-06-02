import { db } from '../src/db/index.ts';
import { pages } from '../src/db/schema/pages.ts';
import { newsArticles } from '../src/db/schema/newsArticles.ts';
import { images } from '../src/db/schema/images.ts';
import { videos } from '../src/db/schema/videos.ts';
import { eq, isNull, sql, count } from 'drizzle-orm';

async function main() {
  console.log('Checking current content counts...');
  const [pCount] = await db.select({ count: count() }).from(pages);
  const [nCount] = await db.select({ count: count() }).from(newsArticles);
  const [iCount] = await db.select({ count: count() }).from(images);
  const [vCount] = await db.select({ count: count() }).from(videos);
  console.log(`Pages: ${pCount?.count ?? 0}, News: ${nCount?.count ?? 0}, Images: ${iCount?.count ?? 0}, Videos: ${vCount?.count ?? 0}`);

  const recentPages = await db
    .select({ id: pages.id, url: pages.url, title: pages.title, content: pages.content, metaDescription: pages.metaDescription })
    .from(pages)
    .orderBy(sql`RANDOM()`)
    .limit(20);

  console.log(`\nSeeding from ${recentPages.length} recent pages...`);

  let newsAdded = 0, imagesAdded = 0, videosAdded = 0;

  for (const p of recentPages) {
    const hasNewsMeta = (p.content || '').toLowerCase().includes('published') || 
      (p.content || '').toLowerCase().includes('article') ||
      (p.content || '').toLowerCase().includes('author');
    if (hasNewsMeta) {
      try {
        await db.insert(newsArticles).values({
          url: p.url,
          headline: p.title || 'Untitled',
          description: p.metaDescription || null,
          body: (p.content || '').slice(0, 10000),
          isIndexed: false,
        }).onConflictDoNothing({ target: newsArticles.url });
        newsAdded++;
      } catch {}
    }

    const imgCount = (p.content || '').match(/<img[^>]+src=["']([^"']+)["']/gi)?.length || 0;
    if (imgCount > 0) {
      try {
        const imgs = [...(p.content || '').matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["']/gi)].slice(0, 3);
        for (const m of imgs) {
          const src = m[1];
          const alt = m[2] || '';
          if (src && !src.startsWith('data:')) {
            try {
              const absUrl = new URL(src, p.url).href;
              await db.insert(images).values({
                url: absUrl,
                altText: alt || null,
                pageTitle: p.title || null,
                pageUrl: p.url,
                isIndexed: false,
              }).onConflictDoNothing({ target: images.url });
              imagesAdded++;
            } catch {}
          }
        }
      } catch {}
    }

    const hasVideo = (p.content || '').toLowerCase().includes('youtube') || 
      (p.content || '').toLowerCase().includes('video') ||
      (p.content || '').includes('iframe');
    if (hasVideo) {
      try {
        const videoUrl = p.content?.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/)?.[0] || 
          p.content?.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)?.[0] || null;
        if (videoUrl) {
          const absUrl = videoUrl.startsWith('http') ? videoUrl : `https://${videoUrl}`;
          await db.insert(videos).values({
            url: absUrl,
            title: p.title || 'Untitled',
            pageUrl: p.url,
            isIndexed: false,
          }).onConflictDoNothing({ target: videos.url });
          videosAdded++;
        }
      } catch {}
    }
  }

  console.log(`\nSeeding complete:`);
  console.log(`  News articles added: ${newsAdded}`);
  console.log(`  Images added: ${imagesAdded}`);
  console.log(`  Videos added: ${videosAdded}`);

  process.exit(0);
}

main().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});
