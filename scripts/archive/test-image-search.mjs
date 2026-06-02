import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Try a search with our exact ILIKE conditions
const query = "Wikipedia";
const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
console.log("Terms:", terms);

const res = await sql`
  SELECT id, alt_text, page_title
  FROM images
  WHERE (alt_text ILIKE '%' || ${query} || '%' OR page_title ILIKE '%' || ${query} || '%')
  LIMIT 10
`;
console.log(`ILIKE "%${query}%" results: ${res.length}`);
for (const r of res) {
  console.log(`  ${r.id}: alt="${(r.alt_text||'').substring(0,40)}" pt="${(r.page_title||'').substring(0,40)}"`);
}

// Try a broader test - just check if ILIKE works at all
const res2 = await sql`
  SELECT id, alt_text, page_title
  FROM images
  WHERE alt_text ILIKE '%wiki%' OR page_title ILIKE '%wiki%'
  LIMIT 10
`;
console.log(`\nILIKE "%wiki%" results: ${res2.length}`);
