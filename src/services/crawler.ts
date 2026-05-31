import { fileURLToPath } from 'url';
import { db } from '@/db';
import { domains } from '@/db/schema/domains';
import { pages } from '@/db/schema/pages';
import { crawlQueue } from '@/db/schema/crawlQueue';
import { backlinks } from '@/db/schema/backlinks';
import { eq, and, sql, inArray, isNull, lt, or, desc } from 'drizzle-orm';
import { checkRobotsTxt, normalizeUrl, isValidUrl, shouldCrawl } from '@/lib/crawler/robots';
import { waitForRateLimit } from '@/lib/crawler/rate-limiter';

const USER_AGENT = process.env.CRAWLER_USER_AGENT || 'SearchEngineBot/1.0';
const MAX_DEPTH = parseInt(process.env.CRAWLER_MAX_DEPTH || '3', 10);
const MAX_PAGES_PER_DOMAIN = parseInt(process.env.CRAWLER_MAX_PAGES_PER_DOMAIN || '10000', 10);
const CONCURRENCY = parseInt(process.env.CRAWLER_CONCURRENCY || '5', 10);

async function getOrCreateDomain(url: string): Promise<number> {
  const hostname = new URL(url).hostname;
  const existing = await db
    .select()
    .from(domains)
    .where(eq(domains.url, hostname))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const [domain] = await db
    .insert(domains)
    .values({
      url: hostname,
      name: hostname,
      authorityScore: 1.0,
    })
    .returning();

  return domain.id;
}

async function addToQueue(domainId: number, url: string, depth: number, priority = 0): Promise<void> {
  const normalizedUrl = normalizeUrl(url);

  const existing = await db
    .select()
    .from(crawlQueue)
    .where(and(eq(crawlQueue.url, normalizedUrl), eq(crawlQueue.status, 'pending')))
    .limit(1);

  if (existing.length > 0) return;

  const existingPage = await db
    .select()
    .from(pages)
    .where(eq(pages.url, normalizedUrl))
    .limit(1);

  if (existingPage.length > 0) return;

  await db
    .insert(crawlQueue)
    .values({
      domainId,
      url: normalizedUrl,
      depth,
      priority,
      status: 'pending',
    })
    .onConflictDoNothing({ target: crawlQueue.url });
}

async function processUrl(queueItem: typeof crawlQueue.$inferSelect): Promise<void> {
  const { domainId, url, depth } = queueItem;

  await db
    .update(crawlQueue)
    .set({ status: 'running', startedAt: new Date() })
    .where(eq(crawlQueue.id, queueItem.id));

  try {
    const domain = new URL(url).hostname;

    const { allowed, delay } = await checkRobotsTxt(domain, url, USER_AGENT);
    if (!allowed) {
      await db
        .update(crawlQueue)
        .set({
          status: 'failed',
          errorMessage: 'Blocked by robots.txt',
          completedAt: new Date(),
        })
        .where(eq(crawlQueue.id, queueItem.id));
      return;
    }

    await waitForRateLimit(domain, delay * 1000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });

    const html = await response.text();
    const { parseHtml: parseHtmlFn } = await import('@/lib/crawler/parser');
    const parsed = parseHtmlFn(html, url);

    const pageCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(pages)
      .where(eq(pages.domainId, domainId))
      .limit(1);

    if (Number(pageCount[0]?.count || 0) >= MAX_PAGES_PER_DOMAIN) {
      await db
        .update(crawlQueue)
        .set({
          status: 'completed',
          errorMessage: 'Max pages per domain reached',
          completedAt: new Date(),
        })
        .where(eq(crawlQueue.id, queueItem.id));
      return;
    }

    const existingPage = await db
      .select()
      .from(pages)
      .where(eq(pages.url, url))
      .limit(1);

    if (existingPage.length > 0) {
      await db
        .update(pages)
        .set({
          title: parsed.title,
          metaDescription: parsed.metaDescription,
          headings: parsed.headings.join('\n'),
          content: parsed.content,
          wordCount: parsed.wordCount,
          contentHash: parsed.contentHash,
          httpStatus: response.status,
          crawledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pages.id, existingPage[0].id));
    } else {
      await db
        .insert(pages)
        .values({
          domainId,
          url,
          title: parsed.title,
          metaDescription: parsed.metaDescription,
          headings: parsed.headings.join('\n'),
          content: parsed.content,
          wordCount: parsed.wordCount,
          contentHash: parsed.contentHash,
          httpStatus: response.status,
          contentType: parsed.contentType,
          crawlDepth: depth,
          crawledAt: new Date(),
        });
    }

    if (depth < MAX_DEPTH) {
      const allLinks = [...parsed.internalLinks, ...parsed.externalLinks];
      const filteredLinks = allLinks.filter(
        (link) => isValidUrl(link) && shouldCrawl(link)
      );

      for (const link of filteredLinks) {
        const linkDomainId = await getOrCreateDomain(link);
        const linkDepth = depth + 1;
        const linkPriority = parsed.internalLinks.includes(link) ? 1 : 0;
        await addToQueue(linkDomainId, link, linkDepth, linkPriority);
      }

      for (const link of parsed.internalLinks) {
        const [sourcePage] = await db
          .select()
          .from(pages)
          .where(eq(pages.url, url))
          .limit(1);

        const [targetPage] = await db
          .select()
          .from(pages)
          .where(eq(pages.url, link))
          .limit(1);

        if (sourcePage && targetPage) {
          await db
            .insert(backlinks)
            .values({
              sourcePageId: sourcePage.id,
              targetPageId: targetPage.id,
              sourceUrl: url,
              targetUrl: link,
              isExternal: 'internal',
            })
            .onConflictDoNothing({});
        }
      }
    }

    await db
      .update(crawlQueue)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(crawlQueue.id, queueItem.id));

    await db
      .update(domains)
      .set({ lastCrawledAt: new Date() })
      .where(eq(domains.id, domainId));

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const attempts = queueItem.attempts + 1;

    if (attempts >= queueItem.maxAttempts) {
      await db
        .update(crawlQueue)
        .set({
          status: 'failed',
          errorMessage: message,
          attempts,
          completedAt: new Date(),
        })
        .where(eq(crawlQueue.id, queueItem.id));
    } else {
      await db
        .update(crawlQueue)
        .set({
          status: 'pending',
          errorMessage: message,
          attempts,
          scheduledAt: new Date(Date.now() + Math.pow(2, attempts) * 60000),
        })
        .where(eq(crawlQueue.id, queueItem.id));
    }
  }
}

