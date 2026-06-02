import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const rows = await sql`SELECT url, title, word_count, crawled_at FROM pages ORDER BY id DESC LIMIT 5`;
for (const r of rows) {
  console.log(`url: ${r.url.substring(0,80)}`);
  console.log(`title: ${(r.title||'').substring(0,60)}`);
  console.log(`words: ${r.word_count}, crawled: ${r.crawled_at}`);
  console.log('---');
}
