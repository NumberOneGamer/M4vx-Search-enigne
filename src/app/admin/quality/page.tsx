'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Search, MousePointerClick, Clock, AlertTriangle, TrendingUp, Activity, XCircle, Globe, FileText, Film, Image } from 'lucide-react';

interface QualityStats {
  totalSearches: number;
  searchesLast24h: number;
  searchesLast7d: number;
  totalIndexedPages: number;
  totalIndexedNews: number;
  totalIndexedVideos: number;
  totalIndexedImages: number;
  zeroResultSearches: number;
  zeroResultRate: number;
  totalClicks: number;
  ctr: number;
  avgClickPosition: number;
  avgResponseTimeMs: number;
  failedSearches: number;
  topZeroResultQueries: { query: string; count: number }[];
  topQueries: { query: string; count: number; avgResults: number }[];
}

export default function QualityDashboardPage() {
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/quality');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch quality stats', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Search Quality Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-12 text-muted-foreground">Failed to load quality stats</div>;
  }

  const searchCards = [
    { label: 'Searches (24h)', value: stats.searchesLast24h.toLocaleString(), icon: Search, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Searches (7d)', value: stats.searchesLast7d.toLocaleString(), icon: TrendingUp, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: 'CTR', value: `${stats.ctr}%`, icon: MousePointerClick, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Avg Position', value: stats.avgClickPosition.toString(), icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Avg Response', value: `${stats.avgResponseTimeMs}ms`, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { label: 'Zero-Result Rate', value: `${stats.zeroResultRate.toFixed(1)}%`, icon: XCircle, color: stats.zeroResultRate > 10 ? 'text-red-500' : 'text-orange-500', bg: stats.zeroResultRate > 10 ? 'bg-red-500/10' : 'bg-orange-500/10' },
    { label: 'Zero-Result Searches', value: stats.zeroResultSearches.toLocaleString(), icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Failed Searches', value: stats.failedSearches.toLocaleString(), icon: Activity, color: stats.failedSearches > 0 ? 'text-red-500' : 'text-green-500', bg: stats.failedSearches > 0 ? 'bg-red-500/10' : 'bg-green-500/10' },
  ];

  const contentCards = [
    { label: 'Indexed Pages', value: stats.totalIndexedPages.toLocaleString(), icon: Globe, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Indexed News', value: stats.totalIndexedNews.toLocaleString(), icon: FileText, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Indexed Videos', value: stats.totalIndexedVideos.toLocaleString(), icon: Film, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Indexed Images', value: stats.totalIndexedImages.toLocaleString(), icon: Image, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Search Quality Dashboard</h1>
        <button onClick={fetchStats} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Refresh</button>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Indexed Content</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {contentCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="p-4 rounded-xl bg-muted/30 border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Search Metrics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {searchCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="p-4 rounded-xl bg-muted/30 border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            Zero-Result Queries
          </h2>
          {stats.topZeroResultQueries.length === 0 ? (
            <p className="text-xs text-muted-foreground">No zero-result queries in the last 7 days</p>
          ) : (
            <div className="space-y-2">
              {stats.topZeroResultQueries.map((q, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{q.query}</span>
                  <span className="text-muted-foreground/60 ml-2">{q.count}x</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-500" />
            Top Queries (7d)
          </h2>
          {stats.topQueries.length === 0 ? (
            <p className="text-xs text-muted-foreground">No queries in the last 7 days</p>
          ) : (
            <div className="space-y-2">
              {stats.topQueries.map((q, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{q.query}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/60 ml-2">
                    <span>{q.count}x</span>
                    <span>{q.avgResults} results avg</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
