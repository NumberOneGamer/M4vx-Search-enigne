export interface ParsedPage {
  title: string;
  metaDescription: string;
  headings: string[];
  content: string;
  internalLinks: string[];
  externalLinks: string[];
  wordCount: number;
  contentType: string;
  contentHash: string;
}

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function matchTag(html: string, tagName: string, start: number): { tag: string; inner: string; end: number } | null {
  const regex = new RegExp(`<${tagName}(\\s[^>]*)?>`, 'i');
  regex.lastIndex = start;
  const openMatch = regex.exec(html);
  if (!openMatch) return null;

  const openEnd = openMatch.index + openMatch[0].length;
  const closeTag = `</${tagName}>`;
  const closeIdx = html.toLowerCase().indexOf(closeTag, openEnd);
  if (closeIdx === -1) return null;

  const inner = html.slice(openEnd, closeIdx);
  return { tag: openMatch[0], inner, end: closeIdx + closeTag.length };
}

function extractAttr(html: string, attr: string): string | null {
  const regex = new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, 'i');
  const match = regex.exec(html);
  return match ? match[1] : null;
}

function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function removeElements(html: string, selectors: string[]): string {
  let result = html;
  for (const sel of selectors) {
    const tags = sel.split(',').map(s => s.trim());
    for (const tag of tags) {
      const name = tag.replace(/[.#].*$/, '').trim() || 'div';
      const regex = new RegExp(`<${name}[^>]*>[\\s\\S]*?<\\/${name}>`, 'gi');
      result = result.replace(regex, '');
      result = result.replace(new RegExp(`<${name}[^>]*\\/>`, 'gi'), '');
    }
  }
  return result;
}

export function parseHtml(html: string, baseUrl: string): ParsedPage {
  let cleaned = removeElements(html, [
    'script', 'style', 'noscript', 'iframe', 'svg',
    'nav', 'footer', 'header', 'aside',
    '.sidebar', '.comments', '.advertisement', '.menu', '.nav',
  ]);

  let title =
    stripTags(matchTag(cleaned, 'title', 0)?.inner || '') ||
    extractAttr(cleaned.match(/<meta[^>]+property="og:title"[^>]*>/i)?.[0] || '', 'content') ||
    stripTags(matchTag(cleaned, 'h1', 0)?.inner || '') ||
    '';

  const metaDescMatch = cleaned.match(/<meta[^>]+name="description"[^>]*>/i);
  const metaDescOgMatch = cleaned.match(/<meta[^>]+property="og:description"[^>]*>/i);

  const metaDescription =
    extractAttr(metaDescMatch?.[0] || '', 'content') ||
    extractAttr(metaDescOgMatch?.[0] || '', 'content') ||
    '';

  const headings: string[] = [];
  for (let level = 1; level <= 6; level++) {
    let pos = 0;
    while (pos < cleaned.length) {
      const hTag = `h${level}`;
      const matched = matchTag(cleaned, hTag, pos);
      if (!matched) break;
      const text = stripTags(matched.inner);
      if (text) headings.push(text);
      pos = matched.end;
    }
  }

  const selectors = ['main', 'article', '[role="main"]', '.content', '.post', '.entry', '#content', '#main'];
  let mainHtml = '';
  for (const sel of selectors) {
    const name = sel.replace(/[.#].*$/, '').trim() || 'div';
    const attrFilter = sel.includes('.') || sel.includes('#') || sel.includes('[');
    if (attrFilter) {
      const attrPattern = sel
        .replace(/\./g, '\\bclass\\s*=\\"[^\\"]*')
        .replace(/#/g, '\\bid\\s*=\\"')
        .replace(/\[/g, '\\b')
        .replace(/\]/g, '\\b');
      const attrRegex = new RegExp(`<${name}[^>]*${attrPattern}[^>]*>[\\s\\S]*?<\\/${name}>`, 'i');
      const m = attrRegex.exec(cleaned);
      if (m) { mainHtml = m[0]; break; }
    } else {
      const m = matchTag(cleaned, name, 0);
      if (m) { mainHtml = cleaned.slice(m.tag.length, m.end - `</${name}>`.length); break; }
    }
  }

  if (!mainHtml) {
    const bodyMatch = matchTag(cleaned, 'body', 0);
    mainHtml = bodyMatch?.inner || cleaned;
  }

  mainHtml = removeElements(mainHtml, ['script', 'style', 'noscript', 'iframe', 'svg']);
  const content = stripTags(mainHtml);
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const baseHostname = new URL(baseUrl).hostname;
  const internalLinks: string[] = [];
  const externalLinks: string[] = [];

  const linkRegex = /<a[^>]+href\s*=\s*"([^"]*)"[^>]*>/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(cleaned)) !== null) {
    const href = linkMatch[1];
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;

    try {
      const absoluteUrl = new URL(href, baseUrl).href;
      const urlStr = absoluteUrl.replace(/\/$/, '');

      try {
        const parsed = new URL(urlStr);
        if (parsed.hostname === baseHostname) {
          if (!internalLinks.includes(urlStr)) internalLinks.push(urlStr);
        } else {
          if (!externalLinks.includes(urlStr)) externalLinks.push(urlStr);
        }
      } catch {}
    } catch {}
  }

  const contentHash = simpleHash(content.slice(0, 10000));

  const hasArticleTime = /<meta[^>]+property="article:published_time"[^>]*>/i.test(cleaned);
  const ogType = extractAttr(
    cleaned.match(/<meta[^>]+property="og:type"[^>]*>/i)?.[0] || '', 'content'
  );
  const contentType = hasArticleTime || ogType === 'article' ? 'article' : 'webpage';

  return {
    title,
    metaDescription,
    headings,
    content,
    internalLinks,
    externalLinks,
    wordCount,
    contentType,
    contentHash,
  };
}
