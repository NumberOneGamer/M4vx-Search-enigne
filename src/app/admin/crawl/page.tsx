'use client';

import { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Plus, Globe, RefreshCw, Play, Terminal } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function CrawlManagerPage() {
  const [urls, setUrls] = useState('');
  const [depth, setDepth] = useState(2);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<{ queueSize: number; completed: number; failed: number } | null>(null);
  const { addToast } = useToast();

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/crawl');
      if (res.ok) setStats(await res.json());
    } catch {}
  };

  useState(() => { fetchStats(); });

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
        addToast({ type: 'success', title: 'Crawl started', description: `Added ${data.count} URLs to the crawl queue` });
        setUrls('');
        fetchStats();
      } else {
        addToast({ type: 'error', title: 'Failed to start crawl', description: data.message });
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to start crawl' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Crawl Manager</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Add seed URLs to start crawling</p>
        </div>
        <button
          onClick={fetchStats}
          className="p-2 rounded-xl hover:bg-accent transition-colors border border-border"
          title="Refresh stats"
        >
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

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-5 mb-6 shadow-card"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Terminal className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Run Crawler Now</h2>
            <p className="text-sm text-muted-foreground">Process pending URLs on the server (batch of 5)</p>
          </div>
        </div>
        <button
          onClick={async () => {
            setRunning(true);
            try {
              const res = await fetch('/api/admin/crawler/run', { method: 'POST' });
              const data = await res.json();
              if (res.ok) {
                addToast({ type: 'success', title: 'Crawl complete', description: `Processed ${data.processed} URLs (${data.completed} ok, ${data.failed} failed)` });
                if (data.stats) setStats(data.stats);
              } else {
                addToast({ type: 'error', title: 'Crawl failed', description: data.message });
              }
            } catch {
              addToast({ type: 'error', title: 'Crawl failed', description: 'Could not reach server' });
            } finally {
              setRunning(false);
            }
          }}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-xl font-medium
            hover:opacity-90 disabled:opacity-50 transition-all text-sm"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? 'Crawling...' : 'Run Crawler Now'}
        </button>
      </motion.div>

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
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm hover:border-muted-foreground/30"
              placeholder="https://example.com&#10;https://example.org"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Crawl Depth
            </label>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm hover:border-muted-foreground/30"
            >
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>{d} {d === 1 ? 'level' : 'levels'}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-xl font-medium
              hover:opacity-90 disabled:opacity-50 transition-all text-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {loading ? 'Adding to queue...' : 'Add to Queue'}
          </button>
        </form>
      </div>
    </div>
  );
}
