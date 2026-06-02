import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const rows = await sql`SELECT id, url, thumbnail_url, view_count, title FROM videos ORDER BY id LIMIT 20`;
for (const v of rows) {
  console.log(`${v.id} | thumb=${(v.thumbnail_url||'').substring(0,50)} | views=${v.view_count} | ${(v.title||'').substring(0,40)}`);
}
