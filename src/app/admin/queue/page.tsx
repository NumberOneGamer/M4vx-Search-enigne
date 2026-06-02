'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, List, Trash2, RotateCcw, Globe, FileText, Film, Image, Bug } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { TableSkeleton } from '@/components/ui/skeleton';

const WORKERS = [
  { id: 'crawler', label: 'Crawler', icon: Bug, color: 'text-blue-500', desc: 'Crawl queue URLs pending processing' },
  { id: 'news', label: 'News', icon: FileText, color: 'text-orange-500', desc: 'News articles pending extraction' },
  { id: 'images', label: 'Images', icon: Image, color: 'text-green-500', desc: 'Images pending extraction' },
  { id: 'videos', label: 'Videos', icon: Film, color: 'text-purple-500', desc: 'Videos pending extraction' },
];

export default function QueueMonitorPage() {
  const [activeWorker, setActiveWorker] = useState('crawler');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, number>>({});
  const { addToast } = useToast();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [queueRes, contentRes] = await Promise.all([
        fetch(`/api/admin/queue?worker=${activeWorker}&page=1&pageSize=50`),
        fetch('/api/admin/content?type=all'),
      ]);
      if (queueRes.ok) {
        const d = await queueRes.json();
        setData(d);
      }
      if (contentRes.ok) {
        const d = await contentRes.json();
        if (d.counts) setStats(d.counts);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [activeWorker]);

  const handleDelete = async (id: number, type: string) => {
    try {
      const endpoint = type === 'crawler' ? `/api/admin/queue/${id}` : `/api/admin/content`;
      const method = type === 'crawler' ? 'DELETE' : 'POST';
      const body = type === 'crawler' ? undefined : JSON.stringify({ type, action: 'delete', ids: [id] });
      const res = await fetch(endpoint, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body });
      if (res.ok) {
        addToast({ type: 'success', title: 'Removed' });
        fetchAll();
      }
    } catch {
      addToast({ type: 'error', title: 'Failed' });
    }
  };

  const handleRetry = async (id: number, type: string) => {
    try {
      if (type === 'crawler') {
        const res = await fetch(`/api/admin/queue/${id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'pending', attempts: 0, errorMessage: null }),
        });
        if (res.ok) { addToast({ type: 'success', title: 'Queued for retry' }); fetchAll(); }
      } else {
        await fetch('/api/admin/content', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, action: 'reindex', ids: [id] }),
        });
        addToast({ type: 'success', title: 'Queued for reindex' });
        fetchAll();
      }
    } catch {
      addToast({ type: 'error', title: 'Failed' });
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    running: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    completed: 'bg-green-500/10 text-green-500 border-green-500/20',
    failed: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Queue Monitor</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track pending items per worker</p>
        </div>
        <button onClick={fetchAll} className="p-2 rounded-xl hover:bg-accent transition-colors border border-border" title="Refresh">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto">
        {WORKERS.map((w) => {
          const Icon = w.icon;
          const count = activeWorker === w.id ? (data?.total ?? 0) : (stats[w.id === 'crawler' ? 'web' : w.id] ?? 0);
          return (
            <button
              key={w.id}
              onClick={() => setActiveWorker(w.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeWorker === w.id ? 'bg-foreground text-background' : 'bg-card text-muted-foreground hover:text-foreground border border-border'}`}
            >
              <Icon className={`h-4 w-4 ${activeWorker === w.id ? '' : w.color}`} />
              <span>{w.label}</span>
              <span className={`text-xs ${activeWorker === w.id ? 'text-background/70' : 'text-muted-foreground'}`}>{data?.total ?? count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-5"><TableSkeleton rows={5} cols={4} /></div>
      ) : !data?.items?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mb-4">
            <List className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No pending items</p>
          <p className="text-sm text-muted-foreground mt-1">All caught up for {WORKERS.find(w => w.id === activeWorker)?.label}</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3.5 font-medium text-foreground">URL / Title</th>
                  {activeWorker === 'crawler' && <th className="text-left px-4 py-3.5 font-medium text-foreground">Status</th>}
                  {activeWorker === 'crawler' && <th className="text-center px-4 py-3.5 font-medium text-foreground">Depth</th>}
                  <th className="text-center px-4 py-3.5 font-medium text-foreground">Attempts</th>
                  <th className="text-right px-4 py-3.5 font-medium text-foreground">Created</th>
                  <th className="text-right px-4 py-3.5 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: any, i: number) => {
                  const title = item.url || item.headline || item.title || item.altText;
                  const isFailed = item.status === 'failed';
                  return (
                    <motion.tr key={`${activeWorker}-${item.id || i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="border-b border-border hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3 max-w-md truncate text-foreground" title={title}>
                        {title}
                        {item.errorMessage && <p className="text-xs text-red-400 truncate">{item.errorMessage}</p>}
                      </td>
                      {activeWorker === 'crawler' && (
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[item.status] || ''}`}>{item.status}</span>
                        </td>
                      )}
                      {activeWorker === 'crawler' && <td className="px-4 py-3 text-center text-muted-foreground">{item.depth}</td>}
                      <td className="px-4 py-3 text-center text-muted-foreground">{item.attempts ?? 0}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {new Date(item.createdAt || item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(isFailed || activeWorker !== 'crawler') && (
                            <button onClick={() => handleRetry(item.id, activeWorker)} className="p-1.5 rounded-lg hover:bg-accent transition-colors" title="Retry">
                              <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(item.id, activeWorker)} className="p-1.5 rounded-lg hover:bg-accent transition-colors" title="Remove">
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
