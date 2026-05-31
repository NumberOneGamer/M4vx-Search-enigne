'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SearchBar } from '@/components/search/search-bar';
import { SearchResults } from '@/components/search/search-results';
import { Pagination } from '@/components/search/pagination';
import type { SearchResponse } from '@/types';
import { Loader2, TrendingUp, Search } from 'lucide-react';
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
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-4">Searching the web...</p>
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
            <p className="text-sm text-muted-foreground mb-6">
              About <span className="text-foreground font-medium">{results.totalResults.toLocaleString()}</span> results{' '}
              <span className="text-muted-foreground/60">({results.responseTimeMs}ms)</span>
            </p>
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
            <SearchResults results={results.results} query={query} />
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
