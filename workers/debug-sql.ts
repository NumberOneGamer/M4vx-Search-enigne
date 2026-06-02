export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.searchParams.get('key') !== env.CRAWLER_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      const m = env.DATABASE_URL.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
      if (!m) return new Response(JSON.stringify({ error: 'Cannot parse DATABASE_URL', db_set: !!env.DATABASE_URL }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      const [, , , host] = m;
      const endpoint = `https://${host}/sql`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Neon-Connection-String': env.DATABASE_URL, 'Neon-Raw-Text-Output': 'true', 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'SELECT 1 as test', params: [] }),
      });
      if (!res.ok) {
        const text = await res.text();
        return new Response(JSON.stringify({ error: 'DB error', status: res.status, text: text.slice(0, 500) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
      const data = await res.json();
      return new Response(JSON.stringify({ success: true, data: data.rows || data }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e), stack: e.stack }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  },
};
