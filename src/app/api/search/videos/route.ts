import { NextRequest, NextResponse } from 'next/server';
import { searchVideos, getRelatedVideos } from '@/services/video-indexer';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '12', 10);
  const duration = searchParams.get('duration') as any || undefined;
  const uploadDate = searchParams.get('uploadDate') as any || undefined;
  const quality = (searchParams.get('quality') as 'hd' | 'fullhd' | '4k' | undefined) || undefined;
  const source = searchParams.get('source') || undefined;
  const sort = (searchParams.get('sort') as any) || 'relevance';
  const videoId = searchParams.get('videoId') ? parseInt(searchParams.get('videoId')!, 10) : undefined;

  if (videoId) {
    const related = await getRelatedVideos(videoId);
    return NextResponse.json({ related });
  }

  if (!q.trim()) {
    return NextResponse.json({ results: [], totalResults: 0, page, pageSize });
  }

  try {
    const result = await searchVideos({ query: q, page, pageSize, duration, uploadDate, quality, source, sort });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Video search error:', error);
    return NextResponse.json({ error: 'Search failed', results: [], totalResults: 0, page, pageSize }, { status: 500 });
  }
}
