import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Delete entries with non-embed URLs
const del = await sql`DELETE FROM videos WHERE embed_url IS NULL OR (embed_url NOT LIKE '%/embed/%' AND embed_url NOT LIKE '%player.vimeo.com%' AND embed_url NOT LIKE '%dailymotion.com/embed%')`;
console.log(`Deleted ${del.count} bad entries`);

// Also fix entry ID 4 which has valid watch URL but null embed_url
const fix = await sql`UPDATE videos SET embed_url = 'https://www.youtube-nocookie.com/embed/DPF6oZcl_3g', thumbnail_url = 'https://img.youtube.com/vi/DPF6oZcl_3g/maxresdefault.jpg', source = 'youtube', is_indexed = true WHERE id = 4`;
console.log(`Fixed entry 4: ${fix.count} rows`);

const rows = await sql`SELECT id, url, embed_url, thumbnail_url, view_count FROM videos ORDER BY id`;
console.log(`\nRemaining (${rows.length}):`);
for (const r of rows) {
  console.log(`${r.id} | thumb=${(r.thumbnail_url||'').substring(0,55)} | views=${r.view_count} | ${(r.url||'').substring(0,55)}`);
}
