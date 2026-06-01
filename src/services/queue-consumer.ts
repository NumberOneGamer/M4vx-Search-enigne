import { fileURLToPath } from 'url';
import { db } from '@/db';
import { crawlQueue } from '@/db/schema/crawlQueue';
import { eq, and, sql, isNull, lt, or, desc } from 'drizzle-orm';
import { processUrl } from '@/services/crawler';

const POLL_INTERVAL = parseInt(process.env.CRAWLER_POLL_INTERVAL || '2000', 10);
const BATCH_SIZE = parseInt(process.env.CRAWLER_CONSUMER_BATCH || '25', 10);
const CONCURRENCY = parseInt(process.env.CRAWLER_CONSUMER_CONCURRENCY || '5', 10);

let isRunning = false;
let isStopping = false;
let stats = { processed: 0, completed: 0, failed: 0, errors: 0, startedAt: null as Date | null };
let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

export function getConsumerStatus() {
  return {
    running: isRunning,
    stopping: isStopping,
    uptime: isRunning && stats.startedAt ? Date.now() - stats.startedAt.getTime() : 0,
    ...stats,
    queueCheckInterval: POLL_INTERVAL,
    batchSize: BATCH_SIZE,
    concurrency: CONCURRENCY,
  };
}

async function getNextBatch(limit = BATCH_SIZE): Promise<typeof crawlQueue.$inferSelect[]> {
  return db
    .select()
    .from(crawlQueue)
    .where(
      and(
        eq(crawlQueue.status, 'pending'),
        or(isNull(crawlQueue.scheduledAt), lt(crawlQueue.scheduledAt, new Date()))
      )
    )
    .orderBy(desc(crawlQueue.priority), sql`RANDOM()`)
    .limit(limit);
}

async function resetStaleJobs(): Promise<void> {
  try {
    await db
      .update(crawlQueue)
      .set({ status: 'pending', startedAt: null })
      .where(
        and(
          eq(crawlQueue.status, 'running'),
          lt(crawlQueue.startedAt, new Date(Date.now() - 120 * 1000))
        )
      );
  } catch {}
}

async function processBatch(): Promise<void> {
  await resetStaleJobs();
  const batch = await getNextBatch();
  if (batch.length === 0) return;

  const chunks: typeof batch[] = [];
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    chunks.push(batch.slice(i, i + CONCURRENCY));
  }

  for (const chunk of chunks) {
    if (isStopping) break;
    const results = await Promise.allSettled(chunk.map((item) => processUrl(item)));
    for (const result of results) {
      stats.processed++;
      if (result.status === 'fulfilled') {
        stats.completed++;
      } else {
        stats.failed++;
        stats.errors++;
        console.error('[Consumer] Error processing URL:', result.reason);
      }
    }
  }
}

export async function startConsumer(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  isStopping = false;
  stats = { processed: 0, completed: 0, failed: 0, errors: 0, startedAt: new Date() };

  console.log(`[Consumer] Starting (batch=${BATCH_SIZE}, concurrency=${CONCURRENCY}, poll=${POLL_INTERVAL}ms)`);
  resetStaleJobs();

  healthCheckInterval = setInterval(() => {
    const uptime = Math.floor((Date.now() - (stats.startedAt?.getTime() || Date.now())) / 1000);
    console.log(`[Consumer] Uptime: ${uptime}s | Processed: ${stats.processed} | Completed: ${stats.completed} | Failed: ${stats.failed} | Errors: ${stats.errors}`);
  }, 60000);

  while (!isStopping) {
    try {
      await processBatch();
      if (isStopping) break;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    } catch (error) {
      console.error('[Consumer] Fatal error in consumer loop:', error);
      stats.errors++;
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  isRunning = false;
  console.log(`[Consumer] Stopped. Final stats: ${stats.processed} processed, ${stats.completed} completed, ${stats.failed} failed`);
}

export function stopConsumer(): void {
  if (!isRunning) return;
  isStopping = true;
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
  console.log('[Consumer] Stopping... (will finish current chunk)');
}

async function consumerLoop(): Promise<void> {
  console.log('[Consumer] Starting standalone consumer loop...');
  await startConsumer();
}

try {
  if (typeof process !== 'undefined' && process.argv && process.argv[1] &&
      (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('queue-consumer.ts'))) {
    process.on('SIGINT', () => { stopConsumer(); process.exit(0); });
    process.on('SIGTERM', () => { stopConsumer(); process.exit(0); });
    consumerLoop().catch(console.error);
  }
} catch {}
