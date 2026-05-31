import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { newsPublishers } from '@/db/schema/newsPublishers';
import { eq } from 'drizzle-orm';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updateData: Record<string, any> = {};

    if (body.isApproved !== undefined) updateData.isApproved = body.isApproved;
    if (body.isBanned !== undefined) updateData.isBanned = body.isBanned;
    if (body.banReason !== undefined) updateData.banReason = body.banReason;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;

    const [updated] = await db
      .update(newsPublishers)
      .set(updateData)
      .where(eq(newsPublishers.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Publisher not found' }, { status: 404 });
    }

    return NextResponse.json({ publisher: updated });
  } catch (error) {
    console.error('Update publisher error:', error);
    return NextResponse.json({ error: 'Failed to update publisher' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const [deleted] = await db
      .delete(newsPublishers)
      .where(eq(newsPublishers.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Publisher not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete publisher error:', error);
    return NextResponse.json({ error: 'Failed to delete publisher' }, { status: 500 });
  }
}
