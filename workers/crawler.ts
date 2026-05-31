import { processBatch, getCrawlStats } from '../src/services/crawler';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.searchParams.get('key') !== process.env.CRAWLER_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      const batchSize = parseInt(url.searchParams.get('batch') || '20', 10);
      const result = await processBatch(batchSize);
      const stats = await getCrawlStats();
      return new Response(JSON.stringify({ result, stats }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
