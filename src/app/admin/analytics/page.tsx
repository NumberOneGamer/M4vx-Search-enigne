'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Search, MousePointerClick, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Analytics {
  totalSearches: number;
  totalClicks: number;
  ctr: number;
  avgResponseTime: number;
  topQueries: Array<{ term: string; count: number }>;
  searchesByDay: Array<{ date: string; count: number }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics?limit=20');
      if (res.ok) setData(await res.json());
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
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
    { label: 'Total Searches', value: data?.totalSearches ?? 0, icon: Search },
    { label: 'Total Clicks', value: data?.totalClicks ?? 0, icon: MousePointerClick },
    { label: 'CTR', value: data ? `${(data.ctr ?? 0).toFixed(1)}%` : '0%', icon: TrendingUp },
    { label: 'Avg Response', value: data ? `${data.avgResponseTime}ms` : '0ms', icon: Clock },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Search traffic and performance metrics</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="p-2 rounded-xl hover:bg-accent transition-colors border border-border"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <h2 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Top Queries
          </h2>
          {data?.topQueries && data.topQueries.length > 0 ? (
            <div className="space-y-1">
              {data.topQueries.slice(0, 10).map((q, i) => (
                <div key={q.term} className="flex items-center justify-between text-sm py-1.5">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground w-5 text-xs font-medium shrink-0">{i + 1}.</span>
                    <span className="truncate text-foreground">{q.term}</span>
                  </span>
                  <span className="text-muted-foreground text-xs shrink-0 ml-2">{q.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No search data yet.</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <h2 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Searches Per Day
            <span className="text-xs text-muted-foreground font-normal">(Last 30 days)</span>
          </h2>
          {data?.searchesByDay && data.searchesByDay.length > 0 ? (
            <div className="space-y-1.5">
              {data.searchesByDay.slice(-14).map((day) => {
                const maxCount = Math.max(...data.searchesByDay.map((d) => d.count), 1);
                return (
                  <div key={day.date} className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-20 shrink-0 text-xs">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1 h-5 bg-accent rounded-full overflow-hidden">
                      <div
                        className="h-full bg-foreground/20 rounded-full transition-all"
                        style={{ width: `${Math.min((day.count / maxCount) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground w-8 text-right text-xs shrink-0 font-medium">{day.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No search data yet.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
