import { NextResponse } from 'next/server';
import { suggestionSchema } from '@/lib/validation';
import { getSuggestions } from '@/lib/search/suggester';
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache';
import type { SuggestionResponse } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const parsed = suggestionSchema.safeParse({
    q: searchParams.get('q'),
    limit: searchParams.get('limit'),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation Error', message: parsed.error.errors[0].message, statusCode: 400 },
      { status: 400 }
    );
  }

  const { q, limit } = parsed.data;

  const cacheKey = `suggestions:${q}:${limit}`;
  const cached = await cacheGet<SuggestionResponse>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const suggestions = await getSuggestions(q, limit);
    const response: SuggestionResponse = { suggestions, query: q };

    await cacheSet(cacheKey, response, CACHE_TTL.SUGGESTIONS);
    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json(
      { error: 'Suggestions Error', message: 'Failed to get suggestions', statusCode: 500 },
      { status: 500 }
    );
  }
}
