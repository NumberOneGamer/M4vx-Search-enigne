import { NextResponse } from 'next/server';
import { logClick } from '@/services/analytics';
import { z } from 'zod';

const clickSchema = z.object({
  searchLogId: z.number().int().positive(),
  position: z.number().int().positive(),
  url: z.string().url().max(2048),
  pageId: z.number().int().positive().optional(),
  dwellTimeMs: z.number().int().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = clickSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', message: parsed.error.errors[0].message, statusCode: 400 },
        { status: 400 }
      );
    }

    const { searchLogId, position, url, pageId, dwellTimeMs } = parsed.data;
    await logClick(searchLogId, position, url, pageId, dwellTimeMs);

    return NextResponse.json({ success: true }, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { error: 'Click Error', message: 'Failed to log click', statusCode: 500 },
      { status: 500 }
    );
  }
}