async function getNextBatch(limit = CONCURRENCY): Promise<typeof crawlQueue.$inferSelect[]> {
  return db
    .select()
    .from(crawlQueue)
    .where(
      and(
        eq(crawlQueue.status, 'pending'),
        or(isNull(crawlQueue.scheduledAt), lt(crawlQueue.scheduledAt, new Date()))
      )
    )
    .orderBy(desc(crawlQueue.priority), sql`RANDOM()`)
    .limit(limit);
}

async function crawlLoop(): Promise<void> {
  console.log('[Crawler] Starting crawl loop...');

  while (true) {
    try {
      const batch = await getNextBatch();
      if (batch.length === 0) {
        console.log('[Crawler] No URLs to crawl, waiting 10s...');
        await new Promise((resolve) => setTimeout(resolve, 10000));
        continue;
      }

      console.log(`[Crawler] Processing ${batch.length} URLs...`);
      await Promise.all(batch.map(processUrl));
      console.log(`[Crawler] Completed batch of ${batch.length} URLs`);

    } catch (error) {
      console.error('[Crawler] Error in crawl loop:', error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

export async function startCrawler(): Promise<void> {
  console.log('[Crawler] Initializing...');
  await crawlLoop();
}

export async function processBatch(batchSize = CONCURRENCY): Promise<{ processed: number; completed: number; failed: number }> {
  const batch = await getNextBatch(batchSize);
  const limited = batch.slice(0, batchSize);
  if (limited.length === 0) return { processed: 0, completed: 0, failed: 0 };

  const results = await Promise.allSettled(limited.map(processUrl));
  const completed = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return { processed: limited.length, completed, failed };
}

export async function addSeedUrls(urls: string[], depth = 2): Promise<void> {
  for (const url of urls) {
    if (!isValidUrl(url)) {
      console.warn(`[Crawler] Invalid URL: ${url}`);
      continue;
    }

    const normalizedUrl = normalizeUrl(url);
    const domainId = await getOrCreateDomain(normalizedUrl);

    const [existingPage] = await db
      .select()
      .from(pages)
      .where(eq(pages.url, normalizedUrl))
      .limit(1);

    const [existingQueue] = await db
      .select()
      .from(crawlQueue)
      .where(and(eq(crawlQueue.url, normalizedUrl), eq(crawlQueue.status, 'pending')))
      .limit(1);

    if (!existingPage && !existingQueue) {
      await db.insert(crawlQueue).values({
        domainId,
        url: normalizedUrl,
        depth: 0,
        priority: 10,
        status: 'pending',
      });
      console.log(`[Crawler] Added seed URL: ${normalizedUrl}`);
    }
  }
}

export async function getCrawlStats(): Promise<{
  queueSize: number;
  completed: number;
  failed: number;
  running: number;
  totalPages: number;
}> {
  const [queueSize] = await db
    .select({ count: sql<number>`count(*)` })
    .from(crawlQueue)
    .where(eq(crawlQueue.status, 'pending'));

  const [completed] = await db
    .select({ count: sql<number>`count(*)` })
    .from(crawlQueue)
    .where(eq(crawlQueue.status, 'completed'));

  const [failed] = await db
    .select({ count: sql<number>`count(*)` })
    .from(crawlQueue)
    .where(eq(crawlQueue.status, 'failed'));

  const [running] = await db
    .select({ count: sql<number>`count(*)` })
    .from(crawlQueue)
    .where(eq(crawlQueue.status, 'running'));

  const [totalPages] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pages);

  return {
    queueSize: Number(queueSize?.count || 0),
    completed: Number(completed?.count || 0),
    failed: Number(failed?.count || 0),
    running: Number(running?.count || 0),
    totalPages: Number(totalPages?.count || 0),
  };
}

try {
  if (typeof process !== 'undefined' && process.argv && process.argv[1] &&
      (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('crawler.ts'))) {
    const defaultSeeds = process.env.CRAWLER_SEED_URLS
      ? process.env.CRAWLER_SEED_URLS.split(',')
      : [
          'https://developer.mozilla.org/en-US/docs/Web',
          'https://en.wikipedia.org/wiki/Search_engine',
          'https://nodejs.org/en/learn',
        ];

    addSeedUrls(defaultSeeds).then(() => startCrawler()).catch(console.error);
  }
} catch {
  // CLI auto-start not supported in this environment
}
