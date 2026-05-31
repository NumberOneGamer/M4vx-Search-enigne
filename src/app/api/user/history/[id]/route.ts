import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { deleteSearchHistoryItem } from '@/services/user-account';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateUser(request).catch(() => null);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required', statusCode: 401 }, { status: 401 });
  }

  const { id } = await params;
  const historyId = parseInt(id, 10);
  if (isNaN(historyId)) {
    return NextResponse.json({ error: 'Invalid ID', message: 'History ID must be a number', statusCode: 400 }, { status: 400 });
  }

  try {
    await deleteSearchHistoryItem(user.id, historyId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete history item', message: 'Internal error', statusCode: 500 }, { status: 500 });
  }
}
