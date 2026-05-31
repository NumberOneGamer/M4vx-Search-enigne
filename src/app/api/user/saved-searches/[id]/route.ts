import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { renameSavedSearch, deleteSavedSearch } from '@/services/user-account';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateUser(request).catch(() => null);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required', statusCode: 401 }, { status: 401 });
  }

  const { id } = await params;
  const searchId = parseInt(id, 10);
  if (isNaN(searchId)) {
    return NextResponse.json({ error: 'Invalid ID', message: 'Search ID must be a number', statusCode: 400 }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name } = body;
    if (!name) {
      return NextResponse.json({ error: 'Validation Error', message: 'Name is required', statusCode: 400 }, { status: 400 });
    }
    await renameSavedSearch(user.id, searchId, name);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update saved search', message: 'Internal error', statusCode: 500 }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateUser(request).catch(() => null);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required', statusCode: 401 }, { status: 401 });
  }

  const { id } = await params;
  const searchId = parseInt(id, 10);
  if (isNaN(searchId)) {
    return NextResponse.json({ error: 'Invalid ID', message: 'Search ID must be a number', statusCode: 400 }, { status: 400 });
  }

  try {
    await deleteSavedSearch(user.id, searchId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete saved search', message: 'Internal error', statusCode: 500 }, { status: 500 });
  }
}
