import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { getSearchHistory, clearSearchHistory, addSearchHistory } from '@/services/user-account';

export async function GET(request: Request) {
  const user = await authenticateUser(request).catch(() => null);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required', statusCode: 401 }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const history = await getSearchHistory(user.id, Math.min(limit, 100), offset);
    return NextResponse.json({ history });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch history', message: 'Internal error', statusCode: 500 }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await authenticateUser(request).catch(() => null);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required', statusCode: 401 }, { status: 401 });
  }

  try {
    await clearSearchHistory(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to clear history', message: 'Internal error', statusCode: 500 }, { status: 500 });
  }
}
