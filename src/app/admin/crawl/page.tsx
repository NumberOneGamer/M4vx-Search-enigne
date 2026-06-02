'use client';

import { useState, FormEvent, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Plus, Globe, RefreshCw, Play, Terminal, Newspaper, Video, Image, Bug } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

const WORKERS = [
  { id: 'crawler', label: 'Crawler', icon: Bug, color: 'bg-blue-500/10 text-blue-600' },
  { id: 'extractor-news', label: 'News Extractor', icon: Newspaper, color: 'bg-orange-500/10 text-orange-600' },
  { id: 'extractor-images', label: 'Images Extractor', icon: Image, color: 'bg-green-500/10 text-green-600' },
  { id: 'extractor-videos', label: 'Videos Extractor', icon: Video, color: 'bg-purple-500/10 text-purple-600' },
];

export default function CrawlManagerPage() {
  const [urls, setUrls] = useState('');
  const [depth, setDepth] = useState(2);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [stats, setStats] = useState<{ queueSize: number; completed: number; failed: number } | null>(null);
  const [contentCounts, setContentCounts] = useState<{ web: number; news: number; videos: number; images: number } | null>(null);
  const { addToast } = useToast();

  const fetchStats = async () => {
    try {
      const [crawlRes, contentRes] = await Promise.all([
        fetch('/api/admin/crawl'),
        fetch('/api/admin/content?type=all'),
      ]);
      if (crawlRes.ok) setStats(await crawlRes.json());
      if (contentRes.ok) {
        const d = await contentRes.json();
        setContentCounts(d.counts);
      }
    } catch {}
  };

  useEffect(() => { fetchStats(); }, []);

  const triggerWorker = async (workerId: string) => {
    setRunning(workerId);
    try {
      const res = await fetch('/api/admin/crawler/trigger-worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker: workerId, limit: 3 }),
      });
      const data = await res.json();
      if (res.ok) {
        const processed = data.processed ?? data.completed ?? 0;
        addToast({ type: 'success', title: `${workerId} triggered`, description: `Processed: ${processed}` });
        fetchStats();
      } else {
        addToast({ type: 'error', title: 'Failed', description: data.message || data.error });
      }
    } catch {
      addToast({ type: 'error', title: 'Failed', description: 'Could not reach server' });
    } finally {
      setRunning(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const urlList = urls.split('\n').map((u) => u.trim()).filter(Boolean);
    try {
      const res = await fetch('/api/admin/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlList, depth }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast({ type: 'success', title: 'URLs added', description: `Added ${data.count} URLs to the crawl queue` });
        setUrls('');
        fetchStats();
      } else {
        addToast({ type: 'error', title: 'Failed', description: data.message });
      }
    } catch {
      addToast({ type: 'error', title: 'Failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Crawl Manager</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage crawling and content extraction workers</p>
        </div>
        <button onClick={fetchStats} className="p-2 rounded-xl hover:bg-accent transition-colors border border-border" title="Refresh stats">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Queue Size', value: stats.queueSize },
            { label: 'Completed', value: stats.completed },
            { label: 'Failed', value: stats.failed },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {contentCounts && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Web', value: contentCounts.web, icon: Globe, color: 'bg-blue-500/10 text-blue-600' },
            { label: 'News', value: contentCounts.news, icon: Newspaper, color: 'bg-orange-500/10 text-orange-600' },
            { label: 'Videos', value: contentCounts.videos, icon: Video, color: 'bg-purple-500/10 text-purple-600' },
            { label: 'Images', value: contentCounts.images, icon: Image, color: 'bg-green-500/10 text-green-600' },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color.split(' ')[1]}`} />
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-5 mb-6 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Play className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Trigger Workers</h2>
            <p className="text-sm text-muted-foreground">Manually run crawlers and extractors</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {WORKERS.map((w) => (
            <button
              key={w.id}
              onClick={() => triggerWorker(w.id)}
              disabled={running === w.id}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:bg-accent/50 transition-all disabled:opacity-50 ${w.color}`}
            >
              {running === w.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <w.icon className="h-5 w-5" />}
              <span className="text-xs font-medium">{w.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 max-w-2xl shadow-card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Globe className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Queue Seed URLs</h2>
            <p className="text-sm text-muted-foreground">Add URLs to the crawl queue for processing</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Seed URLs <span className="text-muted-foreground">(one per line)</span>
            </label>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              rows={5}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm"
              placeholder="https://example.com&#10;https://example.org"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Crawl Depth</label>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm"
            >
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>{d} {d === 1 ? 'level' : 'levels'}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all text-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {loading ? 'Adding to queue...' : 'Add to Queue'}
          </button>
        </form>
      </div>
    </div>
  );
}
