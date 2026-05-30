import { NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validation';
import { registerUser, setAuthCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', message: parsed.error.errors[0].message, statusCode: 400 },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;
    const result = await registerUser(email, password, name);
    setAuthCookie(result.token);

    return NextResponse.json(
      { user: result.user, token: result.token },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json(
      { error: 'Registration Error', message, statusCode: 400 },
      { status: 400 }
    );
  }
}
