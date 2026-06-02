import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// 1. Create GIN index for full-text search on pages content+title
console.log('Creating GIN index on pages (title + content)...');
const start = Date.now();
await sql`
  CREATE INDEX IF NOT EXISTS pages_fts_idx 
  ON pages 
  USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '')))
`;
console.log(`Done in ${Date.now() - start}ms`);

// 2. Create index on rankings.keyword for faster token lookups
console.log('Creating index on rankings.keyword...');
await sql`CREATE INDEX IF NOT EXISTS rankings_keyword_idx ON rankings (keyword)`;
console.log('Done');

// 3. Create index on rankings.pageId for faster joins
console.log('Creating index on rankings.page_id...');
await sql`CREATE INDEX IF NOT EXISTS rankings_page_id_idx ON rankings (page_id)`;
console.log('Done');

// 4. Verify indexes exist
const indexes = await sql`
  SELECT indexname, indexdef 
  FROM pg_indexes 
  WHERE tablename IN ('pages', 'rankings') 
    AND indexname IN ('pages_fts_idx', 'rankings_keyword_idx', 'rankings_page_id_idx')
`;
for (const idx of indexes) {
  console.log(`  ${idx.indexname}: ${idx.indexdef.substring(0, 100)}...`);
}

console.log('\nAll indexes created successfully');
