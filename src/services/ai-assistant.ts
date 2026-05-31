import { db } from '@/db';
import { pages } from '@/db/schema/pages';
import { sql, inArray, and, like, or, eq, count } from 'drizzle-orm';
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache';

function extractSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 5 && s.split(/\s+/).length <= 50);
}

function findKeySentences(text: string, query: string, maxSentences = 3): Array<{ sentence: string; score: number }> {
  const sentences = extractSentences(text);
  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (!sentences.length || !queryTerms.length) return [];

  const scored = sentences.map((s) => {
    const lower = s.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      const count_ = (lower.match(new RegExp(term, 'g')) || []).length;
      score += count_ * 2;
    }
    return { sentence: s, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxSentences);
}

function generateRelatedQuestions(query: string): string[] {
  const q = query.trim();
  if (!q) return [];
  const templates = [
    `What is ${q}?`,
    `How does ${q} work?`,
    `${q} examples`,
    `${q} vs alternatives`,
    `Why is ${q} important?`,
    `${q} best practices`,
    `${q} tutorial for beginners`,
    `${q} use cases`,
  ];
  return templates;
}

function generateConciseSummary(keySentences: string[], query: string): string {
  if (!keySentences.length) {
    const terms = query.split(/\s+/).filter(Boolean);
    return `Results about ${terms.slice(0, 5).join(', ')}${terms.length > 5 ? ' and more' : ''}.`;
  }
  if (keySentences.length === 1) return keySentences[0];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const s of keySentences) {
    const normalized = s.toLowerCase().slice(0, 40);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(s);
    }
  }
  return unique.join('. ') + '.';
}

export function detectQueryType(
  query: string
): 'informational' | 'navigational' | 'transactional' | 'question' {
  const q = query.toLowerCase().trim();
  const questionWords = /^(what|how|why|when|where|who|which|can|does|is|are|do|did|will|would|could|should)/;
  const navigationalTerms = /\b(login|signin|signup|register|download|official|website|homepage|site)\b/;
  const transactionalTerms = /\b(buy|purchase|price|cost|cheap|discount|order|shop|deal|best price|affordable|hire|rent|subscribe)\b/;

  if (questionWords.test(q) || q.endsWith('?')) return 'question';
  if (navigationalTerms.test(q)) return 'navigational';
  if (transactionalTerms.test(q)) return 'transactional';
  return 'informational';
}

export interface AiAssistantResult {
  summary: string | null;
  relatedQuestions: string[];
  keyPoints: string[];
  sources: { title: string; url: string; snippet: string }[];
  confidenceScore: number;
  queryType: 'informational' | 'navigational' | 'transactional' | 'question';
}

const CONFIDENCE_THRESHOLD = 0.3;

export async function getAiAssistant(
  query: string,
  resultPageIds: number[]
): Promise<AiAssistantResult> {
  const queryType = detectQueryType(query);

  if (!query.trim() || resultPageIds.length === 0) {
    return {
      summary: null,
      relatedQuestions: generateRelatedQuestions(query).slice(0, 3),
      keyPoints: [],
      sources: [],
      confidenceScore: 0,
      queryType,
    };
  }

  const cacheKey = `ai:assistant:${query.toLowerCase().trim()}`;
  const cached = await cacheGet<AiAssistantResult>(cacheKey);
  if (cached) return cached;

  const pageRecords = await db
    .select({ id: pages.id, title: pages.title, content: pages.content, url: pages.url, metaDescription: pages.metaDescription })
    .from(pages)
    .where(inArray(pages.id, resultPageIds))
    .limit(10);

  if (!pageRecords.length) {
    const result: AiAssistantResult = {
      summary: null,
      relatedQuestions: generateRelatedQuestions(query).slice(0, 3),
      keyPoints: [],
      sources: [],
      confidenceScore: 0,
      queryType,
    };
    return result;
  }

  const allKeySentences: Array<{ sentence: string; score: number }> = [];
  const sources: AiAssistantResult['sources'] = [];

  for (const page of pageRecords) {
    if (page.content) {
      const keySentences = findKeySentences(page.content, query, 2);
      allKeySentences.push(...keySentences);
      if (keySentences.length > 0) {
        sources.push({
          title: page.title ?? 'Untitled',
          url: page.url,
          snippet: keySentences[0].sentence.slice(0, 200),
        });
      }
    }
  }

  const topSentences = allKeySentences
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((s) => s.sentence);

  const summary = generateConciseSummary(topSentences, query);
  const relatedQuestions = generateRelatedQuestions(query).slice(0, 5);

  const uniqueSentences = [...new Set(topSentences)];
  const keyPoints = uniqueSentences.slice(0, 3).map((s) => {
    if (s.length > 120) return s.slice(0, 117) + '...';
    return s;
  });

  const totalScore = allKeySentences.reduce((acc, s) => acc + s.score, 0);
  const maxPossibleScore = pageRecords.length * 10;
  const confidenceScore = Math.min(totalScore / maxPossibleScore, 1);

  const result: AiAssistantResult = {
    summary,
    relatedQuestions,
    keyPoints,
    sources,
    confidenceScore,
    queryType,
  };

  if (confidenceScore >= CONFIDENCE_THRESHOLD) {
    await cacheSet(cacheKey, result, CACHE_TTL.SEARCH_RESULTS);
  }

  return result;
}
