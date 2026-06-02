// @ts-nocheck
async function sql(query, params, env) {
  const m = env.DATABASE_URL.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
  if (!m) throw new Error('Cannot parse DATABASE_URL');
  const [, , , host] = m;
  const res = await fetch(`https://${host}/sql`, {
    method: 'POST',
    headers: { 'Neon-Connection-String': env.DATABASE_URL, 'Neon-Raw-Text-Output': 'true', 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, params }),
  });
  if (!res.ok) throw new Error(`DB: ${await res.text()}`);
  const data = await res.json();
  return data.rows || data;
}

function extractNewsMeta(html) {
  const author = html.match(/<meta[^>]+name="author"[^>]+content="([^"]+)"/i)?.[1]
    || html.match(/<meta[^>]+property="article:author"[^>]+content="([^"]+)"/i)?.[1] || null;
  const publishedTime = html.match(/<meta[^>]+property="article:published_time"[^>]+content="([^"]+)"/i)?.[1]
    || html.match(/<meta[^>]+name="date"[^>]+content="([^"]+)"/i)?.[1] || null;
  const category = html.match(/<meta[^>]+property="article:section"[^>]+content="([^"]+)"/i)?.[1]
    || html.match(/<meta[^>]+property="article:tag"[^>]+content="([^"]+)"/i)?.[1] || null;
  const publisher = html.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i)?.[1] || null;
  const description = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1]
    || html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] || null;
  const image = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1] || null;
  const title = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1]
    || html.match(/<title>([^<]+)<\/title>/i)?.[1] || null;
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 50000);
  return { author, publishedTime, category, publisher, description, image, title, body };
}

async function processPage(page, env) {
  try {
    const res = await fetch(page.url, { headers: { 'User-Agent': 'NewsExtractorBot/1.0', Accept: 'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return;
    const html = await res.text();
    const meta = extractNewsMeta(html);
    if (!meta.publishedTime && !meta.category) return;
    const [existing] = await sql("SELECT id FROM news_articles WHERE url=$1", [page.url], env);
    if (existing) return;
    let publisherId = null;
    if (meta.publisher) {
      const domainName = new URL(page.url).hostname;
      const [existingPub] = await sql("SELECT id FROM news_publishers WHERE name=$1", [meta.publisher], env);
      if (existingPub) { publisherId = existingPub.id; }
      else {
        const [newPub] = await sql("INSERT INTO news_publishers (name,url) VALUES($1,$2) ON CONFLICT (url) DO UPDATE SET name=EXCLUDED.name RETURNING id", [meta.publisher, domainName], env);
        publisherId = newPub.id;
      }
    }
    await sql("INSERT INTO news_articles (url,headline,description,body,author,publisher_id,publish_date,category,featured_image,is_indexed,indexed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true,NOW()) ON CONFLICT (url) DO NOTHING",
      [page.url, meta.title || page.title || 'Untitled', meta.description || null, meta.body || null, meta.author,
       publisherId, meta.publishedTime ? new Date(meta.publishedTime).toISOString() : null, meta.category, meta.image], env);
  } catch(e) { console.error('News extract error:', page.url, String(e).slice(0,200)); }
}

export default {
  async scheduled(event, env, ctx) {
    try {
      const rows = await sql("SELECT id,url,title,meta_description,crawled_at FROM pages WHERE crawled_at IS NOT NULL ORDER BY crawled_at DESC LIMIT 15", [], env);
      let done = 0;
      for (const r of rows) { try { await processPage(r, env); done++; } catch {} }
      console.log(`News extractor: ${done}/${rows.length}`);
    } catch(e) { console.error('News scheduled error:', String(e)); }
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.searchParams.get('key') !== env.EXTRACTOR_SECRET) return new Response('Unauthorized', { status: 401 });
      const limit = parseInt(url.searchParams.get('limit') || '5', 10);
      const rows = await sql("SELECT id,url,title,meta_description,crawled_at FROM pages WHERE crawled_at IS NOT NULL ORDER BY crawled_at DESC LIMIT $1", [limit], env);
      let done = 0;
      for (const r of rows) { try { await processPage(r, env); done++; } catch {} }
      return new Response(JSON.stringify({ processed: done, total: rows.length }), { headers: { 'Content-Type': 'application/json' } });
    } catch(e) { return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
  },
};
