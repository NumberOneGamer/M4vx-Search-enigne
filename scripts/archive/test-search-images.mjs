// Test the searchImages function directly
import '../../src/lib/cache'; // This will fail but let me try differently
import { searchImages } from '../../src/services/image-indexer';

async function main() {
  try {
    const result = await searchImages({ query: 'wikipedia', pageSize: 5 });
    console.log('Total results:', result.totalResults);
    for (const r of result.results) {
      console.log(`  ${r.id}: alt="${(r.altText||'').substring(0,30)}" pt="${(r.pageTitle||'').substring(0,50)}" score=${r.score}`);
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
}
main();
