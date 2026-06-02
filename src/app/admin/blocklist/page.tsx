'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, RefreshCw, Ban, Unlock, Search, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { TableSkeleton } from '@/components/ui/skeleton';

interface BlockedDomain {
  id: number;
  url: string;
  name: string;
  isBlocklisted: boolean;
  blocklistReason: string | null;
  totalPages: number;
  updatedAt: string;
}

interface SearchResult {
  id: number;
  name: string;
  url: string;
  totalPages: number;
}

export default function BlocklistPage() {
  const [data, setData] = useState<BlockedDomain[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const { addToast } = useToast();

  const fetchBlocklist = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blocklist');
      if (res.ok) {
        const json = await res.json();
        setData(json.items || []);
        setTotal(json.total || 0);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBlocklist(); }, []);

  const searchDomains = async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/domains?pageSize=20&sort=name&order=asc`);
      if (res.ok) {
        const json = await res.json();
        const filtered = (json.items || []).filter(
          (d: any) => !d.isBlocklisted && (d.name.toLowerCase().includes(q.toLowerCase()) || d.url.toLowerCase().includes(q.toLowerCase()))
        );
        setSearchResults(filtered);
      }
    } catch {
    } finally {
      setSearching(false);
    }
  };

  const handleUnblock = async (domainId: number) => {
    try {
      const res = await fetch('/api/admin/blocklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId, blocklisted: false }),
      });
      if (res.ok) {
        addToast({ type: 'success', title: 'Domain unblocked' });
        fetchBlocklist();
      } else {
        addToast({ type: 'error', title: 'Failed to unblock domain' });
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to unblock domain' });
    }
  };

  const handleBlock = async (domainId: number) => {
    try {
      const res = await fetch('/api/admin/blocklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId, blocklisted: true, reason: blockReason || 'Blocked by admin' }),
      });
      if (res.ok) {
        addToast({ type: 'success', title: 'Domain blocked' });
        setBlockReason('');
        setSearchQuery('');
        setSearchResults([]);
        fetchBlocklist();
      } else {
        addToast({ type: 'error', title: 'Failed to block domain' });
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to block domain' });
    }
  };

  const totalBlockedPages = data.reduce((sum, d) => sum + d.totalPages, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Blocklist</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total} blocked domains ({totalBlockedPages} pages blocked)</p>
        </div>
        <button onClick={fetchBlocklist} className="p-2 rounded-xl hover:bg-accent transition-colors border border-border">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-5 mb-6">
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Ban className="h-4 w-4" /> Block a Domain
        </h3>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); searchDomains(e.target.value); }}
              placeholder="Search unblocked domains..."
              className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
            {searchResults.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">{r.name}</span>
                  <span className="text-xs text-muted-foreground">{r.url}</span>
                  <span className="text-xs text-muted-foreground">({r.totalPages} pages)</span>
                </div>
                <button onClick={() => handleBlock(r.id)} className="flex items-center gap-1 px-3 py-1 bg-red-500/10 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors">
                  <Ban className="h-3 w-3" /> Block
                </button>
              </div>
            ))}
          </div>
        )}
        {searchQuery && searchResults.length === 0 && !searching && (
          <p className="text-xs text-muted-foreground mt-2">No unblocked domains match &quot;{searchQuery}&quot;</p>
        )}
      </motion.div>

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <TableSkeleton rows={5} cols={4} />
        </div>
      ) : data.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-5">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">No domains blocked</h2>
          <p className="text-sm text-muted-foreground">Search and block domains above</p>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3.5 font-medium text-foreground">Domain</th>
                  <th className="text-left px-4 py-3.5 font-medium text-foreground">Reason</th>
                  <th className="text-center px-4 py-3.5 font-medium text-foreground">Pages Blocked</th>
                  <th className="text-right px-4 py-3.5 font-medium text-foreground">Blocked Since</th>
                  <th className="text-right px-4 py-3.5 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((domain, i) => (
                  <motion.tr key={domain.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="border-b border-border hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{domain.name}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                      {domain.blocklistReason || <span className="italic text-muted-foreground/60">No reason</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{domain.totalPages}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {new Date(domain.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleUnblock(domain.id)} className="p-1.5 rounded-lg hover:bg-accent transition-colors" title="Unblock domain">
                        <Unlock className="h-3.5 w-3.5 text-muted-foreground hover:text-success" />
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
