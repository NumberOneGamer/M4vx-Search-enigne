import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { addSeedUrls, getCrawlStats } from '@/services/crawler';
import { crawlRequestSchema } from '@/lib/validation';

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
    const body = await request.json();
    const parsed = crawlRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', message: parsed.error.errors[0].message, statusCode: 400 },
        { status: 400 }
      );
    }

    const { urls, depth } = parsed.data;
    await addSeedUrls(urls, depth);

    return NextResponse.json(
      { message: `Added ${urls.length} URLs to crawl queue`, count: urls.length },
      { status: 202 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: 'Crawl Error', message: 'Failed to start crawl', statusCode: 500 },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin access required', statusCode: 403 },
      { status: 403 }
    );
  }

  try {
    const stats = await getCrawlStats();
    return NextResponse.json(stats);

  } catch (error) {
    return NextResponse.json(
      { error: 'Stats Error', message: 'Failed to fetch crawl stats', statusCode: 500 },
      { status: 500 }
    );
  }
}
