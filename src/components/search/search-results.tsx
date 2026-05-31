'use client';

import type { SearchResult } from '@/types';
import { highlightMatches } from '@/lib/utils';
import { ExternalLink, Clock, FileText, Search } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
}

export function SearchResults({ results, query }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-5">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">No results found</h2>
        <p className="text-muted-foreground max-w-md">
          Try different keywords, check your spelling, or broaden your search terms
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {results.map((result, index) => (
        <SearchResultItem key={result.id} result={result} query={query} position={index + 1} />
      ))}
    </div>
  );
}

function SearchResultItem({ result, query, position }: { result: SearchResult; query: string; position: number }) {
  return (
    <div className="group bg-card border border-border rounded-xl p-5 hover:bg-accent/30 transition-all duration-200">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-muted-foreground truncate font-mono">
          {result.domain}
        </span>
        {result.contentType && (
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
            {result.contentType}
          </span>
        )}
      </div>
      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <h3
          className="text-base md:text-lg text-foreground font-medium group-hover:text-primary transition-colors"
          dangerouslySetInnerHTML={{
            __html: highlightMatches(result.title, query),
          }}
        />
      </a>
      <p
        className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: highlightMatches(result.description, query),
        }}
      />
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Visit</span>
        </a>
        {result.lastCrawledAt && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {new Date(result.lastCrawledAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
      </div>
    </div>
  );
}
