import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/db';
import { domains } from '@/db/schema/domains';
import { pages } from '@/db/schema/pages';
import { eq, desc, asc, sql, and } from 'drizzle-orm';
import { domainSchema } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin access required', statusCode: 403 },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
  const sort = searchParams.get('sort') || 'name';
  const order = searchParams.get('order') || 'asc';

  try {
    const sortColumnMap: Record<string, any> = {
      name: domains.name,
      url: domains.url,
      authorityScore: domains.authorityScore,
      crawlRate: domains.crawlRate,
      totalPages: domains.totalPages,
      lastCrawledAt: domains.lastCrawledAt,
      createdAt: domains.createdAt,
    };
    const sortColumn = sortColumnMap[sort] || domains.name;
    const orderBy = order === 'desc' ? desc(sortColumn) : asc(sortColumn);

    const items = await db
      .select({
        id: domains.id,
        url: domains.url,
        name: domains.name,
        authorityScore: domains.authorityScore,
        crawlRate: domains.crawlRate,
        isBlocklisted: domains.isBlocklisted,
        totalPages: domains.totalPages,
        lastCrawledAt: domains.lastCrawledAt,
        createdAt: domains.createdAt,
      })
      .from(domains)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(domains);

    const total = Number(totalResult[0]?.count || 0);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Domains Error', message: 'Failed to fetch domains', statusCode: 500 },
      { status: 500 }
    );
  }
}

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
    const parsed = domainSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', message: parsed.error.errors[0].message, statusCode: 400 },
        { status: 400 }
      );
    }

    const { url, name, authorityScore, crawlRate } = parsed.data;

    const [domain] = await db
      .insert(domains)
      .values({ url, name, authorityScore, crawlRate })
      .returning();

    return NextResponse.json(domain, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { error: 'Domain Error', message: 'Failed to create domain', statusCode: 500 },
      { status: 500 }
    );
  }
}
