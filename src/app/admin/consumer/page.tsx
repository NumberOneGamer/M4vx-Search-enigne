'use client';

import { useState, useEffect } from 'react';
import { Play, Square, RefreshCw, Clock, CheckCircle, XCircle, Activity, AlertTriangle } from 'lucide-react';

interface ConsumerStatus {
  running: boolean;
  stopping: boolean;
  uptime: number;
  processed: number;
  completed: number;
  failed: number;
  errors: number;
  queueCheckInterval: number;
  batchSize: number;
  concurrency: number;
  startedAt: string | null;
}

export default function ConsumerPage() {
  const [status, setStatus] = useState<ConsumerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/consumer/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch consumer status', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleAction = async (action: 'start' | 'stop') => {
    setActionLoading(action);
    try {
      await fetch(`/api/admin/consumer/${action}`, { method: 'POST' });
      await new Promise((resolve) => setTimeout(resolve, 600));
      await fetchStatus();
    } catch (err) {
      console.error(`Failed to ${action} consumer`, err);
    }
    setActionLoading(null);
  };

  const formatUptime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m ${s % 60}s`;
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Queue Consumer</h1>
        <div className="h-32 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Queue Consumer</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStatus}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {status?.running ? (
            <button
              onClick={() => handleAction('stop')}
              disabled={actionLoading === 'stop'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-sm disabled:opacity-50"
            >
              {actionLoading === 'stop' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
              Stop Consumer
            </button>
          ) : (
            <button
              onClick={() => handleAction('start')}
              disabled={actionLoading === 'start'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors text-sm disabled:opacity-50"
            >
              {actionLoading === 'start' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start Consumer
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-muted/30 border border-border/40 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${status?.running ? 'bg-green-500/10' : 'bg-muted'}`}>
            <Activity className={`w-5 h-5 ${status?.running ? 'text-green-500' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className={`font-semibold ${status?.running ? 'text-green-500' : 'text-muted-foreground'}`}>
              {status?.running ? (status?.stopping ? 'Stopping...' : 'Running') : 'Stopped'}
            </p>
            {status?.running && status?.startedAt && (
              <p className="text-xs text-muted-foreground">Uptime: {formatUptime(status.uptime)}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Processed</p>
            <p className="text-xl font-bold">{status?.processed?.toLocaleString() || '0'}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Completed</p>
            <p className="text-xl font-bold text-green-500">{status?.completed?.toLocaleString() || '0'}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Failed</p>
            <p className="text-xl font-bold text-red-500">{status?.failed?.toLocaleString() || '0'}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Errors</p>
            <p className="text-xl font-bold text-yellow-500">{status?.errors?.toLocaleString() || '0'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Poll interval: {status?.queueCheckInterval}ms</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Batch size: {status?.batchSize} URLs</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Concurrency: {status?.concurrency} parallel</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-muted/30 border border-border/40 p-6">
        <h2 className="text-sm font-semibold mb-3">How to deploy the consumer</h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>Option 1:</strong> Run as a persistent process on your server:</p>
          <pre className="bg-muted/50 p-3 rounded-lg text-xs font-mono">npm run consumer</pre>
          <p><strong>Option 2:</strong> Use the Cloudflare Worker with cron (seeds URLs) + separate consumer endpoint:</p>
          <pre className="bg-muted/50 p-3 rounded-lg text-xs font-mono"># Cron → /seed?urls=https://en.wikipedia.org/wiki/Search_engine
# Consumer → / (called every few seconds)</pre>
          <p><strong>Option 3:</strong> Deploy the consumer as a Cloudflare Durable Object or Node.js process behind PM2/systemd.</p>
        </div>
      </div>
    </div>
  );
}
