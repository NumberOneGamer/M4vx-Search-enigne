const domainTimestamps = new Map<string, number[]>();

const MAX_REQUESTS_PER_MINUTE = 60;
const WINDOW_MS = 60000;

export function checkRateLimit(domain: string): { allowed: boolean; waitMs: number } {
  const now = Date.now();
  const timestamps = domainTimestamps.get(domain) || [];

  const recentTimestamps = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recentTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldest = recentTimestamps[0];
    const waitMs = WINDOW_MS - (now - oldest) + 100;
    return { allowed: false, waitMs };
  }

  recentTimestamps.push(now);
  domainTimestamps.set(domain, recentTimestamps);
  return { allowed: true, waitMs: 0 };
}

export function resetRateLimit(domain: string): void {
  domainTimestamps.delete(domain);
}

export function clearAllRateLimits(): void {
  domainTimestamps.clear();
}

export async function waitForRateLimit(domain: string, customDelayMs?: number): Promise<void> {
  const delay = customDelayMs || parseInt(process.env.CRAWLER_DELAY_MS || '1000', 10);

  return new Promise((resolve) => {
    const check = () => {
      const { allowed, waitMs } = checkRateLimit(domain);
      if (allowed) {
        setTimeout(resolve, delay);
      } else {
        setTimeout(check, Math.min(waitMs, 5000));
      }
    };
    check();
  });
}
