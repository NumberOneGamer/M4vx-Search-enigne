'use client';

import type { SearchResult, AppliedFilters } from '@/types';
import { highlightMatches, formatDate, extractDomain } from '@/lib/utils';
import { ExternalLink, Clock, FileText, Search, Globe, BarChart3, Hash, Tag } from 'lucide-react';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  appliedFilters?: AppliedFilters;
  onResultClick?: (result: SearchResult, position: number) => void;
}

export function SearchResults({ results, query, appliedFilters, onResultClick }: SearchResultsProps) {
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
    <div className="space-y-4">
      {results.map((result, index) => (
        <SearchResultItem
          key={result.id}
          result={result}
          query={query}
          position={index + 1}
          onClick={onResultClick}
        />
      ))}
    </div>
  );
}

function SearchResultItem({ result, query, position, onClick }: {
  result: SearchResult;
  query: string;
  position: number;
  onClick?: (result: SearchResult, position: number) => void;
}) {
  const highlightTerms = [...query.split(/\s+/).filter(Boolean)];
  const domain = result.domain || extractDomain(result.url);

  return (
    <div
      className="group bg-card border border-border rounded-xl p-5 hover:bg-accent/30 transition-all duration-200"
      onClick={() => onClick?.(result, position)}
    >
      <div className="flex items-center gap-2.5 mb-2">
        {result.favicon ? (
          <img
            src={result.favicon}
            alt=""
            className="w-4 h-4 rounded-sm shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <span className="text-xs text-muted-foreground truncate font-mono group-hover:text-foreground transition-colors">
          {domain}
        </span>
        {result.contentType && (
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
            {result.contentType}
          </span>
        )}
        {result.score > 0.5 && (
          <span className="text-xs text-green-600 dark:text-green-400 font-medium" title={`Relevance: ${(result.score * 100).toFixed(0)}%`}>
            {(result.score * 100).toFixed(0)}%
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
            __html: highlightMatches(result.title, highlightTerms),
          }}
        />
      </a>

      <p
        className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: highlightMatches(result.description, highlightTerms),
        }}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-muted-foreground">
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
            {formatDate(result.lastCrawledAt)}
          </span>
        )}
        {result.wordCount !== undefined && result.wordCount > 0 && (
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {result.wordCount.toLocaleString()} words
          </span>
        )}
        {result.contentType && (
          <span className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            {result.contentType}
          </span>
        )}
      </div>
    </div>
  );
}
