'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, HardDrive, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { TableSkeleton } from '@/components/ui/skeleton';

interface Domain {
  id: number;
  url: string;
  name: string;
  authorityScore: number;
  crawlRate: number;
  isBlocklisted: boolean;
  totalPages: number;
  lastCrawledAt: string | null;
}

interface DomainsResponse {
  items: Domain[];
  total: number;
}

export default function DomainsPage() {
  const [data, setData] = useState<DomainsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState({ url: '', name: '' });
  const [showAdd, setShowAdd] = useState(false);
  const { addToast } = useToast();

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/domains?pageSize=50');
      if (res.ok) setData(await res.json());
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDomains(); }, []);

  const handleAdd = async () => {
    try {
      const res = await fetch('/api/admin/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDomain),
      });
      if (res.ok) {
        addToast({ type: 'success', title: 'Domain added' });
        setNewDomain({ url: '', name: '' });
        setShowAdd(false);
        fetchDomains();
      } else {
        const d = await res.json();
        addToast({ type: 'error', title: 'Failed to add domain', description: d.message });
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to add domain' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/domains/${id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast({ type: 'success', title: 'Domain deleted' });
        fetchDomains();
      } else {
        addToast({ type: 'error', title: 'Failed to delete domain' });
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to delete domain' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Domains</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{data?.total ?? 0} total domains</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-90 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Domain
          </button>
          <button
            onClick={fetchDomains}
            className="p-2 rounded-xl hover:bg-accent transition-colors border border-border"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-5 mb-6 shadow-card"
        >
          <h3 className="text-sm font-medium text-foreground mb-3">Add New Domain</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newDomain.name}
              onChange={(e) => setNewDomain(p => ({ ...p, name: e.target.value }))}
              placeholder="Domain name"
              className="flex-1 px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="text"
              value={newDomain.url}
              onChange={(e) => setNewDomain(p => ({ ...p, url: e.target.value }))}
              placeholder="example.com"
              className="flex-1 px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleAdd}
              disabled={!newDomain.url || !newDomain.name}
              className="px-4 py-2 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all"
            >
              Save
            </button>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <TableSkeleton rows={5} cols={6} />
        </div>
      ) : !data?.items.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mb-4">
            <HardDrive className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No domains yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first domain to get started</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-border rounded-xl overflow-hidden shadow-card"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3.5 font-medium text-foreground">Domain</th>
                  <th className="text-center px-4 py-3.5 font-medium text-foreground">Authority</th>
                  <th className="text-center px-4 py-3.5 font-medium text-foreground">Pages</th>
                  <th className="text-center px-4 py-3.5 font-medium text-foreground">Crawl Rate</th>
                  <th className="text-center px-4 py-3.5 font-medium text-foreground">Blocked</th>
                  <th className="text-right px-4 py-3.5 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((domain, i) => (
                  <motion.tr
                    key={domain.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate max-w-[200px]">{domain.name}</span>
                        <a href={`https://${domain.url}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{domain.authorityScore.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{domain.totalPages}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{domain.crawlRate}/min</td>
                    <td className="px-4 py-3 text-center">
                      {domain.isBlocklisted ? (
                        <span className="text-red-500 font-medium text-xs">Yes</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(domain.id)}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                        title="Delete domain"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
