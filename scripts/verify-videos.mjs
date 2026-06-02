import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const nullThumbs = await sql`SELECT id, url, embed_url FROM videos WHERE thumbnail_url IS NULL`;
console.log(`Entries with NULL thumbnails: ${nullThumbs.length}`);
const nullViews = await sql`SELECT id, url FROM videos WHERE view_count IS NOT NULL`;
console.log(`Entries with non-null view_count: ${nullViews.length}`);
const all = await sql`SELECT id, url, thumbnail_url, embed_url, source, view_count FROM videos ORDER BY id`;
console.log(`\nAll entries (${all.length}):`);
for (const r of all) {
  console.log(`${r.id} | thumb=${(r.thumbnail_url||'null').substring(0,50)} | views=${r.view_count} | embed=${(r.embed_url||'null').substring(0,50)}`);
}
