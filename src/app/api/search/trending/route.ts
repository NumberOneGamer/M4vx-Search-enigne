import { NextRequest, NextResponse } from 'next/server';
import { getTrendingSearches, getDailyTrends, getRisingSearches } from '@/services/search-intelligence';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'trending';
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  try {
    let results;
    switch (type) {
      case 'daily':
        results = await getDailyTrends(limit);
        break;
      case 'rising':
        results = await getRisingSearches(limit);
        break;
      default:
        results = await getTrendingSearches(limit);
    }
    return NextResponse.json({ results, type, limit });
  } catch (error) {
    console.error('Trending search error:', error);
    return NextResponse.json({ error: 'Failed to fetch trends', results: [], type, limit }, { status: 500 });
  }
}
