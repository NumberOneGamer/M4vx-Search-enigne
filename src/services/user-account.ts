import { db } from '@/db';
import { searchHistory } from '@/db/schema/searchHistory';
import { savedSearches } from '@/db/schema/savedSearches';
import { userPreferences } from '@/db/schema/userPreferences';
import { eq, desc, and, sql } from 'drizzle-orm';

export async function addSearchHistory(
  userId: number,
  query: string,
  filters?: string
): Promise<number> {
  const [result] = await db
    .insert(searchHistory)
    .values({ userId, query, filters })
    .returning();
  return result.id;
}

export async function getSearchHistory(
  userId: number,
  limit = 50,
  offset = 0
): Promise<Array<{ id: number; query: string; filters: string | null; createdAt: Date }>> {
  return db
    .select({
      id: searchHistory.id,
      query: searchHistory.query,
      filters: searchHistory.filters,
      createdAt: searchHistory.createdAt,
    })
    .from(searchHistory)
    .where(eq(searchHistory.userId, userId))
    .orderBy(desc(searchHistory.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function deleteSearchHistoryItem(userId: number, historyId: number): Promise<void> {
  await db
    .delete(searchHistory)
    .where(and(eq(searchHistory.id, historyId), eq(searchHistory.userId, userId)));
}

export async function clearSearchHistory(userId: number): Promise<void> {
  await db.delete(searchHistory).where(eq(searchHistory.userId, userId));
}

export async function saveSearch(
  userId: number,
  name: string,
  query: string,
  filters?: string
): Promise<number> {
  const [result] = await db
    .insert(savedSearches)
    .values({ userId, name, query, filters })
    .returning();
  return result.id;
}

export async function getSavedSearches(
  userId: number
): Promise<Array<{ id: number; name: string; query: string; filters: string | null; createdAt: Date }>> {
  return db
    .select({
      id: savedSearches.id,
      name: savedSearches.name,
      query: savedSearches.query,
      filters: savedSearches.filters,
      createdAt: savedSearches.createdAt,
    })
    .from(savedSearches)
    .where(eq(savedSearches.userId, userId))
    .orderBy(desc(savedSearches.createdAt));
}

export async function renameSavedSearch(userId: number, searchId: number, name: string): Promise<void> {
  await db
    .update(savedSearches)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(savedSearches.id, searchId), eq(savedSearches.userId, userId)));
}

export async function deleteSavedSearch(userId: number, searchId: number): Promise<void> {
  await db
    .delete(savedSearches)
    .where(and(eq(savedSearches.id, searchId), eq(savedSearches.userId, userId)));
}

function normalizePrefs(pref: typeof userPreferences.$inferSelect) {
  return {
    id: pref.id,
    theme: pref.theme || 'system',
    resultsPerPage: pref.resultsPerPage || 10,
    defaultSort: pref.defaultSort || 'relevance',
    safeSearch: pref.safeSearch || 'moderate',
    openInNewTab: pref.openInNewTab || 'yes',
  };
}

export async function getOrCreatePreferences(userId: number) {
  const existing = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return normalizePrefs(existing[0]);
  }

  const [created] = await db
    .insert(userPreferences)
    .values({ userId })
    .returning();
  return normalizePrefs(created);
}

export async function updatePreferences(
  userId: number,
  data: Partial<{
    theme: string;
    resultsPerPage: number;
    defaultSort: string;
    safeSearch: string;
    openInNewTab: string;
  }>
): Promise<void> {
  await db
    .insert(userPreferences)
    .values({ userId, ...data })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { ...data, updatedAt: new Date() },
    });
}
