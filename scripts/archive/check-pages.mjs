import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const [r] = await sql`SELECT COUNT(*) as cnt FROM pages`;
console.log(`Total pages: ${r.cnt}`);
