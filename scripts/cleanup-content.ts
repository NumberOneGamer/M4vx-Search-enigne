import { db } from '@/db';
import { pages } from '@/db/schema/pages';
import { sql, isNotNull, and, eq } from 'drizzle-orm';

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','by','with','from','as',
  'is','it','its','are','was','were','be','been','being','has','have','had','do','does',
  'did','will','would','could','should','may','might','shall','can','not','no','nor',
  'this','that','these','those','i','you','he','she','we','they','me','him','her','us',
  'them','my','your','his','its','our','their','who','which','what','when','where','why',
  'how','all','each','every','both','few','some','any','more','most','other','such',
  'only','own','same','so','than','too','very','just','about','up','out','if','into',
  'over','after','before','between','under','again','further','then','once','here','there',
]);

function extractKeywords(text: string, maxKeywords = 15): string[] {
  const freq = new Map<string, number>();
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([w]) => w);
}

function truncateContent(text: string | null, maxLen = 1200): string | null {
  if (!text || text.length <= maxLen) return text;
  const trimmed = text.slice(0, maxLen);
  const lastPeriod = trimmed.lastIndexOf('.');
  const lastSpace = trimmed.lastIndexOf(' ');
  const breakAt = lastPeriod > maxLen * 0.7 ? lastPeriod + 1 : lastSpace > maxLen * 0.5 ? lastSpace : maxLen;
  return text.slice(0, breakAt);
}

async function main() {
  const result: any = await db.execute(sql`
    SELECT COUNT(*)::int AS total,
           SUM(LENGTH(COALESCE(content, '')))::bigint AS content_bytes
    FROM pages WHERE content IS NOT NULL
  `);
  const row = result.rows?.[0] || result[0] || {};
  const total = Number(row.total || 0);
  const content_bytes = Number(row.content_bytes || 0);
  const mb = content_bytes / (1024 * 1024);
  console.log(`Pages with content: ${total}, Content size: ${mb.toFixed(1)} MB`);

  const LIMIT = 1200;
  let processed = 0;
  let truncated = 0;
  let keywordCount = 0;

  while (true) {
    const batch: any[] = await db
      .select({ id: pages.id, content: pages.content, headings: pages.headings })
      .from(pages)
      .where(and(isNotNull(pages.content), sql`LENGTH(${pages.content}) > ${LIMIT}`))
      .limit(50);

    if (batch.length === 0) break;

    for (const page of batch) {
      if (!page.content) continue;

      const keywords = extractKeywords(page.content);
      let newHeadings = page.headings || '';
      const added: string[] = [];

      for (const kw of keywords) {
        const lower = newHeadings.toLowerCase();
        if (!lower.includes(kw) && !added.includes(kw)) {
          added.push(kw);
        }
      }

      if (added.length > 0) {
        const suffix = '\n' + added.join(', ');
        newHeadings = newHeadings ? newHeadings + suffix : suffix;
      }

      const newContent = truncateContent(page.content, LIMIT);

      await db.update(pages).set({
        content: newContent,
        headings: newHeadings || page.headings,
      }).where(eq(pages.id, page.id));

      truncated++;
      keywordCount += added.length;
    }

    processed += batch.length;
    console.log(`  ${processed} processed, ${truncated} truncated, ${keywordCount} keywords saved`);
  }

  const saved = mb - (total * LIMIT / 1024 / 1024);
  console.log(`\nDone. Truncated ${truncated} pages, saved ~${saved.toFixed(1)} MB`);
  console.log(`Extracted ${keywordCount} keywords into headings for FTS`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
