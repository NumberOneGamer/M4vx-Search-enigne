export function extractCanonicalUrl(html: string, baseUrl: string): string | null {
  const match = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (!match) return null;

  const href = match[1].trim();
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

export function computeContentHash(content: string): string {
  const cleaned = content
    .replace(/\s+/g, ' ')
    .replace(/<[^>]*>/g, '')
    .trim()
    .toLowerCase();

  let hash = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function computeSimilarity(a: string, b: string): number {
  const cleanedA = a.replace(/\s+/g, ' ').trim().toLowerCase();
  const cleanedB = b.replace(/\s+/g, ' ').trim().toLowerCase();

  if (cleanedA === cleanedB) return 1;
  if (!cleanedA || !cleanedB) return 0;

  const len = Math.min(cleanedA.length, cleanedB.length);
  let matches = 0;

  for (let i = 0; i < len; i++) {
    if (cleanedA[i] === cleanedB[i]) matches++;
  }

  return matches / Math.max(cleanedA.length, cleanedB.length);
}
