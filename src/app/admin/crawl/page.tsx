'use client';

import { useState, FormEvent } from 'react';
import { Loader2, Plus, Globe } from 'lucide-react';

export default function CrawlManagerPage() {
  const [urls, setUrls] = useState('');
  const [depth, setDepth] = useState(2);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const urlList = urls.split('\n').map((u) => u.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/admin/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlList, depth }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Added ${data.count} URLs to crawl queue` });
        setUrls('');
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to start crawl' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to start crawl' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Crawl Manager</h1>

      <div className="bg-card border rounded-xl p-6 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Start New Crawl</h2>
        </div>

        {message && (
          <div className={`text-sm p-3 rounded-lg mb-4 ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-600'
              : 'bg-destructive/10 text-destructive'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Seed URLs (one per line)
            </label>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="https://example.com&#10;https://example.org"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Crawl Depth
            </label>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>{d} {d === 1 ? 'level' : 'levels'}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Start Crawling
          </button>
        </form>
      </div>
    </div>
  );
}
