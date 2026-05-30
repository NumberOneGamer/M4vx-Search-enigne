import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/db';
import { domains } from '@/db/schema/domains';
import { eq, sql, asc, desc } from 'drizzle-orm';
import { z } from 'zod';

const blocklistSchema = z.object({
  domainId: z.number().int().positive(),
  blocklisted: z.boolean(),
  reason: z.string().max(500).optional(),
});

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

  try {
    const items = await db
      .select()
      .from(domains)
      .where(eq(domains.isBlocklisted, true))
      .orderBy(desc(domains.updatedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(domains)
      .where(eq(domains.isBlocklisted, true));

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
      { error: 'Blocklist Error', message: 'Failed to fetch blocklist', statusCode: 500 },
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
    const parsed = blocklistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', message: parsed.error.errors[0].message, statusCode: 400 },
        { status: 400 }
      );
    }

    const { domainId, blocklisted, reason } = parsed.data;

    const [domain] = await db
      .update(domains)
      .set({
        isBlocklisted: blocklisted,
        blocklistReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(domains.id, domainId))
      .returning();

    return NextResponse.json(domain);

  } catch (error) {
    return NextResponse.json(
      { error: 'Blocklist Error', message: 'Failed to update domain', statusCode: 500 },
      { status: 500 }
    );
  }
}
