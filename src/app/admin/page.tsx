'use client';

import { useState, useEffect } from 'react';
import { Database, Globe, Search, Users, Clock, BarChart3, TrendingUp, RefreshCw } from 'lucide-react';
import type { AdminStats } from '@/types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Pages', value: stats?.totalPages ?? 0, icon: Database, color: 'text-blue-600' },
    { label: 'Domains', value: stats?.totalDomains ?? 0, icon: Globe, color: 'text-green-600' },
    { label: 'Searches', value: stats?.totalSearches ?? 0, icon: Search, color: 'text-purple-600' },
    { label: 'Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-orange-600' },
    { label: 'Queue Size', value: stats?.queueSize ?? 0, icon: Clock, color: 'text-red-600' },
    { label: 'Avg Response', value: `${stats?.avgResponseTime ?? 0}ms`, icon: BarChart3, color: 'text-teal-600' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Overview of your search engine</p>
        </div>
        <button onClick={fetchStats} className="p-2 hover:bg-accent rounded-lg">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-card border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4" />
            <h2 className="font-semibold">Top Queries</h2>
          </div>
          {stats?.topQueries && stats.topQueries.length > 0 ? (
            <div className="space-y-2">
              {stats.topQueries.map((q, i) => (
                <div key={q.term} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground w-5">{i + 1}.</span>
                    <span className="truncate max-w-[250px]">{q.term}</span>
                  </span>
                  <span className="text-muted-foreground">{q.frequency}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No queries yet.</p>
          )}
        </div>

        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4" />
            <h2 className="font-semibold">Top Domains</h2>
          </div>
          {stats?.domainDistribution && stats.domainDistribution.length > 0 ? (
            <div className="space-y-2">
              {stats.domainDistribution.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground w-5">{i + 1}.</span>
                    <span className="truncate max-w-[250px]">{d.name}</span>
                  </span>
                  <span className="text-muted-foreground">{d.count} pages</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No domains yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
