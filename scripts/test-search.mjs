import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const allKeywords = await sql('SELECT DISTINCT keyword FROM rankings LIMIT 50');
const keywords = allKeywords.map(k => k.keyword);
console.log('Sample keywords (' + keywords.length + '):', keywords.slice(0, 20));

// Test search for 'web'
const webResults = await sql("SELECT p.title, p.url, r.overall_score FROM rankings r JOIN pages p ON p.id = r.page_id WHERE r.keyword = 'web' ORDER BY r.overall_score DESC LIMIT 10");
console.log('Search for "web":', JSON.stringify(webResults, null, 2));

// Test for 'search'
const searchResults = await sql("SELECT p.title, p.url, r.overall_score FROM rankings r JOIN pages p ON p.id = r.page_id WHERE r.keyword = 'search' ORDER BY r.overall_score DESC LIMIT 10");
console.log('Search for "search":', JSON.stringify(searchResults, null, 2));

// Test for 'node'
const nodeResults = await sql("SELECT p.title, p.url, r.overall_score FROM rankings r JOIN pages p ON p.id = r.page_id WHERE r.keyword = 'node' ORDER BY r.overall_score DESC LIMIT 10");
console.log('Search for "node":', JSON.stringify(nodeResults, null, 2));

// Test tokenizer-based search query
const queryTokens = ['web', 'search'];
const conditions = queryTokens.map(t => "LOWER(r.keyword) = '" + t.toLowerCase() + "'").join(' OR ');
const rankResults = await sql("SELECT p.title, p.url, r.keyword, r.overall_score FROM rankings r JOIN pages p ON p.id = r.page_id WHERE " + conditions + " ORDER BY r.overall_score DESC LIMIT 20");
console.log('Tokenizer search (web OR search):', JSON.stringify(rankResults, null, 2));
