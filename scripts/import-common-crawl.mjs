import { gunzipSync } from 'zlib';

const CRAWL = process.env.CC_CRAWL || 'CC-MAIN-2026-21';
const NUM_FILES = parseInt(process.env.CC_FILES || '10', 10);
const MAX_PAGES = parseInt(process.env.CC_MAX_PAGES || '200000', 10);
const BATCH_SIZE = 50;
const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const HOST = DB_URL.match(/@([^/]+)/)[1];
const ENDPOINT = `https://${HOST}/sql`;

async function query(q, params = []) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Neon-Connection-String': DB_URL, 'Neon-Raw-Text-Output': 'true', 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, params }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`DB ${res.status}: ${t.slice(0,200)}`); }
  return res.json();
}

function hostname(url) { try { return new URL(url).hostname; } catch { return null; } }

async function getOrCreateDomain(host) {
  const r = await query('SELECT id FROM domains WHERE url = $1', [host]);
  if (r.rows?.length) return r.rows[0].id;
  const r2 = await query("INSERT INTO domains (url, name, authority_score, crawl_rate) VALUES ($1, $1, 1.0, 1) RETURNING id", [host]);
  return r2.rows[0].id;
}

function parseWet(buf) {
  const records = [];
  const text = buf.toString('utf-8');
  let pos = 0;
  while (pos < text.length) {
    const ws = text.indexOf('WARC/', pos);
    if (ws === -1) break;
    pos = ws;
    const he = text.indexOf('\r\n\r\n', pos);
    if (he === -1) break;
    const hb = text.slice(pos, he);
    const headers = {};
    for (const line of hb.split('\r\n')) {
      const ci = line.indexOf(': ');
      if (ci > 0) headers[line.slice(0, ci).trim()] = line.slice(ci + 2).trim();
    }
    const cl = parseInt(headers['Content-Length'], 10);
    if (isNaN(cl)) { pos = he + 4; continue; }
    const cs = he + 4;
    const content = text.slice(cs, cs + cl);
    pos = cs + cl;
    if (headers['WARC-Type'] !== 'conversion' || headers['Content-Type'] !== 'text/plain') continue;
    const url = headers['WARC-Target-URI'] || '';
    const hn = hostname(url);
    if (!hn) continue;
    const body = content.replace(/^[ \t]*\r?\n/, '');
    const fl = body.split('\n')[0]?.trim() || '';
    const title = fl.length > 3 && fl.length < 500 ? fl : hn;
    const rest = body.replace(/^.*\n/, '').trim();
    const fc = title === hn ? body : rest;
    records.push({ url, hn, title, content: fc, words: fc ? fc.split(/\s+/).filter(Boolean).length : 0, date: headers['WARC-Date'] || '' });
  }
  return records;
}

async function downloadAndParse(path) {
  const url = `https://data.commoncrawl.org/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`    ${(buf.length/1024/1024).toFixed(1)} MB compressed`);
  const dec = gunzipSync(buf);
  console.log(`    ${(dec.length/1024/1024).toFixed(1)} MB decompressed`);
  return parseWet(dec);
}

async function insertRecords(records) {
  let inserted = 0, skipped = 0;
  const dc = {};
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const vals = [];
    for (const r of batch) {
      if (!dc[r.hn]) dc[r.hn] = await getOrCreateDomain(r.hn);
      const did = dc[r.hn];
      const esc = s => s ? `'${String(s).replace(/'/g,"''")}'` : 'NULL';
      vals.push(`(${did},${esc(r.url)},${esc(r.title)},${esc(r.content)},${r.words},${esc(r.date)},NOW(),NOW())`);
    }
    try {
      const r2 = await query(`INSERT INTO pages (domain_id,url,title,content,word_count,crawled_at,created_at,updated_at) VALUES ${vals.join(',')} ON CONFLICT (url) DO NOTHING RETURNING id`);
      inserted += (r2.rows || []).length;
      skipped += batch.length - (r2.rows || []).length;
    } catch (e) { skipped += batch.length; }
    process.stdout.write(`\r    ${Math.round((i+BATCH_SIZE)/records.length*100)}% (${inserted} in, ${skipped} skip)`);
  }
  console.log();
  return { inserted, skipped };
}

async function main() {
  console.log(`Common Crawl Import (streaming)`);
  console.log(`  Crawl: ${CRAWL}, Files: ${NUM_FILES}, Max: ${MAX_PAGES}\n`);

  console.log('[1] Fetching WET index...');
  const idxRes = await fetch(`https://data.commoncrawl.org/crawl-data/${CRAWL}/wet.paths.gz`);
  if (!idxRes.ok) throw new Error(`Index HTTP ${idxRes.status}`);
  const paths = gunzipSync(Buffer.from(await idxRes.arrayBuffer())).toString('utf-8').trim().split('\n').filter(Boolean).map(p => p.trim());
  console.log(`  ${paths.length} WET files\n`);

  const toDL = paths.slice(0, NUM_FILES);
  let totalInserted = 0, totalSkipped = 0, totalPages = 0;

  for (let fi = 0; fi < toDL.length; fi++) {
    if (totalInserted >= MAX_PAGES) break;
    console.log(`[${fi+1}/${toDL.length}] ${toDL[fi].split('/').pop()}`);
    try {
      const records = await downloadAndParse(toDL[fi]);
      if (!records.length) { console.log('    No records'); continue; }
      totalPages += records.length;
      console.log(`    ${records.length} pages`);
      console.log(`    Inserting...`);
      const { inserted, skipped } = await insertRecords(records);
      totalInserted += inserted;
      totalSkipped += skipped;
      // Free memory before next file
      records.length = 0;
    } catch (e) { console.log(`    ERROR: ${String(e).slice(0,150)}`); }
    console.log(`    Running total: ${totalInserted} inserted, ${totalSkipped} skipped\n`);
  }

  const mb = (toDL.length * 65).toFixed(0);
  console.log(`=== DONE ===`);
  console.log(`  Processed: ${totalPages} pages from ${toDL.length} WET files`);
  console.log(`  Inserted:  ${totalInserted}`);
  console.log(`  Skipped:   ${totalSkipped}`);
  console.log(`  Downloaded ~${mb} MB on cloud runner`);
  console.log(`\n  Run your indexer next: npm run extract:all`);
}

main().catch(e => { console.error('\nFatal:', e.message); process.exit(1); });
