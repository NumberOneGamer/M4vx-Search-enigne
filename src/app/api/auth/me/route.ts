import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await authenticateUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Not authenticated', statusCode: 401 },
      { status: 401 }
    );
  }
  return NextResponse.json({ user });
}
