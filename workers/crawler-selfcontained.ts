// @ts-nocheck
async function sql(query, params, env) {
  const m = env.DATABASE_URL.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
  if (!m) throw new Error('Cannot parse DATABASE_URL');
  const [, , , host] = m;
  const endpoint = `https://${host}/sql`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Neon-Connection-String': env.DATABASE_URL, 'Neon-Raw-Text-Output': 'true', 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, params }),
  });
  if (!res.ok) throw new Error(`DB error: ${await res.text()}`);
  const data = await res.json();
  return data.rows || data;
}
function simpleHash(text) { let hash = 0; for (let i = 0; i < text.length; i++) { hash = ((hash << 5) - hash) + text.charCodeAt(i); hash |= 0; } return Math.abs(hash).toString(36); }
function matchTag(html, tag, start) { if (!html) return null; const lo = html.toLowerCase(), os = lo.indexOf(`<${tag}`, start); if (os === -1) return null; const te = html.indexOf('>', os); if (te === -1) return null; const ct = `</${tag}>`, ci = lo.indexOf(ct, te + 1); return ci === -1 ? null : { inner: html.slice(te + 1, ci), end: ci + ct.length }; }
function extractAttr(html, attr) { if (!html) return null; const m = new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, 'i').exec(html); return m?.[1] ?? null; }
function stripTags(t) { return (t||'').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }
function removeEls(html, tags) { let r = html||''; for (const t of tags) { const n = t.replace(/[.#].*$/, '').trim()||'div'; r = r.replace(new RegExp(`<${n}[^>]*>[\\s\\S]*?<\\/${n}>`,'gi'),'').replace(new RegExp(`<${n}[^>]*\\/>`,'gi'),''); } return r; }
function parseHtml(html, baseUrl) {
  const cleaned = removeEls(html, ['script','style','noscript','iframe','svg','nav','footer','header','aside']);
  const title = stripTags(matchTag(cleaned, 'title', 0)?.inner||'') || extractAttr((cleaned.match(/<meta[^>]+property="og:title"[^>]*>/i)||[])[0], 'content') || stripTags(matchTag(cleaned, 'h1', 0)?.inner||'') || '';
  const metaDescription = extractAttr((cleaned.match(/<meta[^>]+name="description"[^>]*>/i)||[])[0], 'content') || extractAttr((cleaned.match(/<meta[^>]+property="og:description"[^>]*>/i)||[])[0], 'content') || '';
  const headings = [];
  for (let l = 1; l <= 6; l++) { let p = 0; while (p < cleaned.length) { const m = matchTag(cleaned, `h${l}`, p); if (!m) break; const t = stripTags(m.inner); if (t) headings.push(t); p = m.end; } }
  let mainHtml = '';
  for (const sel of ['main','article','[role="main"]','.content','.post','.entry','#content','#main']) {
    const n = sel.replace(/[.#].*$/, '').trim()||'div';
    if (sel.includes('.')||sel.includes('#')||sel.includes('[')) { const pat = sel.replace(/\./g,'\\bclass\\s*=\\"[^\\"]*').replace(/#/g,'\\bid\\s*=\\"').replace(/\[/g,'\\b').replace(/\]/g,'\\b'); const m = new RegExp(`<${n}[^>]*${pat}[^>]*>[\\s\\S]*?<\\/${n}>`,'i').exec(cleaned); if (m) { mainHtml = m[0]; break; } } else { const m = matchTag(cleaned, n, 0); if (m) { mainHtml = m.inner; break; } }
  }
  if (!mainHtml) { const b = matchTag(cleaned, 'body', 0); mainHtml = b?.inner || cleaned; }
  const content = stripTags(removeEls(mainHtml, ['script','style','noscript','iframe','svg']));
  const baseHost = new URL(baseUrl).hostname, internalLinks = [], externalLinks = [];
  const lr = /<a[^>]+href\s*=\s*"([^"]*)"[^>]*>/gi; let lm;
  while ((lm = lr.exec(cleaned)) !== null) { const h = lm[1]; if (!h||h.startsWith('#')||h.startsWith('javascript:')) continue; try { const abs = new URL(h,baseUrl).href.replace(/\/$/,''); const p = new URL(abs); if (p.hostname===baseHost) { if (!internalLinks.includes(abs)) internalLinks.push(abs); } else { if (!externalLinks.includes(abs)) externalLinks.push(abs); } } catch {} }
  const c = content || '';
  return { title, metaDescription, headings, content: c, wordCount: c.split(/\s+/).filter(Boolean).length, internalLinks, externalLinks, contentHash: simpleHash(c.slice(0,1e4)), contentType: /<meta[^>]+property="article:published_time"[^>]*>/i.test(cleaned) ? 'article' : 'webpage' };
}
const UA = 'SearchEngineBot/1.0';
async function processUrl(row, env) {
  const { id, domain_id, url, depth } = row;
  try {
    const domain = new URL(url).hostname;
    try {
      const rr = await fetch(`https://${domain}/robots.txt`, { headers:{'User-Agent':UA}, signal:AbortSignal.timeout(5000) });
      if (rr.ok) {
        const t = await rr.text();
        const lines = t.split(/\r?\n/).map(l=>l.trim());
        let agent = '', blocked = false;
        for (const l of lines) { if (/^user-agent:\s*/i.test(l)) agent = l.replace(/^user-agent:\s*/i,'').trim().toLowerCase(); if (agent === '*' && /^disallow:\s*\/\s*$/i.test(l)) { blocked = true; break; } }
        if (blocked) { await sql("UPDATE crawl_queue SET status='failed',error_message=$1,completed_at=NOW() WHERE id=$2",['Blocked by robots.txt',id], env); return; }
      }
    } catch {}
    const res = await fetch(url, { headers:{'User-Agent':UA,Accept:'text/html,application/xhtml+xml'}, signal:AbortSignal.timeout(10000) });
    if (!res.ok) {
      const attempts=(row.attempts||0)+1; const max=parseInt(env.CRAWLER_MAX_ATTEMPTS||'3',10);
      if(attempts>=max) { await sql("UPDATE crawl_queue SET status='failed',error_message=$1,attempts=$2,completed_at=NOW() WHERE id=$3",[`HTTP ${res.status}`,attempts,id], env); }
      else { await sql("UPDATE crawl_queue SET status='pending',error_message=$1,attempts=$2,scheduled_at=NOW()+($2||' minutes')::interval WHERE id=$3",[`HTTP ${res.status}`,attempts,id], env); }
      return;
    }
    const html = await res.text();
    const parsed = parseHtml(html, url);
    const existing = await sql('SELECT id FROM pages WHERE url=$1',[url],env).then(r=>r[0]||null);
    if (existing) { await sql('UPDATE pages SET title=$1,meta_description=$2,headings=$3,content=$4,word_count=$5,content_hash=$6,http_status=$7,crawled_at=NOW(),updated_at=NOW() WHERE id=$8',[parsed.title,parsed.metaDescription,parsed.headings.join('\n'),parsed.content,parsed.wordCount,parsed.contentHash,res.status,existing.id], env); }
    else { await sql('INSERT INTO pages (domain_id,url,title,meta_description,headings,content,word_count,content_hash,http_status,content_type,crawl_depth,crawled_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())',[domain_id,url,parsed.title,parsed.metaDescription,parsed.headings.join('\n'),parsed.content,parsed.wordCount,parsed.contentHash,res.status,parsed.contentType,depth], env); }
    await sql("UPDATE crawl_queue SET status='completed',completed_at=NOW() WHERE id=$1",[id], env);
    if (depth < 5) {
      const allLinks = [...parsed.internalLinks, ...parsed.externalLinks];
      const exist = new Set((await sql("SELECT url FROM crawl_queue WHERE url=ANY($1)",[allLinks.slice(0,200)],env)).map(r=>r.url));
      const existPg = new Set((await sql("SELECT url FROM pages WHERE url=ANY($1)",[allLinks.slice(0,200)],env)).map(r=>r.url));
      for (const link of allLinks.slice(0,30)) {
        if (!exist.has(link) && !existPg.has(link)) {
          const ln = new URL(link).hostname; let [dom] = await sql("SELECT id FROM domains WHERE name=$1",[ln],env);
          if (!dom) { const dr = await sql("INSERT INTO domains (name) VALUES($1) RETURNING id",[ln],env); dom = dr[0]; }
          await sql("INSERT INTO crawl_queue (domain_id,url,priority,depth,status) VALUES($1,$2,$3,$4,'pending') ON CONFLICT (url) DO NOTHING",[dom.id,link,parsed.externalLinks.includes(link)?1:5,depth+1], env);
        }
      }
    }
  } catch(e) {
    try { const attempts=(row.attempts||0)+1; const max=parseInt(env.CRAWLER_MAX_ATTEMPTS||'3',10); if(attempts>=max) { await sql("UPDATE crawl_queue SET status='failed',error_message=$1,attempts=$2,completed_at=NOW() WHERE id=$3",[String(e),attempts,id], env); } else { await sql("UPDATE crawl_queue SET status='pending',error_message=$1,attempts=$2,scheduled_at=NOW()+($2||' minutes')::interval WHERE id=$3",[String(e),attempts,id], env); } } catch {}
  }
}
export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.searchParams.get('key') !== env.CRAWLER_SECRET) return new Response('Unauthorized', { status: 401 });
      if (url.pathname==='/debug') { return new Response(JSON.stringify({ DATABASE_URL_set:!!env.DATABASE_URL, DATABASE_URL_prefix:env.DATABASE_URL?env.DATABASE_URL.slice(0,20)+'...':'NOT SET', CRAWLER_SECRET_set:!!env.CRAWLER_SECRET }),{headers:{'Content-Type':'application/json'}}); }
      if (url.pathname==='/check') {
        const u=url.searchParams.get('url'); if(!u) return new Response(JSON.stringify({error:'missing ?url='}),{status:400,headers:{'Content-Type':'application/json'}});
        const steps = [];
        try { const d=new URL(u); steps.push({step:'parse-url',ok:true,host:d.hostname});
          try { const rr=await fetch(`https://${d.hostname}/robots.txt`,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(5000)}); const t=rr.ok?await rr.text():''; const lines=(t||'').split(/\r?\n/).map(l=>l.trim()); let agent='',blocked=false; for(const l of lines){if(/^user-agent:\s*/i.test(l))agent=l.replace(/^user-agent:\s*/i,'').trim().toLowerCase();if(agent==='*'&&/^disallow:\s*\/\s*$/i.test(l)){blocked=true;break}} steps.push({step:'robots-txt',ok:true,status:rr.status,blocked}); } catch(e) { steps.push({step:'robots-txt',ok:false,error:String(e)}); }
          try { const res=await fetch(u,{headers:{'User-Agent':UA,Accept:'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(10000)}); const html=await res.text(); steps.push({step:'fetch',ok:true,status:res.status,size:html.length});
            try { const p=parseHtml(html,u); steps.push({step:'parse',ok:true,title:p.title,wordCount:p.wordCount,linkCount:p.internalLinks.length,externalLinkCount:p.externalLinks.length}); } catch(e) { steps.push({step:'parse',ok:false,error:String(e)}); }
          } catch(e) { steps.push({step:'fetch',ok:false,error:String(e)}); }
        } catch(e) { steps.push({step:'parse-url',ok:false,error:String(e)}); }
        return new Response(JSON.stringify({url:u,steps}),{headers:{'Content-Type':'application/json'}});
      }
      if (url.pathname==='/seed'||url.pathname==='/add') {
        const urls = (url.searchParams.get('urls')||'').split(',').filter(Boolean);
        if (!urls.length) return new Response(JSON.stringify({error:'missing ?urls= comma-separated'}),{status:400,headers:{'Content-Type':'application/json'}});
        let added = 0;
        for (const u of urls) {
          try {
            const nu = new URL(u).href.replace(/\/$/,'');
            const domain = nu.match(/https?:\/\/([^\/]+)/)[1];
            let [dom] = await sql("SELECT id FROM domains WHERE name=$1",[domain],env);
            if (!dom) { const dr = await sql("INSERT INTO domains (name) VALUES($1) RETURNING id",[domain],env); dom = dr[0]; }
            const [exist] = await sql("SELECT id FROM crawl_queue WHERE url=$1 AND status='pending'",[nu],env);
            const [existPage] = await sql("SELECT id FROM pages WHERE url=$1",[nu],env);
            if (!exist && !existPage) { await sql("INSERT INTO crawl_queue (domain_id,url,priority,depth,status) VALUES($1,$2,10,0,'pending')",[dom.id,nu],env); added++; }
          } catch(e) {}
        }
        return new Response(JSON.stringify({ added, total: urls.length, mode: 'seeder' }),{headers:{'Content-Type':'application/json'}});
      }
      if (url.pathname==='/errors') { const r=await sql("SELECT DISTINCT error_message,COUNT(*) c FROM crawl_queue WHERE status='failed' GROUP BY error_message",[],env); return new Response(JSON.stringify({errors:r}),{headers:{'Content-Type':'application/json'}}); }
      if (url.pathname==='/reset-blocked') { const b=Number((await sql("SELECT COUNT(*) c FROM crawl_queue WHERE status='failed' AND error_message ILIKE '%blocked%'",[],env))[0]?.c||0); await sql("UPDATE crawl_queue SET status='pending',attempts=0,error_message=NULL,scheduled_at=NULL,completed_at=NULL,started_at=NULL WHERE status='failed' AND error_message ILIKE '%blocked%'",[],env); return new Response(JSON.stringify({reset:b}),{headers:{'Content-Type':'application/json'}}); }
      try {
        const bs = parseInt(url.searchParams.get('batch')||'20',10);
        const maxB = parseInt(env.CRAWLER_BATCH_MAX||'50',10);
        const actual = Math.min(bs, maxB);
        try { await sql("UPDATE crawl_queue SET status='pending',started_at=NULL WHERE status='running' AND started_at<NOW()-INTERVAL'1 minute'",[],env); } catch {}
        const rows = await sql("SELECT * FROM crawl_queue WHERE status='pending' AND (scheduled_at IS NULL OR scheduled_at<NOW()) ORDER BY priority DESC,RANDOM() LIMIT $1",[actual],env);
        if (!rows.length) return new Response(JSON.stringify({processed:0}),{headers:{'Content-Type':'application/json'}});
        let processed=0, completed=0, failed=0;
        for (const r of rows) {
          try { await processUrl(r, env); processed++; completed++; }
          catch(e) { processed++; failed++; }
        }
        const st = (await sql("SELECT (SELECT COUNT(*) FROM crawl_queue WHERE status='pending')q,(SELECT COUNT(*) FROM crawl_queue WHERE status='completed')c,(SELECT COUNT(*) FROM crawl_queue WHERE status='failed')f",[],env))[0];
        return new Response(JSON.stringify({processed,completed,failed,stats:{queue_size:Number(st.q),completed:Number(st.c),failed:Number(st.f)}}),{headers:{'Content-Type':'application/json'}});
      } catch(e) { return new Response(JSON.stringify({error:String(e)}),{status:500,headers:{'Content-Type':'application/json'}}); }
    } catch(e) {
      return new Response(JSON.stringify({fatal:String(e),stack:e.stack}),{status:500,headers:{'Content-Type':'application/json'}});
    }
  },
};
