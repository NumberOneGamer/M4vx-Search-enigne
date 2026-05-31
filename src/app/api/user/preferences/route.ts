import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { getOrCreatePreferences, updatePreferences } from '@/services/user-account';

export async function GET(request: Request) {
  const user = await authenticateUser(request).catch(() => null);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required', statusCode: 401 }, { status: 401 });
  }

  try {
    const prefs = await getOrCreatePreferences(user.id);
    return NextResponse.json({ preferences: prefs });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch preferences', message: 'Internal error', statusCode: 500 }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await authenticateUser(request).catch(() => null);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required', statusCode: 401 }, { status: 401 });
  }

  try {
    const body = await request.json();
    await updatePreferences(user.id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update preferences', message: 'Internal error', statusCode: 500 }, { status: 500 });
  }
}
