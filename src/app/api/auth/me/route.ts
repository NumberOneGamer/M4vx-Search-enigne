import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Not authenticated', statusCode: 401 },
        { status: 401 }
      );
    }
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: 'Auth Error', message: 'Failed to authenticate', statusCode: 500 },
      { status: 500 }
    );
  }
}
