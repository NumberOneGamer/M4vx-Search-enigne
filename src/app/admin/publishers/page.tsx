'use client';

import { timeAgo } from '@/lib/utils';
import { Building2, Check, X, Search, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Publisher {
  id: number;
  name: string;
  url: string;
  logoUrl: string | null;
  isApproved: boolean;
  isBanned: boolean;
  banReason: string | null;
  totalArticles: number;
  totalViews: number;
  lastArticleAt: string | null;
  createdAt: string;
}

export default function PublishersPage() {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const pageSize = 20;

  const fetchPublishers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
      if (filter !== 'all') params.set('status', filter);
      const res = await fetch(`/api/admin/publishers?${params}`);
      const data = await res.json();
      setPublishers(data.publishers);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch publishers', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPublishers(); }, [page, filter]);

  const updatePublisher = async (id: number, updates: Partial<Publisher>) => {
    await fetch(`/api/admin/publishers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    fetchPublishers();
  };

  const deletePublisher = async (id: number) => {
    if (!confirm('Delete this publisher?')) return;
    await fetch(`/api/admin/publishers/${id}`, { method: 'DELETE' });
    fetchPublishers();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">News Publishers</h1>
        <div className="flex items-center gap-2">
          {['all', 'approved', 'pending', 'banned'].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : publishers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No publishers found</div>
      ) : (
        <div className="space-y-2">
          {publishers.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {p.logoUrl ? (
                    <img src={p.logoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{p.name}</span>
                    {p.isApproved && <Check className="w-3.5 h-3.5 text-green-500" />}
                    {p.isBanned && <X className="w-3.5 h-3.5 text-red-500" />}
                  </div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary truncate block">
                    {p.url}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
                <span>{p.totalArticles} articles</span>
                <span>{p.totalViews} views</span>
                {p.lastArticleAt && <span className="hidden sm:inline">{timeAgo(p.lastArticleAt)}</span>}
              </div>
              <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                {!p.isApproved && !p.isBanned && (
                  <button onClick={() => updatePublisher(p.id, { isApproved: true })} className="p-1.5 rounded hover:bg-green-500/10 text-muted-foreground hover:text-green-500 transition-colors" title="Approve">
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {!p.isBanned && (
                  <button onClick={() => updatePublisher(p.id, { isBanned: true, banReason: 'Admin action' })} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors" title="Ban">
                    <X className="w-4 h-4" />
                  </button>
                )}
                {(p.isBanned || p.isApproved) && (
                  <button onClick={() => updatePublisher(p.id, { isApproved: false, isBanned: false, banReason: null })} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Reset">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
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
