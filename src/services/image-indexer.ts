import { db } from '@/db';
import { images } from '@/db/schema/images';
import { eq, and, desc, gte, lte, count, sql, or, ilike, type SQL } from 'drizzle-orm';
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache';

export interface ImageSearchOptions {
  query: string;
  page?: number;
  pageSize?: number;
  size?: 'small' | 'medium' | 'large' | 'ultrahd';
  orientation?: 'landscape' | 'portrait' | 'square';
  color?: string;
  imageType?: 'photo' | 'illustration' | 'icon' | 'gif';
  sort?: 'relevance' | 'date';
}

export interface ImageSearchResult {
  results: {
    id: number;
    url: string;
    altText: string | null;
    caption: string | null;
    pageTitle: string | null;
    pageUrl: string | null;
    width: number | null;
    height: number | null;
    fileSize: number | null;
    mimeType: string | null;
    dominantColor: string | null;
    score: number;
  }[];
  totalResults: number;
  page: number;
  pageSize: number;
}

const SIZE_RANGES: Record<string, { width?: [number, number]; height?: [number, number]; totalPixels?: number }> = {
  small: { totalPixels: 0.1 * 1e6 },
  medium: { totalPixels: 1 * 1e6 },
  large: { totalPixels: 5 * 1e6 },
  ultrahd: { totalPixels: Infinity },
};

const ORIENTATIONS: Record<string, { aspect: [number, number] }> = {
  landscape: { aspect: [1.2, Infinity] },
  portrait: { aspect: [0, 0.8] },
  square: { aspect: [0.8, 1.2] },
};

function parseImageQuery(query: string): { phrases: string[]; terms: string[] } {
  const phrases: string[] = [];
  const tokens: string[] = [];
  let i = 0;
  while (i < query.length) {
    if (query[i] === '"') {
      const end = query.indexOf('"', i + 1);
      if (end !== -1) {
        const p = query.slice(i + 1, end).trim();
        if (p) phrases.push(p.toLowerCase());
        i = end + 1;
        continue;
      }
    }
    tokens.push(query[i]);
    i++;
  }
  const terms = tokens.join('').toLowerCase().split(/\s+/).filter(Boolean);
  return { phrases, terms };
}

