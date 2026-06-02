import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const [p] = await sql`SELECT COUNT(*) as cnt FROM pages`;
const [d] = await sql`SELECT COUNT(*) as cnt FROM domains`;
const skips = await sql`SELECT COUNT(*) as cnt FROM pages WHERE url LIKE '%.commoncrawl.%'`;
console.log(`Total pages: ${p.cnt}`);
console.log(`Total domains: ${d.cnt}`);
console.log(`Recent domains:`);
const domains = await sql`SELECT url, total_pages FROM domains ORDER BY id DESC LIMIT 5`;
for (const r of domains) console.log(`  ${r.url} (${r.total_pages} pages)`);
