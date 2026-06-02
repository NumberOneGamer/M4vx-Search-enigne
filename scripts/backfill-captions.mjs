import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const r1 = await sql`UPDATE images SET caption = alt_text WHERE caption IS NULL AND alt_text IS NOT NULL`;
console.log(`Backfilled caption from alt_text: rows affected`);

const rows = await sql`SELECT id, alt_text, caption, page_title FROM images ORDER BY id LIMIT 10`;
for (const r of rows) {
  console.log(`${r.id} | alt="${(r.alt_text||'').substring(0,30)}" | cap="${(r.caption||'').substring(0,30)}" | pt="${(r.page_title||'').substring(0,40)}"`);
}
