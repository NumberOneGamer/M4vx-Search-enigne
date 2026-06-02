import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
await sql('DELETE FROM crawl_queue');
await sql('DELETE FROM backlinks');
await sql('DELETE FROM pages');
await sql('DELETE FROM domains');
console.log('Cleared all crawl data');
process.exit(0);
