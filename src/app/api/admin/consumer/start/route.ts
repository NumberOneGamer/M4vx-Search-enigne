import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { startConsumer, getConsumerStatus } from '@/services/queue-consumer';

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json({ error: 'Forbidden', statusCode: 403 }, { status: 403 });
  }

  try {
    const status = getConsumerStatus();
    if (status.running) {
      return NextResponse.json({ message: 'Consumer already running', status });
    }
    startConsumer().catch((err) => console.error('[Consumer API] Start error:', err));
    await new Promise((resolve) => setTimeout(resolve, 500));
    return NextResponse.json({ message: 'Consumer started', status: getConsumerStatus() });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to start consumer', statusCode: 500 }, { status: 500 });
  }
}
