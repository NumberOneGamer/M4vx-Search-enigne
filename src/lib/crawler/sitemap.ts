interface SitemapResult {
  urls: string[];
  sitemaps: string[];
}

async function fetchXml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SearchEngineBot/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractUrlsFromSitemap(xml: string): string[] {
  const urls: string[] = [];
  const locRegex = /<loc[^>]*>([^<]+)<\/loc>/gi;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push(match[1].trim());
  }
  return urls;
}

function extractSitemapRefs(xml: string): string[] {
  const refs: string[] = [];
  const locRegex = /<loc[^>]*>([^<]+)<\/loc>/gi;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    refs.push(match[1].trim());
  }
  return refs;
}

export async function discoverSitemaps(domain: string): Promise<string[]> {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const commonPaths = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap/',
    '/sitemap-index.xml',
    '/sitemaps/sitemap.xml',
  ];

  const found: string[] = [];
  for (const path of commonPaths) {
    const url = `${baseUrl.replace(/\/+$/, '')}${path}`;
    const xml = await fetchXml(url);
    if (xml) {
      found.push(url);
      const refs = extractSitemapRefs(xml);
      found.push(...refs.filter((r) => !found.includes(r)));
    }
  }

  return found;
}

export async function parseSitemap(url: string): Promise<SitemapResult> {
  const xml = await fetchXml(url);
  if (!xml) return { urls: [], sitemaps: [] };

  const urls = extractUrlsFromSitemap(xml);
  const sitemaps = extractSitemapRefs(xml);

  return { urls, sitemaps };
}

export async function discoverAndParseSitemaps(domain: string): Promise<string[]> {
  const sitemapUrls = await discoverSitemaps(domain);
  const allUrls: string[] = [];

  for (const sitemapUrl of sitemapUrls) {
    const { urls, sitemaps } = await parseSitemap(sitemapUrl);
    allUrls.push(...urls);

    for (const subSitemap of sitemaps) {
      const { urls: subUrls } = await parseSitemap(subSitemap);
      allUrls.push(...subUrls);
    }
  }

  return [...new Set(allUrls)];
}
