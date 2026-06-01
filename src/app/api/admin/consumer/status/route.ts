import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getConsumerStatus } from '@/services/queue-consumer';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json({ error: 'Forbidden', statusCode: 403 }, { status: 403 });
  }

  try {
    return NextResponse.json(getConsumerStatus());
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get consumer status', statusCode: 500 }, { status: 500 });
  }
}
