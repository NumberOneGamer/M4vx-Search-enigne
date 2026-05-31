import { NextRequest, NextResponse } from 'next/server';
import { getAiAssistant } from '@/services/ai-assistant';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const pageIds = searchParams.get('pageIds') || '';

  if (!q.trim()) {
    return NextResponse.json({ answer: null, summary: null, keyPoints: [], sources: [], confidenceScore: 0, relatedQuestions: [], queryType: 'informational' });
  }

  const resultPageIds = pageIds ? pageIds.split(',').map(Number).filter((n) => !isNaN(n)) : [];

  try {
    const result = await getAiAssistant(q, resultPageIds);
    return NextResponse.json({
      answer: result.summary,
      summary: result.summary,
      keyPoints: result.keyPoints,
      sources: result.sources,
      confidenceScore: result.confidenceScore,
      relatedQuestions: result.relatedQuestions,
      queryType: result.queryType,
    });
  } catch (error) {
    console.error('AI search error:', error);
    return NextResponse.json({ answer: null, summary: null, keyPoints: [], sources: [], confidenceScore: 0, relatedQuestions: [], queryType: 'informational' }, { status: 500 });
  }
}
