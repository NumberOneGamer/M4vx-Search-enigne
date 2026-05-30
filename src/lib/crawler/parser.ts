import * as cheerio from 'cheerio';

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

function extractTextFromElement($el: cheerio.Cheerio<any>): string {
  const $ = cheerio.load($el.html() || '');
  $.root().find('script, style, noscript, iframe, svg, nav, footer, header, aside').remove();
  return $.root().text().replace(/\s+/g, ' ').trim();
}

export function parseHtml(html: string, baseUrl: string): ParsedPage {
  const $ = cheerio.load(html);

  $('script, style, noscript, iframe, svg, nav, footer, header, aside, .sidebar, .comments, .advertisement, .menu, .nav').remove();

  const title =
    $('title').first().text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('h1').first().text().trim() ||
    '';

  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    '';

  const headings: string[] = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const text = $(el).text().trim();
    if (text) headings.push(text);
  });

  const mainContent =
    $('main, article, [role="main"], .content, .post, .entry, #content, #main').first().html() ||
    $('body').html() ||
    '';

  const $content = cheerio.load(mainContent);
  $content('script, style, noscript, iframe, svg').remove();
  const content = $content.root().text().replace(/\s+/g, ' ').trim();

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const internalLinks: string[] = [];
  const externalLinks: string[] = [];
  const baseHostname = new URL(baseUrl).hostname;

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

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
      } catch {
      }
    } catch {
    }
  });

  const contentHash = simpleHash(content.slice(0, 10000));

  const contentType =
    $('meta[property="article:published_time"]').length > 0 ? 'article' :
    $('meta[property="og:type"]').attr('content') === 'article' ? 'article' :
    'webpage';

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
