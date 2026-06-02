import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const nc = await sql`SELECT COUNT(*) as c FROM news_articles`;
console.log(`news_articles total: ${nc[0].c}`);

const ni = await sql`SELECT COUNT(*) as c FROM news_articles WHERE is_indexed = true`;
console.log(`news_articles indexed: ${ni[0].c}`);

const ic = await sql`SELECT COUNT(*) as c FROM images`;
console.log(`images total: ${ic[0].c}`);

const ii = await sql`SELECT COUNT(*) as c FROM images WHERE is_indexed = true`;
console.log(`images indexed: ${ii[0].c}`);

const vc = await sql`SELECT COUNT(*) as c FROM videos`;
console.log(`videos total: ${vc[0].c}`);

const vi = await sql`SELECT COUNT(*) as c FROM videos WHERE is_indexed = true`;
console.log(`videos indexed: ${vi[0].c}`);

// Check a few news articles
const news = await sql`SELECT id, headline, is_indexed FROM news_articles LIMIT 5`;
for (const r of news) console.log(`news ${r.id}: headline="${(r.headline||'').substring(0,50)}" indexed=${r.is_indexed}`);

// Check search service - does it work?
console.log("\nTrying SELECT on news...");
try {
  const rows = await sql`SELECT id, headline FROM news_articles WHERE is_indexed = true ORDER BY search_count DESC LIMIT 3`;
  for (const r of rows) console.log(`  ${r.id}: ${(r.headline||'').substring(0,60)}`);
} catch(e) { console.error("Error:", e.message); }
