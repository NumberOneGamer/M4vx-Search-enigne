'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, List, Trash2, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { TableSkeleton } from '@/components/ui/skeleton';

interface QueueItem {
  id: number;
  url: string;
  status: string;
  depth: number;
  priority: number;
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
}

interface QueueResponse {
  items: QueueItem[];
  total: number;
}

export default function QueueMonitorPage() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const { addToast } = useToast();

  const fetchQueue = async (status = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '50' });
      if (status) params.set('status', status);
      const res = await fetch(`/api/admin/queue?${params}`);
      if (res.ok) setData(await res.json());
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(statusFilter); }, [statusFilter]);

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/queue/${id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast({ type: 'success', title: 'Removed from queue' });
        fetchQueue(statusFilter);
      } else {
        addToast({ type: 'error', title: 'Failed to remove item' });
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to remove item' });
    }
  };

  const handleRetry = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending', attempts: 0, errorMessage: null }),
      });
      if (res.ok) {
        addToast({ type: 'success', title: 'Queued for retry' });
        fetchQueue(statusFilter);
      } else {
        addToast({ type: 'error', title: 'Failed to retry item' });
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to retry item' });
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    running: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    completed: 'bg-green-500/10 text-green-500 border-green-500/20',
    failed: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  const filters = ['', 'pending', 'running', 'completed', 'failed'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Queue Monitor</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track and manage crawl queue items</p>
        </div>
        <button
          onClick={() => fetchQueue(statusFilter)}
          className="p-2 rounded-xl hover:bg-accent transition-colors border border-border"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {filters.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 text-sm rounded-xl transition-all duration-150 font-medium ${
              statusFilter === s
                ? 'bg-foreground text-background'
                : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border'
            }`}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <TableSkeleton rows={8} cols={6} />
        </div>
      ) : !data?.items.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mb-4">
            <List className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No items in queue</p>
          <p className="text-sm text-muted-foreground mt-1">Crawl new pages to see them here</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-border rounded-xl overflow-hidden shadow-card"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3.5 font-medium text-foreground">URL</th>
                  <th className="text-left px-4 py-3.5 font-medium text-foreground">Status</th>
                  <th className="text-center px-4 py-3.5 font-medium text-foreground">Depth</th>
                  <th className="text-center px-4 py-3.5 font-medium text-foreground">Attempts</th>
                  <th className="text-right px-4 py-3.5 font-medium text-foreground">Created</th>
                  <th className="text-right px-4 py-3.5 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, i) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-4 py-3 max-w-md truncate text-foreground" title={item.url}>
                      {item.url}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[item.status] || ''}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{item.depth}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{item.attempts}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {item.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(item.id)}
                            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                            title="Retry"
                          >
                            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && (
            <div className="px-4 py-3 text-sm text-muted-foreground border-t border-border bg-muted/20">
              Showing {data.items.length} of {data.total} items
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
