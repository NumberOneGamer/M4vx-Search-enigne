'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, MousePointerClick, Clock, Search, RefreshCw } from 'lucide-react';

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
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Searches', value: data?.totalSearches ?? 0, icon: Search, color: 'text-blue-600' },
    { label: 'Total Clicks', value: data?.totalClicks ?? 0, icon: MousePointerClick, color: 'text-green-600' },
    { label: 'CTR', value: `${(data?.ctr ?? 0).toFixed(1)}%`, icon: TrendingUp, color: 'text-purple-600' },
    { label: 'Avg Response', value: `${data?.avgResponseTime ?? 0}ms`, icon: Clock, color: 'text-orange-600' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Analytics</h1>
        </div>
        <button onClick={fetchAnalytics} className="p-2 hover:bg-accent rounded-lg">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-card border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Top Queries
          </h2>
          {data?.topQueries && data.topQueries.length > 0 ? (
            <div className="space-y-2">
              {data.topQueries.slice(0, 10).map((q, i) => (
                <div key={q.term} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 truncate max-w-[250px]">
                    <span className="text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                    {q.term}
                  </span>
                  <span className="text-muted-foreground shrink-0 ml-2">{q.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No search data yet.</p>
          )}
        </div>

        <div className="bg-card border rounded-xl p-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Searches Per Day (Last 30 days)
          </h2>
          {data?.searchesByDay && data.searchesByDay.length > 0 ? (
            <div className="space-y-1">
              {data.searchesByDay.slice(-14).map((day) => (
                <div key={day.date} className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground w-24 shrink-0">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          (day.count / Math.max(...data.searchesByDay.map((d) => d.count), 1)) * 100, 100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-muted-foreground w-8 text-right shrink-0">{day.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No search data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
