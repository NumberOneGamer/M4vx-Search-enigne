import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const rows = await sql`SELECT id, url, embed_url, source, is_indexed FROM videos ORDER BY id LIMIT 20`;
for (const r of rows) {
  console.log(`${r.id} | ${r.url?.substring(0,60)} | embed=${r.embed_url?.substring(0,60)} | src=${r.source} | idx=${r.is_indexed}`);
}
