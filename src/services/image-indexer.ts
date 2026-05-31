import { db } from '@/db';
import { images } from '@/db/schema/images';
import { eq, and, desc, gte, lte, count, sql, or } from 'drizzle-orm';
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

export async function searchImages(options: ImageSearchOptions): Promise<ImageSearchResult> {
  const { query, page = 1, pageSize = 20, size, orientation, color, imageType, sort = 'relevance' } = options;
  const cacheKey = `image:search:${query}:${page}:${pageSize}:${size}:${orientation}:${color}:${imageType}:${sort}`;
  const cached = await cacheGet<ImageSearchResult>(cacheKey);
  if (cached) return cached;

  const conditions: ReturnType<typeof eq>[] = [];

  if (size && SIZE_RANGES[size]) {
    const range = SIZE_RANGES[size];
    if (range.totalPixels !== undefined && range.totalPixels !== Infinity) {
      const pixelThreshold = Math.sqrt(range.totalPixels) * 1000;
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

  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const rows = await db
    .select()
    .from(images)
    .where(whereClause)
    .orderBy(desc(images.searchCount))
    .limit(pageSize)
    .offset(offset);

  const results = rows.map((row) => {
    let score = 0;
    if (queryTerms.length > 0) {
      const alt = (row.altText ?? '').toLowerCase();
      const caption = (row.caption ?? '').toLowerCase();
      const pageTitle = (row.pageTitle ?? '').toLowerCase();
      for (const term of queryTerms) {
        if (alt.includes(term)) score += 10;
        if (caption.includes(term)) score += 5;
        if (pageTitle.includes(term)) score += 3;
      }
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
