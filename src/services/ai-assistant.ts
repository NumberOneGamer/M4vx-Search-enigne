import { db } from '@/db';
import { pages } from '@/db/schema/pages';
import { sql, inArray } from 'drizzle-orm';

function extractSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 5 && s.split(/\s+/).length <= 50);
}

function findKeySentences(text: string, query: string, maxSentences = 3): string[] {
  const sentences = extractSentences(text);
  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (!sentences.length || !queryTerms.length) return [];

  const scored = sentences.map((s) => {
    const lower = s.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      if (lower.includes(term)) score += 2;
    }
    return { sentence: s, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxSentences).map((s) => s.sentence);
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

export interface AiAssistantResult {
  summary: string | null;
  relatedQuestions: string[];
}

export async function getAiAssistant(
  query: string,
  resultPageIds: number[]
): Promise<AiAssistantResult> {
  if (!query.trim() || resultPageIds.length === 0) {
    return { summary: null, relatedQuestions: [] };
  }

  const pageRecords = await db
    .select({ id: pages.id, title: pages.title, content: pages.content })
    .from(pages)
    .where(inArray(pages.id, resultPageIds))
    .limit(10);

  if (!pageRecords.length) {
    return { summary: null, relatedQuestions: generateRelatedQuestions(query).slice(0, 3) };
  }

  const allKeySentences: string[] = [];
  for (const page of pageRecords) {
    if (page.content) {
      const keySentences = findKeySentences(page.content, query, 1);
      allKeySentences.push(...keySentences);
    }
  }

  const summary = generateConciseSummary(allKeySentences, query);
  const relatedQuestions = generateRelatedQuestions(query).slice(0, 5);

  return { summary, relatedQuestions };
}
