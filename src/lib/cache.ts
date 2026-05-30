import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });
  }
  return redis;
}

export const CACHE_TTL = {
  SEARCH_RESULTS: 300,
  SUGGESTIONS: 600,
  TRENDING: 900,
  POPULAR: 1800,
  RANKING_FACTORS: 3600,
  ADMIN_STATS: 120,
};

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const r = getRedis();
    const data = await r.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const r = getRedis();
    await r.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    const r = getRedis();
    await r.del(key);
  } catch {
  }
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  try {
    const r = getRedis();
    const keys = await r.keys(pattern);
    if (keys.length) {
      await r.del(...keys);
    }
  } catch {
  }
}

export async function cacheIncrement(key: string, ttlSeconds?: number): Promise<number> {
  try {
    const r = getRedis();
    const val = await r.incr(key);
    if (ttlSeconds && val === 1) {
      await r.expire(key, ttlSeconds);
    }
    return val;
  } catch {
    return 0;
  }
}

export async function cacheAddToSortedSet(
  key: string,
  score: number,
  member: string
): Promise<void> {
  try {
    const r = getRedis();
    await r.zadd(key, score, member);
  } catch {
  }
}

export async function cacheGetSortedSetRange(
  key: string,
  start: number,
  stop: number,
  desc = true
): Promise<string[]> {
  try {
    const r = getRedis();
    if (desc) {
      return await r.zrevrange(key, start, stop);
    }
    return await r.zrange(key, start, stop);
  } catch {
    return [];
  }
}
