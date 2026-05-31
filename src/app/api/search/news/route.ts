import { NextRequest, NextResponse } from 'next/server';
import { searchNews } from '@/services/news-crawler';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const timeFrame = searchParams.get('timeFrame') as any || undefined;
  const category = searchParams.get('category') || undefined;
  const publisher = searchParams.get('publisher') || undefined;
  const sort = (searchParams.get('sort') as any) || 'relevance';

  if (!q.trim()) {
    return NextResponse.json({ results: [], totalResults: 0, page, pageSize });
  }

  try {
    const result = await searchNews({ query: q, page, pageSize, timeFrame, category, publisher, sort });
    return NextResponse.json(result);
  } catch (error) {
    console.error('News search error:', error);
    return NextResponse.json({ error: 'Search failed', results: [], totalResults: 0, page, pageSize }, { status: 500 });
  }
}
