import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { addSeedUrls, enqueueFromSitemap, getCrawlStats } from '@/services/crawler';

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json({ error: 'Forbidden', statusCode: 403 }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const seeds = body.seeds || process.env.CRAWLER_SEED_URLS?.split(',') || [];
    const sitemapDomains = body.sitemapDomains || [];
    const seedDepth = typeof body.depth === 'number' ? body.depth : 2;

    let seededCount = 0;
    let sitemapCount = 0;

    if (seeds.length > 0) {
      await addSeedUrls(seeds, seedDepth);
      seededCount = seeds.length;
    }

    for (const domain of sitemapDomains) {
      const added = await enqueueFromSitemap(domain);
      sitemapCount += added;
    }

    const stats = await getCrawlStats();

    return NextResponse.json({
      seeded: seededCount,
      sitemapEnqueued: sitemapCount,
      stats,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Seeder Error', detail, statusCode: 500 }, { status: 500 });
  }
}
