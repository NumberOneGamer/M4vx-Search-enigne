'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function SearchError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <h2 className="text-lg font-semibold mb-1">Search error</h2>
        <p className="text-sm text-muted-foreground mb-4">Failed to load search results. Check your connection and try again.</p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    </div>
  );
}
