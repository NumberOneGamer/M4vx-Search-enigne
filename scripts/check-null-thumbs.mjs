import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const rows = await sql`SELECT id, url, embed_url, thumbnail_url FROM videos WHERE thumbnail_url IS NULL ORDER BY id`;
for (const r of rows) {
  console.log(`${r.id} | url=${r.url?.substring(0,70)} | embed=${r.embed_url?.substring(0,70)}`);
}
