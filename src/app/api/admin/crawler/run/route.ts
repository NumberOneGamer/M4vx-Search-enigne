import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { processBatch, getCrawlStats } from '@/services/crawler';

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin access required', statusCode: 403 },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const batchSize = typeof body.batchSize === 'number' ? body.batchSize : undefined;

    const result = await processBatch(batchSize);
    const stats = await getCrawlStats();

    return NextResponse.json({ ...result, stats });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Crawler API] Error:', error);
    return NextResponse.json(
      { error: 'Crawl Error', message: 'Failed to process batch', detail, statusCode: 500 },
      { status: 500 }
    );
  }
}
