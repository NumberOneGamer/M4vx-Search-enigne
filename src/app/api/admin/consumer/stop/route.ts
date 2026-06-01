import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { stopConsumer, getConsumerStatus } from '@/services/queue-consumer';

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json({ error: 'Forbidden', statusCode: 403 }, { status: 403 });
  }

  try {
    const status = getConsumerStatus();
    if (!status.running) {
      return NextResponse.json({ message: 'Consumer not running', status });
    }
    stopConsumer();
    return NextResponse.json({ message: 'Consumer stopping', status: getConsumerStatus() });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to stop consumer', statusCode: 500 }, { status: 500 });
  }
}
