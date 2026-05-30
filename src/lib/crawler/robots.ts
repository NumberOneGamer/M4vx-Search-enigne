export interface RobotsRule {
  userAgent: string;
  disallow: string[];
  allow: string[];
  crawlDelay: number;
}

const robotsCache = new Map<string, { rules: RobotsRule[]; fetchedAt: number }>();

const CACHE_TTL = 3600000;

export async function fetchRobotsTxt(domain: string): Promise<string | null> {
  const url = `https://${domain}/robots.txt`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': process.env.CRAWLER_USER_AGENT || 'SearchEngineBot/1.0',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      return await response.text();
    }
    return null;
  } catch {
    return null;
  }
}

export function parseRobotsTxt(content: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  let currentRule: RobotsRule | null = null;

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...valueParts] = trimmed.split(':');
    const value = valueParts.join(':').trim();
    const lowerKey = key.toLowerCase().trim();

    if (lowerKey === 'user-agent') {
      if (currentRule) {
        rules.push(currentRule);
      }
      currentRule = {
        userAgent: value.toLowerCase(),
        disallow: [],
        allow: [],
        crawlDelay: 0,
      };
    } else if (currentRule) {
      if (lowerKey === 'disallow') {
        currentRule.disallow.push(value || '/');
      } else if (lowerKey === 'allow') {
        currentRule.allow.push(value);
      } else if (lowerKey === 'crawl-delay') {
        currentRule.crawlDelay = parseInt(value, 10) || 0;
      }
    }
  }

  if (currentRule) {
    rules.push(currentRule);
  }

  return rules;
}

export function getCrawlDelay(rules: RobotsRule[], userAgent: string): number {
  const ua = userAgent.toLowerCase();
  const specificRule = rules.find(
    (r) => r.userAgent === ua || r.userAgent === '*'
  );
  return specificRule?.crawlDelay || 1;
}

export function isAllowed(url: string, rules: RobotsRule[], userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  const path = new URL(url).pathname;

  const relevantRules = rules.filter(
    (r) => r.userAgent === '*' || r.userAgent === ua
  );

  for (const rule of relevantRules) {
    for (const allowPath of rule.allow) {
      if (path.startsWith(allowPath)) {
        return true;
      }
    }
    for (const disallowPath of rule.disallow) {
      if (disallowPath === '/' || path.startsWith(disallowPath)) {
        return false;
      }
    }
  }

  return true;
}

export async function checkRobotsTxt(
  domain: string,
  url: string,
  userAgent: string
): Promise<{ allowed: boolean; delay: number }> {
  const cacheKey = domain;
  const cached = robotsCache.get(cacheKey);

  let rules: RobotsRule[];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    rules = cached.rules;
  } else {
    const content = await fetchRobotsTxt(domain);
    if (content) {
      rules = parseRobotsTxt(content);
    } else {
      rules = [];
    }
    robotsCache.set(cacheKey, { rules, fetchedAt: Date.now() });
  }

  return {
    allowed: isAllowed(url, rules, userAgent),
    delay: getCrawlDelay(rules, userAgent),
  };
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    return parsed.href.replace(/\/$/, '');
  } catch {
    return url.replace(/\/$/, '');
  }
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function shouldCrawl(url: string, extensions: string[] = []): boolean {
  const skipExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.mp3', '.mp4', '.avi', '.mov', '.wmv',
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp',
    '.css', '.js', '.json', '.xml', '.rss',
    '.woff', '.woff2', '.ttf', '.eot',
  ];

  const lowerUrl = url.toLowerCase();
  return !skipExtensions.some((ext) => lowerUrl.includes(ext));
}
