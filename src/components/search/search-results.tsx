import type { SearchResult } from '@/types';
import { highlightMatches } from '@/lib/utils';
import { ExternalLink, Clock, FileText } from 'lucide-react';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
}

export function SearchResults({ results, query }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-muted-foreground">
          Try different keywords or check your spelling
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {results.map((result) => (
        <div key={result.id} className="group">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground truncate">
              {result.domain}
            </span>
            {result.contentType && (
              <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">
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
              className="text-lg text-primary hover:underline font-medium"
              dangerouslySetInnerHTML={{
                __html: highlightMatches(result.title, query),
              }}
            />
          </a>
          <p
            className="text-sm text-muted-foreground mt-1 line-clamp-2"
            dangerouslySetInnerHTML={{
              __html: highlightMatches(result.description, query),
            }}
          />
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary"
            >
              <ExternalLink className="h-3 w-3" />
              Visit
            </a>
            {result.lastCrawledAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(result.lastCrawledAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
