import { db } from '@/db';
import { searchTerms } from '@/db/schema/searchTerms';
import { pages } from '@/db/schema/pages';
import { eq, sql, ilike, desc } from 'drizzle-orm';

export async function getSuggestions(prefix: string, limit = 8): Promise<string[]> {
  if (prefix.length < 2) return [];

  const terms = await db
    .select({ term: searchTerms.term })
    .from(searchTerms)
    .where(ilike(searchTerms.term, `${prefix}%`))
    .orderBy(desc(searchTerms.frequency))
    .limit(limit);

  if (terms.length >= limit) {
    return terms.map((t) => t.term);
  }

  const existingTerms = new Set(terms.map((t) => t.term.toLowerCase()));

  const pageTitles = await db
    .select({ title: pages.title })
    .from(pages)
    .where(
      sql`${pages.title} IS NOT NULL AND LOWER(${pages.title}) LIKE ${`${prefix.toLowerCase()}%`}`
    )
    .limit(limit - terms.length);

  const allSuggestions = [
    ...terms.map((t) => t.term),
    ...pageTitles
      .map((p) => p.title)
      .filter((t): t is string => t !== null && !existingTerms.has(t.toLowerCase())),
  ];

  return allSuggestions.slice(0, limit);
}

export async function getTrendingSearches(limit = 10): Promise<string[]> {
  const terms = await db
    .select({ term: searchTerms.term })
    .from(searchTerms)
    .where(sql`${searchTerms.isTrending} = 'yes'`)
    .orderBy(desc(searchTerms.frequency))
    .limit(limit);

  if (terms.length > 0) {
    return terms.map((t) => t.term);
  }

  const recent = await db
    .select({ term: searchTerms.term })
    .from(searchTerms)
    .orderBy(desc(searchTerms.frequency))
    .limit(limit);

  return recent.map((t) => t.term);
}

export async function getRelatedSearches(query: string, limit = 5): Promise<string[]> {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return [];

  const conditions = words.map(
    (word) => ilike(searchTerms.term, `%${word}%`)
  );

  const related = await db
    .select({ term: searchTerms.term })
    .from(searchTerms)
    .where(sql`(${sql.join(conditions, sql` OR `)}) AND LOWER(${searchTerms.term}) != ${query.toLowerCase()}`)
    .orderBy(desc(searchTerms.frequency))
    .limit(limit);

  return related.map((t) => t.term);
}

export async function recordSearchTerm(term: string): Promise<void> {
  const existing = await db
    .select()
    .from(searchTerms)
    .where(ilike(searchTerms.term, term))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(searchTerms)
      .set({
        frequency: sql`${searchTerms.frequency} + 1`,
        lastSearchedAt: sql`NOW()`,
      })
      .where(eq(searchTerms.id, existing[0].id));
  } else {
    await db
      .insert(searchTerms)
      .values({ term, frequency: 1, lastSearchedAt: new Date() })
      .onConflictDoNothing({ target: searchTerms.term });
  }
}
