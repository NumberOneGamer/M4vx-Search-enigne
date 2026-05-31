'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Globe, FileText, Film, Image, Search, Clock, Activity, Database, Zap, TrendingUp } from 'lucide-react';

interface MonitoringStats {
  totalIndexedPages: number;
  totalIndexedImages: number;
  totalIndexedVideos: number;
  totalIndexedNews: number;
  totalCrawled: number;
  searchesLast24h: number;
  searchesLast7d: number;
  avgResponseTimeMs: number;
  crawlHealth: string;
  cacheHitRate: number;
  lastUpdated: string;
}

export default function MonitoringPage() {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/monitoring');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch monitoring stats', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Monitoring Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load monitoring stats
      </div>
    );
  }

  const cards = [
    { label: 'Indexed Pages', value: stats.totalIndexedPages.toLocaleString(), icon: Globe, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Indexed News', value: stats.totalIndexedNews.toLocaleString(), icon: FileText, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Indexed Videos', value: stats.totalIndexedVideos.toLocaleString(), icon: Film, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Indexed Images', value: stats.totalIndexedImages.toLocaleString(), icon: Image, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { label: 'Searches (24h)', value: stats.searchesLast24h.toLocaleString(), icon: Search, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Searches (7d)', value: stats.searchesLast7d.toLocaleString(), icon: TrendingUp, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: 'Avg Response', value: `${stats.avgResponseTimeMs}ms`, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { label: 'Cache Hit Rate', value: `${stats.cacheHitRate}%`, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  const services = [
    { name: 'Crawl Engine', status: stats.crawlHealth === 'healthy' ? 'healthy' : 'idle', icon: Database },
    { name: 'Search API', status: 'healthy', icon: Search },
    { name: 'Cache Layer', status: stats.cacheHitRate > 70 ? 'healthy' : 'degraded', icon: Zap },
    { name: 'Indexer', status: stats.totalIndexedPages > 0 ? 'healthy' : 'idle', icon: Activity },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Monitoring Dashboard</h1>
        <button onClick={fetchStats} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Last updated: {new Date(stats.lastUpdated).toLocaleTimeString()}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => {
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

      <h2 className="text-lg font-semibold mb-4">Service Status</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {services.map((service) => {
          const Icon = service.icon;
          const statusColor = service.status === 'healthy' ? 'bg-green-500' : service.status === 'degraded' ? 'bg-yellow-500' : 'bg-muted-foreground/30';
          return (
            <div key={service.name} className="p-4 rounded-xl bg-muted/30 border border-border/40">
              <div className="flex items-center gap-3 mb-2">
                <Icon className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium text-sm">{service.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                <span className="text-xs text-muted-foreground capitalize">{service.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
