'use client';

import { useState, FormEvent, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SearchBar } from '@/components/search/search-bar';
import { SearchResults } from '@/components/search/search-results';
import { Pagination } from '@/components/search/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import type { SearchResponse, SearchResult } from '@/types';
import { Loader2, TrendingUp, Search, Filter, X, MessageSquare, ChevronRight } from 'lucide-react';
import Link from 'next/link';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 10;

  const [searchInput, setSearchInput] = useState(query);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trending, setTrending] = useState<string[]>([]);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError('');

    fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`)
      .then((res) => {
        if (!res.ok) throw new Error('Search failed');
        return res.json();
      })
      .then((data) => {
        setResults(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [query, page]);

  useEffect(() => {
    fetch('/api/suggestions?q=trending&limit=5')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.suggestions) setTrending(data.suggestions);
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleResultClick = useCallback((result: SearchResult, position: number) => {
    fetch('/api/analytics/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchLogId: 0,
        position,
        url: result.url,
        pageId: result.id,
      }),
    }).catch(() => {});
  }, []);

  const appliedFilters = results?.appliedFilters;

  if (!query) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="flex justify-between items-center p-4 md:p-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            <span className="text-gradient">M4vx</span>{' '}
            <span className="text-muted-foreground">Search</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-accent"
            >
              Sign in
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-2xl text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-6">
              <Search className="h-8 w-8 text-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-8 text-foreground">Search the web</h1>
            <SearchBar
              query={searchInput}
              onChange={setSearchInput}
              onSubmit={handleSearch}
              showSuggestions
              large
              placeholder="Search the web..."
            />
          </motion.div>
          {trending.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-10"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 justify-center">
                <TrendingUp className="h-4 w-4" />
                <span>Trending searches</span>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {trending.map((t) => (
                  <button
                    key={t}
                    onClick={() => router.push(`/search?q=${encodeURIComponent(t)}`)}
                    className="px-4 py-2 text-sm bg-card border border-border rounded-full hover:bg-accent hover:border-border transition-all text-muted-foreground hover:text-foreground"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-lg font-bold shrink-0 tracking-tight">
            <span className="text-gradient">M4vx</span>
          </Link>
          <div className="flex-1 max-w-xl">
            <SearchBar
              query={searchInput}
              onChange={setSearchInput}
              onSubmit={handleSearch}
              placeholder="Search the web..."
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-accent"
            >
              Sign in
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-5 w-64 mb-6" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-4 mt-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Loader2 className="h-7 w-7 text-destructive" />
            </div>
            <p className="text-destructive font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Try again
            </button>
          </motion.div>
        ) : results ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-sm text-muted-foreground mb-4">
              About <span className="text-foreground font-medium">{results.totalResults.toLocaleString()}</span> results{' '}
              <span className="text-muted-foreground/60">({results.responseTimeMs}ms)</span>
            </p>

            {results.aiSummary && (
              <div className="mb-6 p-4 bg-accent/30 border border-border rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">AI Summary</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{results.aiSummary}</p>
              </div>
            )}

            {appliedFilters && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                {appliedFilters.site && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">
                    site:{appliedFilters.site}
                    <button
                      onClick={() => router.push(`/search?q=${encodeURIComponent(query.replace(/site:\S+/i, '').trim())}`)}
                      className="hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {appliedFilters.fileType && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">
                    filetype:{appliedFilters.fileType}
                  </span>
                )}
                {appliedFilters.datePreset && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">
                    {appliedFilters.datePreset}
                  </span>
                )}
                {appliedFilters.exactPhrases?.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">
                    &ldquo;{p}&rdquo;
                  </span>
                ))}
              </div>
            )}

            {results.correctedQuery && (
              <div className="mb-6 p-4 bg-accent/30 border border-border rounded-xl text-sm">
                Showing results for <strong className="text-foreground">{results.correctedQuery}</strong>.{' '}
                <button
                  onClick={() => router.push(`/search?q=${encodeURIComponent(query)}`)}
                  className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Search instead for <span className="text-foreground">{query}</span>
                </button>
              </div>
            )}

            <SearchResults
              results={results.results}
              query={query}
              appliedFilters={appliedFilters}
              onResultClick={handleResultClick}
            />

            {results.relatedQuestions && results.relatedQuestions.length > 0 && (
              <div className="mt-8 p-5 bg-card border border-border rounded-xl">
                <h3 className="text-sm font-semibold text-foreground mb-3">Related questions</h3>
                <div className="space-y-2">
                  {results.relatedQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => router.push(`/search?q=${encodeURIComponent(q)}`)}
                      className="w-full flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-3 py-2 transition-colors text-left"
                    >
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Pagination
              currentPage={page}
              totalPages={results.totalPages}
              totalResults={results.totalResults}
              pageSize={pageSize}
            />
          </motion.div>
        ) : null}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
