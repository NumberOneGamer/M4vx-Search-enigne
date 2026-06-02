import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const bad = await sql`SELECT id, url, embed_url FROM videos WHERE embed_url NOT LIKE '%/embed/%' AND embed_url NOT LIKE '%player.vimeo.com%' AND embed_url NOT LIKE '%dailymotion.com/embed%'`;
console.log(`Bad entries: ${bad.length}`);
for (const r of bad) {
  console.log(`  ${r.id} | ${r.url?.substring(0,70)} | embed=${r.embed_url?.substring(0,70)}`);
}

if (bad.length > 0) {
  const ids = bad.map(r => r.id);
  await sql`DELETE FROM videos WHERE id = ANY(${ids})`;
  console.log(`Deleted ${ids.length} bad entries`);
}
