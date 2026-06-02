'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Clock, CheckCircle, XCircle, Activity, Bug, Newspaper, Video, Image, ExternalLink } from 'lucide-react';

const WORKERS = [
  { id: 'crawler', label: 'Crawler', url: 'https://m4vx-crawler.siefmahmoud020202.workers.dev', icon: Bug, cron: '*/2 * * * *', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'extractor-news', label: 'News Extractor', url: 'https://m4vx-extractor-news.siefmahmoud020202.workers.dev', icon: Newspaper, cron: '*/5 * * * *', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'extractor-images', label: 'Images Extractor', url: 'https://m4vx-extractor-images.siefmahmoud020202.workers.dev', icon: Image, cron: '*/10 * * * *', color: 'text-green-500', bg: 'bg-green-500/10' },
  { id: 'extractor-videos', label: 'Videos Extractor', url: 'https://m4vx-extractor-videos.siefmahmoud020202.workers.dev', icon: Video, cron: '*/15 * * * *', color: 'text-purple-500', bg: 'bg-purple-500/10' },
];

export default function WorkerStatusPage() {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    setLoading(true);
    const results: Record<string, any> = {};
    await Promise.all(WORKERS.map(async (w) => {
      try {
        const res = await fetch('/api/admin/crawler/trigger-worker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ worker: w.id, limit: 0 }),
        });
        results[w.id] = { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
      } catch {
        results[w.id] = { ok: false, status: 0, data: null };
      }
    }));
    setResponses(results);
    setLoading(false);
  };

  useEffect(() => { checkHealth(); }, []);

  const statusBadge = (workerId: string) => {
    const r = responses[workerId];
    if (!r) return { label: 'Unknown', cls: 'bg-gray-500/10 text-gray-500' };
    if (r.ok) return { label: 'Alive', cls: 'bg-green-500/10 text-green-600' };
    return { label: 'Error', cls: 'bg-red-500/10 text-red-600' };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Worker Status</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Health and status of all Cloudflare Workers</p>
        </div>
        <button onClick={checkHealth} className="p-2 rounded-xl hover:bg-accent transition-colors border border-border" title="Refresh">
          <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {WORKERS.map((w) => {
          const badge = statusBadge(w.id);
          return (
            <div key={w.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${w.bg} flex items-center justify-center`}>
                    <w.icon className={`h-5 w-5 ${w.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{w.label}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                  </div>
                </div>
                <a href={w.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Cron: <code className="text-foreground bg-accent px-1.5 py-0.5 rounded text-xs">{w.cron}</code></span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5" />
                  <span>URL: <code className="text-foreground bg-accent px-1.5 py-0.5 rounded text-xs">{w.url}</code></span>
                </div>
              </div>
              {responses[w.id]?.data && (
                <pre className="mt-3 text-xs text-muted-foreground bg-accent/50 p-2 rounded-lg overflow-x-auto max-h-20">
                  {JSON.stringify(responses[w.id].data, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-foreground mb-2">Architecture</h2>
        <p className="text-sm text-muted-foreground">
          All workers are Cloudflare Workers with cron triggers. The <strong>Crawler</strong> fetches web pages and stores them.
          The extractors (<strong>News</strong>, <strong>Images</strong>, <strong>Videos</strong>) process crawled pages to extract specialized content.
          Use the <strong>Crawl Manager</strong> page to manually trigger workers or seed new URLs.
        </p>
      </div>
    </div>
  );
}
