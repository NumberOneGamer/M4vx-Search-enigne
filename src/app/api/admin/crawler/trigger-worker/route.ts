import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

const WORKERS = {
  crawler: { url: 'https://m4vx-crawler.siefmahmoud020202.workers.dev', secret: 'CRAWLER_SECRET' },
  'extractor-news': { url: 'https://m4vx-extractor-news.siefmahmoud020202.workers.dev', secret: 'EXTRACTOR_SECRET' },
  'extractor-images': { url: 'https://m4vx-extractor-images.siefmahmoud020202.workers.dev', secret: 'EXTRACTOR_SECRET' },
  'extractor-videos': { url: 'https://m4vx-extractor-videos.siefmahmoud020202.workers.dev', secret: 'EXTRACTOR_SECRET' },
};

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json({ error: 'Forbidden', message: 'Admin access required', statusCode: 403 }, { status: 403 });
  }

  try {
    const { worker, limit } = await request.json().catch(() => ({}));
    const workers = WORKERS as Record<string, { url: string; secret: string }>;
    if (!worker || !workers[worker]) {
      return NextResponse.json({ error: `Unknown worker: ${worker}` }, { status: 400 });
    }
    const w = workers[worker];
    const key = process.env[w.secret];
    if (!key) {
      return NextResponse.json({ error: `Secret ${w.secret} not configured` }, { status: 500 });
    }
    const url = `${w.url}/?key=${key}${limit ? `&limit=${limit}` : ''}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Trigger Error', message: detail }, { status: 500 });
  }
}
