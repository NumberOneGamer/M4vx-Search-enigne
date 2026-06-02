// @ts-nocheck
const VIDEO_PLATFORMS = [
  { host: 'youtube.com', extract: (url) => { const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/); return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null; } },
  { host: 'youtu.be', extract: (url) => { const m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/); return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null; } },
  { host: 'vimeo.com', extract: (url) => { const m = url.match(/vimeo\.com\/(\d+)/); return m ? `https://player.vimeo.com/video/${m[1]}` : null; } },
  { host: 'dailymotion.com', extract: (url) => { const m = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/); return m ? `https://www.dailymotion.com/embed/video/${m[1]}` : null; } },
];
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

function extractVideos(html, baseUrl) {
  const vids = [];
  const iframeRegex = /<iframe[^>]+src\s*=\s*"([^"]+)"[^>]*>[\s\S]*?<\/iframe>/gi;
  let m;
  while ((m = iframeRegex.exec(html)) !== null) {
    try {
      const absUrl = new URL(m[1], baseUrl).href;
      const host = new URL(absUrl).hostname.replace('www.', '');
      const platform = VIDEO_PLATFORMS.find(p => host.includes(p.host));
      if (platform) vids.push({ url: absUrl, title: null, embedUrl: platform.extract(absUrl) || absUrl, source: platform.host });
    } catch {}
  }
  const linkRegex = /<a[^>]+href\s*=\s*"([^"]+)"[^>]*>(.*?)<\/a>/gi;
  while ((m = linkRegex.exec(html)) !== null) {
    try {
      const absUrl = new URL(m[1], baseUrl).href;
      const host = new URL(absUrl).hostname.replace('www.', '');
      const platform = VIDEO_PLATFORMS.find(p => host.includes(p.host));
      if (platform && !vids.some(v => v.url === absUrl)) {
        const title = m[2].replace(/<[^>]*>/g, '').trim() || null;
        vids.push({ url: absUrl, title, embedUrl: platform.extract(absUrl) || absUrl, source: platform.host });
      }
    } catch {}
  }
  return vids;
}

async function processPage(page, env) {
  try {
    const res = await fetch(page.url, { headers: { 'User-Agent': 'VideoExtractorBot/1.0', Accept: 'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return;
    const html = await res.text();
    const vids = extractVideos(html, page.url);
    if (!vids.length) return;
    const urls = vids.map(v => v.url);
    const existing = new Set((await sql("SELECT url FROM videos WHERE url=ANY($1)", [urls], env)).map(r => r.url));
    const values = [];
    for (const v of vids) {
      if (existing.has(v.url)) continue;
      const esc = s => s ? `'${s.replace(/'/g,"''")}'` : 'NULL';
      const title = v.title || page.title || 'Untitled';
      const source = v.source || (v.url.includes('youtube') ? 'youtube' : v.url.includes('vimeo') ? 'vimeo' : 'other');
      values.push(`(${esc(v.url)},${esc(title)},${esc(v.embedUrl)},${esc(source)},true,NOW())`);
    }
    for (let i = 0; i < values.length; i += 25) {
      try { await sql(`INSERT INTO videos (url,title,embed_url,source,is_indexed,indexed_at) VALUES ${values.slice(i,i+25).join(',')} ON CONFLICT (url) DO NOTHING`, [], env); } catch {}
    }
  } catch(e) { console.error('Video extract error:', page.url, String(e).slice(0,200)); }
}

export default {
  async scheduled(event, env, ctx) {
    try {
      const rows = await sql("SELECT id,url,title,crawled_at FROM pages WHERE crawled_at IS NOT NULL ORDER BY crawled_at DESC LIMIT 10", [], env);
      let done = 0;
      for (const r of rows) { try { await processPage(r, env); done++; } catch {} }
      console.log(`Video extractor: ${done}/${rows.length}`);
    } catch(e) { console.error('Video scheduled error:', String(e)); }
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
