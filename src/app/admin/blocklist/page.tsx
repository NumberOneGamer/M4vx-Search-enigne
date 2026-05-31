'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, RefreshCw, Ban, Unlock, Trash2 } from 'lucide-react';
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

export default function BlocklistPage() {
  const [data, setData] = useState<BlockedDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchBlocklist = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blocklist');
      if (res.ok) {
        const json = await res.json();
        setData(json.items || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBlocklist(); }, []);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Blocklist</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{data.length} blocked domains</p>
        </div>
        <button
          onClick={fetchBlocklist}
          className="p-2 rounded-xl hover:bg-accent transition-colors border border-border"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <TableSkeleton rows={5} cols={4} />
        </div>
      ) : data.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-5">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">No domains blocked</h2>
          <p className="text-sm text-muted-foreground">Blocked domains will appear here</p>
        </motion.div>
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
                  <th className="text-left px-4 py-3.5 font-medium text-foreground">Reason</th>
                  <th className="text-center px-4 py-3.5 font-medium text-foreground">Pages</th>
                  <th className="text-right px-4 py-3.5 font-medium text-foreground">Blocked Since</th>
                  <th className="text-right px-4 py-3.5 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((domain, i) => (
                  <motion.tr
                    key={domain.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{domain.name}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                      {domain.blocklistReason || <span className="italic text-muted-foreground/60">No reason provided</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{domain.totalPages}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {new Date(domain.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleUnblock(domain.id)}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                        title="Unblock domain"
                      >
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
