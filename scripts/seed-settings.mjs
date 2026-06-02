import { db } from '../src/db/index.ts';
import { settings } from '../src/db/schema/settings.ts';

const defaults = [
  // Ranking weights
  { key: 'ranking_relevanceWeight', value: '0.30', description: 'Weight for keyword relevance score (0.0-1.0)', category: 'ranking' },
  { key: 'ranking_contentQualityWeight', value: '0.20', description: 'Weight for content quality score (0.0-1.0)', category: 'ranking' },
  { key: 'ranking_freshnessWeight', value: '0.10', description: 'Weight for page freshness score (0.0-1.0)', category: 'ranking' },
  { key: 'ranking_backlinkWeight', value: '0.15', description: 'Weight for backlink count score (0.0-1.0)', category: 'ranking' },
  { key: 'ranking_engagementWeight', value: '0.10', description: 'Weight for user engagement score (0.0-1.0)', category: 'ranking' },
  { key: 'ranking_domainAuthorityWeight', value: '0.15', description: 'Weight for domain authority score (0.0-1.0)', category: 'ranking' },
  // Crawler settings
  { key: 'crawler_batch_max', value: '3', description: 'Max URLs to process per batch', category: 'crawler' },
  { key: 'crawler_max_depth', value: '5', description: 'Maximum crawl depth from seed URLs', category: 'crawler' },
  { key: 'crawler_concurrency', value: '5', description: 'Number of parallel crawl requests', category: 'crawler' },
  { key: 'crawler_user_agent', value: 'SearchEngineBot/1.0', description: 'User agent for crawl requests', category: 'crawler' },
  // Search settings
  { key: 'search_results_per_page', value: '10', description: 'Number of search results per page', category: 'search' },
  { key: 'search_max_pages', value: '50', description: 'Maximum search result pages', category: 'search' },
  // Cache settings
  { key: 'cache_ttl_search', value: '300', description: 'Search result cache TTL in seconds', category: 'cache' },
  { key: 'cache_ttl_suggestions', value: '600', description: 'Search suggestion cache TTL in seconds', category: 'cache' },
  { key: 'cache_ttl_admin', value: '60', description: 'Admin stats cache TTL in seconds', category: 'cache' },
  // Extractor settings
  { key: 'extractor_news_limit', value: '15', description: 'Pages to process per news extraction run', category: 'extractor' },
  { key: 'extractor_images_limit', value: '10', description: 'Pages to process per images extraction run', category: 'extractor' },
  { key: 'extractor_videos_limit', value: '10', description: 'Pages to process per videos extraction run', category: 'extractor' },
];

for (const s of defaults) {
  try {
    await db.insert(settings).values(s).onConflictDoNothing({ target: settings.key });
    console.log(`✓ ${s.key} = ${s.value}`);
  } catch(e) {
    console.log(`✗ ${s.key}: ${e.message}`);
  }
}
console.log('Done seeding settings');
