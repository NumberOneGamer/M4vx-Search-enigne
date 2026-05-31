'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Search, MousePointerClick, TrendingUp, Clock,
  RefreshCw, AlertTriangle, Globe, Link, Download, Calendar
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';

interface Analytics {
  totalSearches: number;
  totalClicks: number;
  ctr: number;
  avgResponseTime: number;
  topQueries: Array<{ term: string; count: number }>;
  searchesByDay: Array<{ date: string; count: number }>;
  zeroResultQueries: Array<{ term: string; count: number }>;
  failedSearches: number;
  searchesToday: number;
  searchesThisWeek: number;
  searchesThisMonth: number;
  avgPositionClicked: number;
  mostClickedDomains: Array<{ domain: string; count: number }>;
  mostClickedResults: Array<{ url: string; count: number }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics?limit=20');
      if (res.ok) setData(await res.json());
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [['Metric', 'Value']];
    rows.push(['Total Searches', String(data.totalSearches)]);
    rows.push(['Total Clicks', String(data.totalClicks)]);
    rows.push(['CTR (%)', String(data.ctr)]);
    rows.push(['Avg Response (ms)', String(data.avgResponseTime)]);
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Total Searches', value: (data?.totalSearches ?? 0).toLocaleString(), icon: Search },
    { label: 'Today', value: (data?.searchesToday ?? 0).toLocaleString(), icon: Calendar },
    { label: 'This Week', value: (data?.searchesThisWeek ?? 0).toLocaleString(), icon: TrendingUp },
    { label: 'This Month', value: (data?.searchesThisMonth ?? 0).toLocaleString(), icon: BarChart3 },
    { label: 'Total Clicks', value: (data?.totalClicks ?? 0).toLocaleString(), icon: MousePointerClick },
    { label: 'CTR', value: data ? `${(data.ctr ?? 0).toFixed(1)}%` : '0%', icon: TrendingUp },
    { label: 'Avg Response', value: data ? `${data.avgResponseTime}ms` : '0ms', icon: Clock },
    { label: 'Avg Position', value: data ? `${data.avgPositionClicked}` : '0', icon: Globe },
  ];

  const chartData = data?.searchesByDay?.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    searches: d.count,
  })) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Search traffic and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl hover:bg-accent transition-colors border border-border text-muted-foreground hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            onClick={fetchAnalytics}
            className="p-2 rounded-xl hover:bg-accent transition-colors border border-border"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-card border border-border rounded-xl p-5 hover:bg-accent/30 transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center mb-3">
              <card.icon className="h-4 w-4 text-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">{card.value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{card.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <h2 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Top Queries
          </h2>
          {data?.topQueries && data.topQueries.length > 0 ? (
            <div className="space-y-1">
              {data.topQueries.slice(0, 10).map((q, i) => {
                const maxCount = data.topQueries[0]?.count || 1;
                return (
                  <div key={q.term} className="flex items-center justify-between text-sm py-1.5">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground w-5 text-xs font-medium shrink-0">{i + 1}.</span>
                      <span className="truncate text-foreground">{q.term}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20 h-2 bg-accent rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(q.count / maxCount) * 100}%` }} />
                      </div>
                      <span className="text-muted-foreground text-xs w-8 text-right">{q.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No search data yet.</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <h2 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Searches Per Day
            <span className="text-xs text-muted-foreground font-normal">(Last 30 days)</span>
          </h2>
          {chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSearches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs text-muted-foreground" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs text-muted-foreground" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  />
                  <Area type="monotone" dataKey="searches" stroke="hsl(var(--primary))" fill="url(#colorSearches)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No search data yet.</p>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <h2 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Zero-Result Queries
          </h2>
          {data?.zeroResultQueries && data.zeroResultQueries.length > 0 ? (
            <div className="space-y-1">
              {data.zeroResultQueries.slice(0, 10).map((q, i) => (
                <div key={q.term} className="flex items-center justify-between text-sm py-1.5">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground w-5 text-xs shrink-0">{i + 1}.</span>
                    <span className="truncate text-foreground">{q.term}</span>
                  </span>
                  <span className="text-muted-foreground text-xs shrink-0">{q.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No zero-result queries.</p>
          )}
          {data && (
            <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
              <span>Failed searches: {data.failedSearches}</span>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <h2 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Most Clicked Domains
          </h2>
          {data?.mostClickedDomains && data.mostClickedDomains.length > 0 ? (
            <div className="space-y-1">
              {data.mostClickedDomains.slice(0, 10).map((d, i) => {
                const maxCount = data.mostClickedDomains[0]?.count || 1;
                return (
                  <div key={d.domain} className="flex items-center justify-between text-sm py-1.5">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground w-5 text-xs shrink-0">{i + 1}.</span>
                      <span className="truncate text-foreground">{d.domain}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-2 bg-accent rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                      </div>
                      <span className="text-muted-foreground text-xs w-6 text-right">{d.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No click data yet.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
