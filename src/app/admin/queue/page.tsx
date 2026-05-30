'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, List } from 'lucide-react';

interface QueueItem {
  id: number;
  url: string;
  status: string;
  depth: number;
  priority: number;
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface QueueResponse {
  items: QueueItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function QueueMonitorPage() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

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

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-600',
    running: 'bg-blue-500/10 text-blue-600',
    completed: 'bg-green-500/10 text-green-600',
    failed: 'bg-red-500/10 text-red-600',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <List className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Queue Monitor</h1>
        </div>
        <button onClick={() => fetchQueue(statusFilter)} className="p-2 hover:bg-accent rounded-lg">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'pending', 'running', 'completed', 'failed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-accent hover:bg-accent/80'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : data?.items.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">No items in queue</p>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">URL</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-center px-4 py-3 font-medium">Depth</th>
                  <th className="text-center px-4 py-3 font-medium">Attempts</th>
                  <th className="text-right px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 max-w-md truncate" title={item.url}>
                      {item.url}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status] || ''}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{item.depth}</td>
                    <td className="px-4 py-3 text-center">{item.attempts}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && (
            <div className="px-4 py-3 text-sm text-muted-foreground border-t">
              Showing {data.items.length} of {data.total} items
            </div>
          )}
        </div>
      )}
    </div>
  );
}
