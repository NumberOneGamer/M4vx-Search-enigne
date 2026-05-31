'use client';

import { AiAnswerResponse } from '@/types';
import { Sparkles, Lightbulb, TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react';

interface AiAnswerProps {
  data: AiAnswerResponse | null;
  loading?: boolean;
  error?: string | null;
}

export function AiAnswer({ data, loading, error }: AiAnswerProps) {
  if (loading) {
    return (
      <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-primary/5 via-background to-primary/5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          <span className="text-sm font-medium">Generating AI overview...</span>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl border border-warning/30 bg-warning/5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <span className="text-sm font-medium text-warning">AI overview unavailable</span>
        </div>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!data || !data.summary || data.confidenceScore < 0.3) {
    return null;
  }

  const level = data.confidenceScore > 0.7 ? 'high' : data.confidenceScore > 0.5 ? 'medium' : 'low';
  const levelColors = {
    high: 'text-green-500 bg-green-500/10 border-green-500/20',
    medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    low: 'text-muted-foreground bg-muted/50 border-border/30',
  };

  return (
    <div className="p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold">AI Overview</span>
          {data.queryType && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">
              {data.queryType}
            </span>
          )}
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${levelColors[level]} font-medium`}>
          {data.confidenceScore > 0.7 ? 'High confidence' : data.confidenceScore > 0.5 ? 'Medium confidence' : 'Low confidence'}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-foreground/90 mb-3">
        {data.summary}
      </p>

      {data.keyPoints && data.keyPoints.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium">Key Points</span>
          </div>
          <ul className="space-y-1">
            {data.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-primary/60" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.sources && data.sources.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium">Sources</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.sources.slice(0, 3).map((source, i) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 decoration-border/50"
              >
                {source.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {data.relatedQuestions && data.relatedQuestions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <p className="text-xs font-medium text-muted-foreground mb-2">Related questions</p>
          <div className="flex flex-wrap gap-1.5">
            {data.relatedQuestions.slice(0, 4).map((q, i) => (
              <a
                key={i}
                href={`/search?q=${encodeURIComponent(q)}`}
                className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                {q}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
