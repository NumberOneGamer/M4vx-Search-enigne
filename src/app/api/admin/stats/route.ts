import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getAdminStats } from '@/services/analytics';
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin access required', statusCode: 403 },
      { status: 403 }
    );
  }

  try {
    const cached = await cacheGet('admin:stats');
    if (cached) {
      return NextResponse.json(cached);
    }

    const stats = await getAdminStats();
    await cacheSet('admin:stats', stats, CACHE_TTL.ADMIN_STATS);

    return NextResponse.json(stats);

  } catch (error) {
    return NextResponse.json(
      { error: 'Stats Error', message: 'Failed to fetch stats', statusCode: 500 },
      { status: 500 }
    );
  }
}
