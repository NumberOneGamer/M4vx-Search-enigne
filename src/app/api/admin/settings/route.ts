import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/db';
import { settings } from '@/db/schema/settings';
import { eq, sql } from 'drizzle-orm';
import { settingsSchema } from '@/lib/validation';
import { cacheDeletePattern } from '@/lib/cache';

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
    const items = await db
      .select()
      .from(settings)
      .orderBy(settings.category, settings.key);

    return NextResponse.json(items);

  } catch (error) {
    return NextResponse.json(
      { error: 'Settings Error', message: 'Failed to fetch settings', statusCode: 500 },
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
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', message: parsed.error.errors[0].message, statusCode: 400 },
        { status: 400 }
      );
    }

    const { key, value, description, category } = parsed.data;

    const [setting] = await db
      .insert(settings)
      .values({ key, value, description, category })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, description, category, updatedAt: new Date() },
      })
      .returning();

    await cacheDeletePattern(`*${key}*`);

    return NextResponse.json(setting, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { error: 'Settings Error', message: 'Failed to save setting', statusCode: 500 },
      { status: 500 }
    );
  }
}
