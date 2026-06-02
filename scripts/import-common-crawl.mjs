import { neon } from '@neondatabase/serverless';
import { gunzipSync } from 'zlib';

const sql = neon(process.env.DATABASE_URL);

const CRAWL = process.env.CC_CRAWL || 'CC-MAIN-2026-17';
const NUM_FILES = parseInt(process.env.CC_FILES || '3', 10);
const MAX_PAGES = parseInt(process.env.CC_MAX_PAGES || '50000', 10);
const BATCH_SIZE = 50;

function parseDomain(url) {
  try { return new URL(url).hostname; } catch { return null; }
}

async function getOrCreateDomain(hostname) {
  const existing = await sql`SELECT id FROM domains WHERE url = ${hostname} LIMIT 1`;
  if (existing.length > 0) return existing[0].id;
  const [row] = await sql`INSERT INTO domains (url, name, authority_score, crawl_rate) VALUES (${hostname}, ${hostname}, 1.0, 1) RETURNING id`;
  return row.id;
}

function parseWetFile(buf) {
  const records = [];
  const text = buf.toString('utf-8');
  let pos = 0;

  while (pos < text.length) {
    const warcStart = text.indexOf('WARC/', pos);
    if (warcStart === -1) break;
    pos = warcStart;

    const headerEnd = text.indexOf('\r\n\r\n', pos);
    if (headerEnd === -1) break;
    const headerBlock = text.slice(pos, headerEnd);

    const lines = headerBlock.split('\r\n');
    const headers = {};
    for (const line of lines) {
      const colon = line.indexOf(': ');
      if (colon > 0) headers[line.slice(0, colon).trim()] = line.slice(colon + 2).trim();
    }

    const contentLength = parseInt(headers['Content-Length'], 10);
    if (isNaN(contentLength)) { pos = headerEnd + 4; continue; }

    const contentStart = headerEnd + 4;
    const content = text.slice(contentStart, contentStart + contentLength);
    pos = contentStart + contentLength;

    if (headers['WARC-Type'] !== 'conversion' || headers['Content-Type'] !== 'text/plain') continue;

    const url = headers['WARC-Target-URI'] || '';
    const hostname = parseDomain(url);
    if (!hostname) continue;

    const dateStr = headers['WARC-Date'];
    const date = dateStr ? new Date(dateStr) : new Date();

    const body = content.replace(/^[ \t]*\r?\n/, '');
    const firstLine = body.split('\n')[0]?.trim() || '';
    const title = firstLine.length > 3 && firstLine.length < 500 ? firstLine : hostname;
    const restContent = body.replace(/^.*\n/, '').trim();
    const fullContent = title === hostname ? body : restContent;
    const wordCount = fullContent ? fullContent.split(/\s+/).filter(Boolean).length : 0;

    records.push({ url, hostname, title, content: fullContent, wordCount, date });
  }

  return records;
}

async function importPages(records) {
  let inserted = 0, skipped = 0;
  const domainCache = {};

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const values = [];

    for (const rec of batch) {
      if (!domainCache[rec.hostname]) domainCache[rec.hostname] = await getOrCreateDomain(rec.hostname);
      const did = domainCache[rec.hostname];
      const esc = s => s ? `'${String(s).replace(/'/g, "''")}'` : 'NULL';
      values.push(`(${did},${esc(rec.url)},${esc(rec.title)},${esc(rec.content)},${rec.wordCount},${esc(rec.date.toISOString())},NOW(),NOW())`);
    }

    try {
      const r = await sql(`INSERT INTO pages (domain_id, url, title, content, word_count, crawled_at, created_at, updated_at) VALUES ${values.join(',')} ON CONFLICT (url) DO NOTHING RETURNING id`);
      inserted += r.length;
      skipped += batch.length - r.length;
    } catch (e) {
      console.error(`  Batch error: ${String(e).slice(0, 150)}`);
      skipped += batch.length;
    }
    process.stdout.write(`\r  Progress: ~${Math.round((i + BATCH_SIZE) / records.length * 100)}% (${inserted} in, ${skipped} skip)`);
  }
  return { inserted, skipped };
}

async function main() {
  console.log(`Common Crawl Import`);
  console.log(`  Crawl: ${CRAWL}, Files: ${NUM_FILES}, Max pages: ${MAX_PAGES}\n`);

  const indexPath = `https://data.commoncrawl.org/crawl-data/${CRAWL}/wet.paths.gz`;
  console.log(`[1] Fetching WET index...`);
  const idxRes = await fetch(indexPath);
  if (!idxRes.ok) throw new Error(`Index HTTP ${idxRes.status}`);
  const wetPaths = gunzipSync(Buffer.from(await idxRes.arrayBuffer())).toString('utf-8').trim().split('\n').filter(Boolean).map(p => p.trim());
  console.log(`  ${wetPaths.length} WET files available\n`);

  const toDownload = wetPaths.slice(0, NUM_FILES);
  console.log(`[2] Downloading & parsing ${toDownload.length} files...`);
  let allRecords = [];

  for (let fi = 0; fi < toDownload.length; fi++) {
    const url = `https://data.commoncrawl.org/${toDownload[fi]}`;
    console.log(`  [${fi + 1}/${toDownload.length}] ${toDownload[fi].split('/').pop()}`);
    try {
      const res = await fetch(url);
      if (!res.ok) { console.log(`    SKIP HTTP ${res.status}`); continue; }
      const raw = Buffer.from(await res.arrayBuffer());
      console.log(`    ${(raw.length / 1024 / 1024).toFixed(1)} MB compressed`);

      const dec = gunzipSync(raw);
      console.log(`    ${(dec.length / 1024 / 1024).toFixed(1)} MB decompressed`);

      const records = parseWetFile(dec);
      console.log(`    ${records.length} pages parsed`);
      allRecords.push(...records);
      if (allRecords.length >= MAX_PAGES) { allRecords.length = MAX_PAGES; break; }
    } catch (e) { console.log(`    ERROR: ${String(e).slice(0, 200)}`); }
  }

  if (!allRecords.length) { console.log('\nNo records. Exiting.'); return; }

  console.log(`\n[3] Importing ${allRecords.length} pages to Neon...`);
  const { inserted, skipped } = await importPages(allRecords);

  const mb = ((toDownload.length * 70)).toFixed(0);
  console.log(`\n\n=== DONE ===`);
  console.log(`  Downloaded: ~${mb} MB (${toDownload.length} WET files)`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`\n  Run your content indexer next to extract news/images/videos.`);
}

main().catch(e => { console.error('\nFatal:', e); process.exit(1); });
