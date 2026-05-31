'use client';

import { NewsResult } from '@/types';
import { timeAgo, extractDomain } from '@/lib/utils';
import { FileText, Clock, User, Building2 } from 'lucide-react';

interface NewsResultsProps {
  results: NewsResult[];
  query: string;
}

export function NewsResults({ results, query }: NewsResultsProps) {
  if (!results.length) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">No news articles found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((article) => (
        <article key={article.id} className="group">
          <a href={article.url} target="_blank" rel="noopener noreferrer" className="flex gap-4 p-3 -mx-3 rounded-lg hover:bg-accent/30 transition-colors">
            {article.featuredImage && (
              <div className="flex-shrink-0 w-48 h-28 rounded-lg overflow-hidden bg-muted">
                <img
                  src={article.featuredImage}
                  alt={article.headline}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium text-foreground group-hover:text-primary line-clamp-2 mb-1">
                {article.headline}
              </h3>
              {article.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {article.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground/70 flex-wrap">
                {article.publisher && (
                  <span className="flex items-center gap-1">
                    {article.publisherLogo ? (
                      <img src={article.publisherLogo} alt="" className="w-4 h-4 rounded" />
                    ) : (
                      <Building2 className="w-3.5 h-3.5" />
                    )}
                    {article.publisher}
                  </span>
                )}
                {article.author && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {article.author}
                  </span>
                )}
                {article.publishDate && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {timeAgo(article.publishDate)}
                  </span>
                )}
                {article.category && (
                  <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase tracking-wider">
                    {article.category}
                  </span>
                )}
              </div>
            </div>
          </a>
        </article>
      ))}
    </div>
  );
}
