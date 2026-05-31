import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { getSavedSearches, saveSearch } from '@/services/user-account';

export async function GET(request: Request) {
  const user = await authenticateUser(request).catch(() => null);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required', statusCode: 401 }, { status: 401 });
  }

  try {
    const saved = await getSavedSearches(user.id);
    return NextResponse.json({ savedSearches: saved });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch saved searches', message: 'Internal error', statusCode: 500 }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await authenticateUser(request).catch(() => null);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required', statusCode: 401 }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, query, filters } = body;
    if (!name || !query) {
      return NextResponse.json({ error: 'Validation Error', message: 'Name and query are required', statusCode: 400 }, { status: 400 });
    }
    const id = await saveSearch(user.id, name, query, filters);
    return NextResponse.json({ id, success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save search', message: 'Internal error', statusCode: 500 }, { status: 500 });
  }
}
