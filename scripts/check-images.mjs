import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const rows = await sql`SELECT url FROM images ORDER BY id LIMIT 20`;
for (const r of rows) {
  const ext = r.url.split('.').pop()?.split('?')[0]?.toLowerCase();
  console.log(`${r.url.substring(0, 80)}... [${ext}]`);
}
