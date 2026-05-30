import { NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validation';
import { loginUser, setAuthCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', message: parsed.error.errors[0].message, statusCode: 400 },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const result = await loginUser(email, password);
    setAuthCookie(result.token);

    return NextResponse.json(
      { user: result.user, token: result.token },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json(
      { error: 'Authentication Error', message, statusCode: 401 },
      { status: 401 }
    );
  }
}
