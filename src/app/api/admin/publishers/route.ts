import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { newsPublishers } from '@/db/schema/newsPublishers';
import { newsArticles } from '@/db/schema/newsArticles';
import { eq, desc, count, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const status = searchParams.get('status');

  const conditions = [];
  if (status === 'approved') conditions.push(eq(newsPublishers.isApproved, true));
  if (status === 'banned') conditions.push(eq(newsPublishers.isBanned, true));
  if (status === 'pending') conditions.push(eq(newsPublishers.isApproved, false));

  const whereClause = conditions.length > 0 ? conditions.reduce((a, b) => a && b ? a : a) : undefined;

  const [totalResult] = await db
    .select({ count: count() })
    .from(newsPublishers);

  const total = totalResult?.count ?? 0;
  const offset = (page - 1) * pageSize;

  const publishers = await db
    .select({
      id: newsPublishers.id,
      name: newsPublishers.name,
      url: newsPublishers.url,
      logoUrl: newsPublishers.logoUrl,
      isApproved: newsPublishers.isApproved,
      isBanned: newsPublishers.isBanned,
      banReason: newsPublishers.banReason,
      totalArticles: newsPublishers.totalArticles,
      totalViews: newsPublishers.totalViews,
      lastArticleAt: newsPublishers.lastArticleAt,
      createdAt: newsPublishers.createdAt,
    })
    .from(newsPublishers)
    .orderBy(desc(newsPublishers.totalArticles))
    .limit(pageSize)
    .offset(offset);

  return NextResponse.json({ publishers, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, logoUrl, domainUrl } = body;

    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
    }

    const [publisher] = await db
      .insert(newsPublishers)
      .values({ name, url, logoUrl, domainUrl })
      .returning();

    return NextResponse.json({ publisher }, { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Publisher already exists' }, { status: 409 });
    }
    console.error('Create publisher error:', error);
    return NextResponse.json({ error: 'Failed to create publisher' }, { status: 500 });
  }
}
