import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// 1. Set view_count to NULL where 0
const v1 = await sql`UPDATE videos SET view_count = NULL WHERE view_count = 0`;
console.log(`Set view_count to NULL: ${v1.count} rows`);

// 2. Generate thumbnail_url from embed_url where missing
const v2 = await sql`
  UPDATE videos 
  SET thumbnail_url = 'https://img.youtube.com/vi/' || substring(embed_url from '/embed/([a-zA-Z0-9_-]{11})') || '/maxresdefault.jpg'
  WHERE thumbnail_url IS NULL 
    AND embed_url ~ '/embed/[a-zA-Z0-9_-]{11}'
`;
console.log(`Generated thumbnails: ${v2.count} rows`);

// 3. Verify
const rows = await sql`SELECT id, url, thumbnail_url, view_count FROM videos ORDER BY id LIMIT 10`;
for (const r of rows) {
  console.log(`${r.id} | thumb=${(r.thumbnail_url||'').substring(0,55)} | views=${r.view_count}`);
}