export async function searchImages(options: ImageSearchOptions): Promise<ImageSearchResult> {
  try {
  const { query, page = 1, pageSize = 20, size, orientation, color, imageType, sort = 'relevance' } = options;
  const cacheKey = `image:search:${query}:${page}:${pageSize}:${size}:${orientation}:${color}:${imageType}:${sort}`;
  const cached = await cacheGet<ImageSearchResult>(cacheKey);
  if (cached) return cached;

  const { phrases, terms } = parseImageQuery(query);
  const softPhrase = query.replace(/"/g, '').trim().toLowerCase();
  const hasPhrases = phrases.length > 0;
  const hasTerms = terms.length > 0;

  const conditions: ReturnType<typeof eq>[] = [];

  const phraseConditions: any[] = [];
  for (const phrase of phrases) {
    phraseConditions.push(
      or(
        ilike(images.altText, `%${phrase}%`),
        ilike(images.caption, `%${phrase}%`),
        ilike(images.pageTitle, `%${phrase}%`),
        ilike(images.contextContent, `%${phrase}%`)
      )
    );
  }

  if (hasPhrases && hasTerms) {
    conditions.push(or(
      or(...phraseConditions),
      or(
        ...terms.map(term => or(
          ilike(images.altText, `%${term}%`),
          ilike(images.caption, `%${term}%`),
          ilike(images.pageTitle, `%${term}%`),
          ilike(images.contextContent, `%${term}%`)
        ))
      )
    ) as any);
  } else if (hasPhrases) {
    conditions.push(or(...phraseConditions) as any);
  } else if (hasTerms) {
    conditions.push(
      or(
        ...terms.map(term => or(
          ilike(images.altText, `%${term}%`),
          ilike(images.caption, `%${term}%`),
          ilike(images.pageTitle, `%${term}%`),
          ilike(images.contextContent, `%${term}%`)
        ))
      ) as any
    );
  }

  if (size && SIZE_RANGES[size]) {
    const range = SIZE_RANGES[size];
    if (range.totalPixels !== undefined && range.totalPixels !== Infinity) {
      conditions.push(
        sql`${images.width} * ${images.height} <= ${Math.floor(range.totalPixels)}` as any
      );
    }
  }

  if (orientation && ORIENTATIONS[orientation]) {
    const { aspect } = ORIENTATIONS[orientation];
    if (aspect[0] === 1.2) {
      conditions.push(sql`${images.width}::float / NULLIF(${images.height}, 0) >= ${aspect[0]}`);
    } else if (aspect[1] === 1.2) {
      conditions.push(sql`${images.width}::float / NULLIF(${images.height}, 0) <= ${aspect[1]}`);
    } else {
      conditions.push(
        sql`${images.width}::float / NULLIF(${images.height}, 0) >= ${aspect[0]} AND ${images.width}::float / NULLIF(${images.height}, 0) <= ${aspect[1]}`
      );
    }
  }

  if (color) {
    conditions.push(eq(images.dominantColor, color));
  }

  if (imageType) {
    switch (imageType) {
      case 'photo':
        conditions.push(eq(images.mimeType, 'image/jpeg'));
        break;
      case 'illustration':
        conditions.push(eq(images.mimeType, 'image/png'));
        break;
      case 'icon':
        conditions.push(
          or(
            eq(images.mimeType, 'image/svg+xml'),
            eq(images.mimeType, 'image/png'),
            sql`${images.width} <= 64 AND ${images.height} <= 64`
          ) as any
        );
        break;
      case 'gif':
        conditions.push(eq(images.mimeType, 'image/gif'));
        break;
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const [totalResult] = await db
    .select({ count: count() })
    .from(images)
    .where(whereClause);

  const totalResults = totalResult?.count ?? 0;

  const orderScores: SQL[] = [];

  for (const phrase of phrases) {
    orderScores.push(
      sql`(CASE WHEN ${images.altText} ILIKE ${`%${phrase}%`} THEN 10000 ELSE 0 END
         + CASE WHEN ${images.caption} ILIKE ${`%${phrase}%`} THEN 8000 ELSE 0 END
         + CASE WHEN ${images.pageTitle} ILIKE ${`%${phrase}%`} THEN 5000 ELSE 0 END)`
    );
  }

  const softWords = softPhrase.split(/\s+/).filter(Boolean);
  if (softWords.length > 1) {
    orderScores.push(
      sql`(CASE WHEN ${images.altText} ILIKE ${`%${softPhrase}%`} THEN 5000 ELSE 0 END
         + CASE WHEN ${images.caption} ILIKE ${`%${softPhrase}%`} THEN 4000 ELSE 0 END
         + CASE WHEN ${images.pageTitle} ILIKE ${`%${softPhrase}%`} THEN 2000 ELSE 0 END)`
    );
  }

  for (const term of terms) {
    orderScores.push(
      sql`(CASE WHEN ${images.altText} ILIKE ${`%${term}%`} THEN 10 ELSE 0 END
         + CASE WHEN ${images.caption} ILIKE ${`%${term}%`} THEN 5 ELSE 0 END
         + CASE WHEN ${images.pageTitle} ILIKE ${`%${term}%`} THEN 3 ELSE 0 END)`
    );
  }

  const orderExpr = orderScores.length > 0
    ? sql`${sql.join(orderScores, sql` + `)} DESC, ${images.searchCount} DESC`
    : sql`${images.searchCount} DESC`;

  const rows = await db
    .select({
      id: images.id,
      url: images.url,
      altText: images.altText,
      caption: images.caption,
      pageTitle: images.pageTitle,
      pageUrl: images.pageUrl,
      width: images.width,
      height: images.height,
      fileSize: images.fileSize,
      mimeType: images.mimeType,
      dominantColor: images.dominantColor,
    })
    .from(images)
    .where(whereClause)
    .orderBy(orderExpr)
    .limit(pageSize)
    .offset(offset);

  const results = rows.map((row) => {
    let score = 0;
    const alt = (row.altText ?? '').toLowerCase();
    const cap = (row.caption ?? '').toLowerCase();
    const pt = (row.pageTitle ?? '').toLowerCase();

    for (const phrase of phrases) {
      if (alt.includes(phrase)) score += 10000;
      if (cap.includes(phrase)) score += 8000;
      if (pt.includes(phrase)) score += 5000;
    }

    if (softWords.length > 1) {
      if (alt.includes(softPhrase)) score += 5000;
      if (cap.includes(softPhrase)) score += 4000;
      if (pt.includes(softPhrase)) score += 2000;
    }

    for (const term of terms) {
      if (alt.includes(term)) score += 10;
      if (cap.includes(term)) score += 5;
      if (pt.includes(term)) score += 3;
    }

    return {
      id: row.id,
      url: row.url,
      altText: row.altText,
      caption: row.caption,
      pageTitle: row.pageTitle,
      pageUrl: row.pageUrl,
      width: row.width,
      height: row.height,
      fileSize: row.fileSize,
      mimeType: row.mimeType,
      dominantColor: row.dominantColor,
      score,
    };
  });

  const result: ImageSearchResult = { results, totalResults, page, pageSize };
  await cacheSet(cacheKey, result, CACHE_TTL.SEARCH_RESULTS);
  return result;
  } catch (error) {
    console.error('Image search error:', error);
    return { results: [], totalResults: 0, page: options.page || 1, pageSize: options.pageSize || 20 };
  }
}

export async function getRelatedImages(imageId: number, limit = 8) {
  const image = await db
    .select({ pageUrl: images.pageUrl, caption: images.caption, dominantColor: images.dominantColor })
    .from(images)
    .where(eq(images.id, imageId))
    .limit(1)
    .then((r) => r[0]);

  if (!image) return [];

  const conditions: ReturnType<typeof eq>[] = [];

  if (image.pageUrl) {
    conditions.push(eq(images.pageUrl, image.pageUrl));
  }

  if (image.dominantColor) {
    conditions.push(eq(images.dominantColor, image.dominantColor));
  }

  if (conditions.length === 0) return [];

  const related = await db
    .select()
    .from(images)
    .where(and(...conditions))
    .orderBy(desc(images.searchCount))
    .limit(limit + 1);

  return related.filter((img) => img.id !== imageId).slice(0, limit);
}

export async function getImageStats() {
  const [totalResult, mimeTypes] = await Promise.all([
    db.select({ count: count() }).from(images),
    db
      .select({ mimeType: images.mimeType, count: count() })
      .from(images)
      .groupBy(images.mimeType)
      .orderBy(desc(count())),
  ]);
  return {
    total: totalResult[0]?.count ?? 0,
    mimeTypes,
  };
}
