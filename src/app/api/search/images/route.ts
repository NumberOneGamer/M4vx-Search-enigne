import { NextRequest, NextResponse } from 'next/server';
import { searchImages, getRelatedImages } from '@/services/image-indexer';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const size = searchParams.get('size') as any || undefined;
  const orientation = searchParams.get('orientation') as any || undefined;
  const color = searchParams.get('color') || undefined;
  const imageType = searchParams.get('imageType') as any || undefined;
  const sort = (searchParams.get('sort') as any) || 'relevance';
  const imageId = searchParams.get('imageId') ? parseInt(searchParams.get('imageId')!, 10) : undefined;

  if (imageId) {
    const related = await getRelatedImages(imageId);
    return NextResponse.json({ related });
  }

  if (!q.trim()) {
    return NextResponse.json({ results: [], totalResults: 0, page, pageSize });
  }

  try {
    const result = await searchImages({ query: q, page, pageSize, size, orientation, color, imageType, sort });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Image search error:', error);
    return NextResponse.json({ error: 'Search failed', results: [], totalResults: 0, page, pageSize }, { status: 500 });
  }
}
