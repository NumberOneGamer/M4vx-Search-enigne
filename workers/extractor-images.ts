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

function extractImages(html, baseUrl) {
  const imgs = [];
  const regex = /<img[^>]+src\s*=\s*"([^"]+)"[^>]*>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const src = m[1];
    if (!src || src.startsWith('data:') || src.includes('logo') || src.includes('icon') || src.includes('avatar')) continue;
    try {
      const absUrl = new URL(src, baseUrl).href;
      const alt = m[0].match(/alt\s*=\s*"([^"]*)"/i)?.[1] || null;
      const title = m[0].match(/title\s*=\s*"([^"]*)"/i)?.[1] || null;
      const width = m[0].match(/width\s*=\s*"?(\d+)"?/i) ? parseInt(m[0].match(/width\s*=\s*"?(\d+)"?/i)[1]) : null;
      const height = m[0].match(/height\s*=\s*"?(\d+)"?/i) ? parseInt(m[0].match(/height\s*=\s*"?(\d+)"?/i)[1]) : null;
      imgs.push({ url: absUrl, altText: alt, caption: title, width, height });
    } catch {}
  }
  return imgs;
}

async function processPage(page, env) {
  try {
    const res = await fetch(page.url, { headers: { 'User-Agent': 'ImageExtractorBot/1.0', Accept: 'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return;
    const html = await res.text();
    const imgs = extractImages(html, page.url);
    if (!imgs.length) return;
    const urls = imgs.map(i => i.url);
    const existing = new Set((await sql("SELECT url FROM images WHERE url=ANY($1)", [urls], env)).map(r => r.url));
    const values = [];
    for (const img of imgs) {
      if (existing.has(img.url)) continue;
      const esc = s => s ? `'${s.replace(/'/g,"''")}'` : 'NULL';
      values.push(`(${esc(img.url)},${esc(img.altText)},${esc(img.caption)},${esc(page.title)},${esc(page.url)},${img.width || 'NULL'},${img.height || 'NULL'},true,NOW())`);
    }
    for (let i = 0; i < values.length; i += 25) {
      const chunk = values.slice(i, i + 25);
      try { await sql(`INSERT INTO images (url,alt_text,caption,page_title,page_url,width,height,is_indexed,indexed_at) VALUES ${chunk.join(',')} ON CONFLICT (url) DO NOTHING`, [], env); } catch {}
    }
  } catch(e) { console.error('Image extract error:', page.url, String(e).slice(0,200)); }
}

export default {
  async scheduled(event, env, ctx) {
    try {
      const rows = await sql("SELECT id,url,title,crawled_at FROM pages WHERE crawled_at IS NOT NULL ORDER BY crawled_at DESC LIMIT 10", [], env);
      let done = 0;
      for (const r of rows) { try { await processPage(r, env); done++; } catch {} }
      console.log(`Image extractor: ${done}/${rows.length}`);
    } catch(e) { console.error('Image scheduled error:', String(e)); }
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.searchParams.get('key') !== env.EXTRACTOR_SECRET) return new Response('Unauthorized', { status: 401 });
      const limit = parseInt(url.searchParams.get('limit') || '5', 10);
      const rows = await sql("SELECT id,url,title,crawled_at FROM pages WHERE crawled_at IS NOT NULL ORDER BY crawled_at DESC LIMIT $1", [limit], env);
      let done = 0;
      for (const r of rows) { try { await processPage(r, env); done++; } catch {} }
      return new Response(JSON.stringify({ processed: done, total: rows.length }), { headers: { 'Content-Type': 'application/json' } });
    } catch(e) { return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
  },
};
