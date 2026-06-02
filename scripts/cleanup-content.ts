import { db } from '@/db';
import { pages } from '@/db/schema/pages';
import { sql, lt, isNotNull, and, eq } from 'drizzle-orm';

function truncateContent(text: string | null, maxLen = 1200): string | null {
  if (!text || text.length <= maxLen) return text;
  const trimmed = text.slice(0, maxLen);
  const lastSpace = trimmed.lastIndexOf(' ');
  const lastPeriod = trimmed.lastIndexOf('.');
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

  while (true) {
    const batch = await db
      .select({ id: pages.id, content: pages.content })
      .from(pages)
      .where(and(isNotNull(pages.content), sql`LENGTH(${pages.content}) > ${LIMIT}`))
      .limit(50);

    if (batch.length === 0) break;

    for (const page of batch) {
      const next = truncateContent(page.content, LIMIT);
      if (next !== page.content) {
        await db.update(pages).set({ content: next }).where(eq(pages.id, page.id));
        truncated++;
      }
    }

    processed += batch.length;
    console.log(`  ${processed} processed, ${truncated} truncated`);
  }

  const saved = mb - (total * LIMIT / 1024 / 1024);
  console.log(`\nDone. Truncated ${truncated} pages, saved ~${saved.toFixed(1)} MB`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
