// @ts-nocheck
import { processBatch, getCrawlStats, addSeedUrls, enqueueFromSitemap } from '../src/services/crawler';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.searchParams.get('key') !== process.env.CRAWLER_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      // ── SEEDER: Just enqueue URLs (cron-safe) ──
      if (url.pathname === '/seed') {
        const urls = (url.searchParams.get('urls') || '').split(',').filter(Boolean);
        const depth = parseInt(url.searchParams.get('depth') || '2', 10);
        const sitemapDomains = (url.searchParams.get('sitemaps') || '').split(',').filter(Boolean);
        const seeds = urls.length > 0 ? urls : (process.env.CRAWLER_SEED_URLS || '').split(',').filter(Boolean);

        let seeded = 0;
        let enqueued = 0;
        if (seeds.length > 0) {
          await addSeedUrls(seeds, depth);
          seeded = seeds.length;
        }
        for (const domain of sitemapDomains) {
          const added = await enqueueFromSitemap(domain.trim());
          enqueued += added;
        }
        const stats = await getCrawlStats();
        return new Response(JSON.stringify({ seeded, sitemapEnqueued: enqueued, stats }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // ── CONSUMER: Process batch from queue ──
      const batchSize = parseInt(url.searchParams.get('batch') || '20', 10);
      const result = await processBatch(batchSize);
      const stats = await getCrawlStats();
      return new Response(JSON.stringify({ result, stats }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
