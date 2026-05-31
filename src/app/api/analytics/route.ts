import { NextResponse } from 'next/server';
import { getSearchAnalytics } from '@/services/analytics';
import { analyticsQuerySchema } from '@/lib/validation';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin access required', statusCode: 403 },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = analyticsQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation Error', message: parsed.error.errors[0].message, statusCode: 400 },
      { status: 400 }
    );
  }

  try {
    const { from, to, limit } = parsed.data;
    const analytics = await getSearchAnalytics(from, to, limit);
    return NextResponse.json(analytics);

  } catch (error) {
    return NextResponse.json(
      { error: 'Analytics Error', message: 'Failed to fetch analytics', statusCode: 500 },
      { status: 500 }
    );
  }
}
