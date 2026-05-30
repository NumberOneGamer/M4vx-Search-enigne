'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SearchBar } from '@/components/search/search-bar';
import { SearchResults } from '@/components/search/search-results';
import { Pagination } from '@/components/search/pagination';
import type { SearchResponse } from '@/types';
import { Loader2, TrendingUp } from 'lucide-react';
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
      <div className="min-h-screen flex flex-col">
        <header className="flex justify-between items-center p-4">
          <Link href="/" className="text-xl font-bold text-primary">
            M4vx Search
          </Link>
          <ThemeToggle />
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <h1 className="text-3xl font-bold mb-6">Search the web</h1>
          <div className="w-full max-w-2xl">
            <SearchBar
              query={searchInput}
              onChange={setSearchInput}
              onSubmit={handleSearch}
              showSuggestions
              large
            />
          </div>
          {trending.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <TrendingUp className="h-4 w-4" />
                Trending searches
              </div>
              <div className="flex flex-wrap gap-2">
                {trending.map((t) => (
                  <button
                    key={t}
                    onClick={() => router.push(`/search?q=${encodeURIComponent(t)}`)}
                    className="px-3 py-1.5 text-sm bg-accent rounded-full hover:bg-accent/80 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-primary shrink-0">
            M4vx
          </Link>
          <div className="flex-1 max-w-2xl">
            <SearchBar
              query={searchInput}
              onChange={setSearchInput}
              onSubmit={handleSearch}
            />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-destructive">
            <p>{error}</p>
          </div>
        ) : results ? (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              About {results.totalResults.toLocaleString()} results ({results.responseTimeMs}ms)
            </p>
            {results.correctedQuery && (
              <p className="text-sm mb-4">
                Showing results for <strong>{results.correctedQuery}</strong>.{' '}
                Search instead for <button
                  onClick={() => router.push(`/search?q=${encodeURIComponent(query)}`)}
                  className="text-primary hover:underline"
                >
                  {query}
                </button>
              </p>
            )}
            <SearchResults results={results.results} query={query} />
            <Pagination
              currentPage={page}
              totalPages={results.totalPages}
              totalResults={results.totalResults}
              pageSize={pageSize}
            />
          </>
        ) : null}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
