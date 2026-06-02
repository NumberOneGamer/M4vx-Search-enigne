'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, RotateCw, Globe, FileText, Film, Image, ExternalLink } from 'lucide-react';

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  web: Globe,
  news: FileText,
  videos: Film,
  images: Image,
};

export default function ContentManagementPage() {
  const [activeType, setActiveType] = useState<string>('web');
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const pageSize = 20;

  const fetchCounts = async () => {
    const res = await fetch('/api/admin/content');
    const data = await res.json();
    if (data.counts) setCounts(data.counts);
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: activeType, page: page.toString(), pageSize: pageSize.toString() });
      const res = await fetch(`/api/admin/content?${params}`);
      const data = await res.json();
      if (data.items) setItems(data.items);
      if (data.total !== undefined) setTotal(data.total);
      if (data.counts) setCounts(data.counts);
    } catch (err) {
      console.error('Failed to fetch content', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCounts(); }, []);
  useEffect(() => { fetchItems(); }, [activeType, page]);

  const deleteItem = async (type: string, id: number) => {
    if (!confirm('Delete this item?')) return;
    await fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, action: 'delete', ids: [id] }),
    });
    fetchItems();
    fetchCounts();
  };

  const reindexItem = async (type: string, id: number) => {
    await fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, action: 'reindex', ids: [id] }),
    });
    fetchItems();
  };

  const totalPages = Math.ceil(total / pageSize);

  const types = [
    { id: 'web', label: `Web Pages (${counts.web ?? '-'})`, icon: Globe },
    { id: 'news', label: `News (${counts.news ?? '-'})`, icon: FileText },
    { id: 'videos', label: `Videos (${counts.videos ?? '-'})`, icon: Film },
    { id: 'images', label: `Images (${counts.images ?? '-'})`, icon: Image },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Content Management</h1>
        <button onClick={() => { fetchItems(); fetchCounts(); }} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Refresh">
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto">
        {types.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => { setActiveType(t.id); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeType === t.id ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No {activeType} items found</div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const Icon = typeIcons[activeType] || Globe;
            const title = item.headline || item.title || item.altText || item.url;
            const url = item.url || item.pageUrl;
            return (
              <div key={`${activeType}-${item.id}-${idx}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium truncate block">{title}</span>
                    <span className="text-xs text-muted-foreground truncate block flex items-center gap-1">
                      {url}
                      <a href={url?.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 inline hover:text-foreground" />
                      </a>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                  <button onClick={() => reindexItem(activeType, item.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Reindex">
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteItem(activeType, item.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
