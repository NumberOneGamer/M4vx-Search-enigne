'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, HardDrive, ExternalLink } from 'lucide-react';

interface Domain {
  id: number;
  url: string;
  name: string;
  authorityScore: number;
  crawlRate: number;
  isBlocklisted: boolean;
  totalPages: number;
  lastCrawledAt: string | null;
  createdAt: string;
}

interface DomainsResponse {
  items: Domain[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function DomainsPage() {
  const [data, setData] = useState<DomainsResponse | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <HardDrive className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Domains</h1>
            <p className="text-sm text-muted-foreground">{data?.total ?? 0} total domains</p>
          </div>
        </div>
        <button onClick={fetchDomains} className="p-2 hover:bg-accent rounded-lg">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : !data?.items.length ? (
        <p className="text-center py-16 text-muted-foreground">No domains yet</p>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Domain</th>
                  <th className="text-center px-4 py-3 font-medium">Authority</th>
                  <th className="text-center px-4 py-3 font-medium">Pages</th>
                  <th className="text-center px-4 py-3 font-medium">Crawl Rate</th>
                  <th className="text-center px-4 py-3 font-medium">Blocked</th>
                  <th className="text-right px-4 py-3 font-medium">Last Crawled</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((domain) => (
                  <tr key={domain.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate max-w-[200px]">{domain.name}</span>
                        <a href={`https://${domain.url}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{domain.authorityScore.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center">{domain.totalPages}</td>
                    <td className="px-4 py-3 text-center">{domain.crawlRate}/min</td>
                    <td className="px-4 py-3 text-center">
                      {domain.isBlocklisted ? (
                        <span className="text-red-500 font-medium">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {domain.lastCrawledAt
                        ? new Date(domain.lastCrawledAt).toLocaleDateString()
                        : 'Never'}
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
