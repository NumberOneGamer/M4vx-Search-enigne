'use client';

import { useState, useEffect } from 'react';
import { Shield, RefreshCw, Ban } from 'lucide-react';

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Blocklist</h1>
            <p className="text-sm text-muted-foreground">{data.length} blocked domains</p>
          </div>
        </div>
        <button onClick={fetchBlocklist} className="p-2 hover:bg-accent rounded-lg">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16">
          <Ban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-1">No domains blocked</h2>
          <p className="text-sm text-muted-foreground">Blocked domains will appear here</p>
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Domain</th>
                  <th className="text-left px-4 py-3 font-medium">Reason</th>
                  <th className="text-center px-4 py-3 font-medium">Pages</th>
                  <th className="text-right px-4 py-3 font-medium">Blocked Since</th>
                </tr>
              </thead>
              <tbody>
                {data.map((domain) => (
                  <tr key={domain.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{domain.name}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                      {domain.blocklistReason || 'No reason provided'}
                    </td>
                    <td className="px-4 py-3 text-center">{domain.totalPages}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {new Date(domain.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
