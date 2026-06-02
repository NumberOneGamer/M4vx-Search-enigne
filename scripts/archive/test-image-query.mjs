import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Simulate what the drizzle query should produce
const query = "wikipedia";
const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
console.log("Terms:", terms);

// Build the WHERE conditions manually
const conditions = [];
conditions.push("TRUE"); // isIndexed - skip for test

// Text search - simulate what or(ilike...) should produce
const textParts = [];
for (const term of terms) {
  textParts.push(`(alt_text ILIKE '%${term}%' OR caption ILIKE '%${term}%' OR page_title ILIKE '%${term}%' OR context_content ILIKE '%${term}%')`);
}

if (textParts.length > 0) {
  conditions.push(`(${textParts.join(' OR ')})`);
}

const whereSQL = conditions.join(' AND ');
console.log("Where clause:", whereSQL);

const res = await sql.query(`SELECT id, alt_text, page_title FROM images WHERE ${whereSQL} LIMIT 5`);
console.log(`Results: ${res.length}`);
for (const r of res) {
  console.log(`  ${r.id}: alt="${(r.alt_text||'').substring(0,30)}" pt="${(r.page_title||'').substring(0,50)}"`);
}
