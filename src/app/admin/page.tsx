'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, Globe, Search, Users, Clock, BarChart3, TrendingUp, RefreshCw } from 'lucide-react';
import type { AdminStats } from '@/types';
import { CardSkeleton, Skeleton } from '@/components/ui/skeleton';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        setStats(await res.json());
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const cards = [
    { label: 'Total Pages', value: stats?.totalPages ?? 0, icon: Database },
    { label: 'Domains', value: stats?.totalDomains ?? 0, icon: Globe },
    { label: 'Searches', value: stats?.totalSearches ?? 0, icon: Search },
    { label: 'Users', value: stats?.totalUsers ?? 0, icon: Users },
    { label: 'Queue Size', value: stats?.queueSize ?? 0, icon: Clock },
    { label: 'Avg Response', value: stats ? `${stats.avgResponseTime}ms` : '0ms', icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-60 mt-2" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Overview of your search engine</p>
        </div>
        <button
          onClick={fetchStats}
          className="p-2 rounded-xl hover:bg-accent transition-colors border border-border"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
      >
        {cards.map((card) => (
          <motion.div
            key={card.label}
            variants={item}
            className="bg-card border border-border rounded-xl p-5 hover:bg-accent/30 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <card.icon className="h-5 w-5 text-foreground" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">{card.value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{card.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-foreground" />
            <h2 className="font-semibold text-sm text-foreground">Top Queries</h2>
          </div>
          {stats?.topQueries && stats.topQueries.length > 0 ? (
            <div className="space-y-2">
              {stats.topQueries.map((q, i) => (
                <div key={q.term} className="flex items-center justify-between text-sm py-1.5">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground w-5 text-xs font-medium shrink-0">{i + 1}.</span>
                    <span className="truncate text-foreground">{q.term}</span>
                  </span>
                  <span className="text-muted-foreground text-xs shrink-0 ml-2">{q.frequency}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No queries yet.</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4 text-foreground" />
            <h2 className="font-semibold text-sm text-foreground">Top Domains</h2>
          </div>
          {stats?.domainDistribution && stats.domainDistribution.length > 0 ? (
            <div className="space-y-2">
              {stats.domainDistribution.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-sm py-1.5">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground w-5 text-xs font-medium shrink-0">{i + 1}.</span>
                    <span className="truncate text-foreground">{d.name}</span>
                  </span>
                  <span className="text-muted-foreground text-xs shrink-0 ml-2">{d.count} pages</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No domains yet.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
