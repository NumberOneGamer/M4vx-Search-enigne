import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/db';
import { crawlQueue } from '@/db/schema/crawlQueue';
import { eq } from 'drizzle-orm';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin access required', statusCode: 403 },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    await db.delete(crawlQueue).where(eq(crawlQueue.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Queue Error', message: 'Failed to delete queue item', statusCode: 500 },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin access required', statusCode: 403 },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.status) updates.status = body.status;
    if (typeof body.priority === 'number') updates.priority = body.priority;
    if (body.errorMessage !== undefined) updates.errorMessage = body.errorMessage;
    if (typeof body.attempts === 'number') updates.attempts = body.attempts;

    if (body.status === 'pending') {
      updates.errorMessage = null;
      updates.startedAt = null;
      updates.completedAt = null;
    }

    const [item] = await db
      .update(crawlQueue)
      .set(updates)
      .where(eq(crawlQueue.id, Number(id)))
      .returning();

    if (!item) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Queue item not found', statusCode: 404 },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json(
      { error: 'Queue Error', message: 'Failed to update queue item', statusCode: 500 },
      { status: 500 }
    );
  }
}
