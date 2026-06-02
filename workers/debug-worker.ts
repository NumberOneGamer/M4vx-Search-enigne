export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (key !== env.CRAWLER_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }
    return new Response(JSON.stringify({ status: 'ok', key_set: !!env.CRAWLER_SECRET, db_set: !!env.DATABASE_URL }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
