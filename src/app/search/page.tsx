'use client';

import { useState, FormEvent, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SearchBar } from '@/components/search/search-bar';
import { SearchResults } from '@/components/search/search-results';
import { NewsResults } from '@/components/search/news-results';
import { VideoResults } from '@/components/search/video-results';
import { ImageResults } from '@/components/search/image-results';
import { AiAnswer } from '@/components/search/ai-answer';
import { SearchTabs } from '@/components/search/search-tabs';
import { Pagination } from '@/components/search/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import type { SearchResponse, SearchResult, NewsResult, VideoResult, ImageResult, AiAnswerResponse, SearchTab, NewsFilter, VideoFilter, ImageFilter } from '@/types';
import { Loader2, TrendingUp, Search, Filter, X, ChevronRight, Clock, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const tab = (searchParams.get('tab') || 'all') as SearchTab;
  const pageSize = tab === 'images' ? 20 : tab === 'videos' ? 12 : 10;

  const [searchInput, setSearchInput] = useState(query);
  const [webResults, setWebResults] = useState<SearchResponse | null>(null);
  const [newsResults, setNewsResults] = useState<{ results: NewsResult[]; totalResults: number } | null>(null);
  const [videoResults, setVideoResults] = useState<{ results: VideoResult[]; totalResults: number } | null>(null);
  const [imageResults, setImageResults] = useState<{ results: ImageResult[]; totalResults: number } | null>(null);
  const [aiAnswer, setAiAnswer] = useState<AiAnswerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [trending, setTrending] = useState<string[]>([]);
  const [newsFilter, setNewsFilter] = useState<NewsFilter>({});
  const [videoFilter, setVideoFilter] = useState<VideoFilter>({});
  const [imageFilter, setImageFilter] = useState<ImageFilter>({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { setSearchInput(query); }, [query]);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError('');

    const fetchWeb = fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setWebResults(data));

    const fetchNews = tab === 'all' || tab === 'news' ? fetch(`/api/search/news?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}${newsFilter.timeFrame ? `&timeFrame=${newsFilter.timeFrame}` : ''}${newsFilter.category ? `&category=${newsFilter.category}` : ''}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setNewsResults(data)) : Promise.resolve();

    const fetchVideos = tab === 'all' || tab === 'videos' ? fetch(`/api/search/videos?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}${videoFilter.duration ? `&duration=${videoFilter.duration}` : ''}${videoFilter.quality ? `&quality=${videoFilter.quality}` : ''}${videoFilter.uploadDate ? `&uploadDate=${videoFilter.uploadDate}` : ''}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setVideoResults(data)) : Promise.resolve();

    const fetchImages = tab === 'all' || tab === 'images' ? fetch(`/api/search/images?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}${imageFilter.size ? `&size=${imageFilter.size}` : ''}${imageFilter.orientation ? `&orientation=${imageFilter.orientation}` : ''}${imageFilter.color ? `&color=${imageFilter.color}` : ''}${imageFilter.type ? `&imageType=${imageFilter.type}` : ''}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setImageResults(data)) : Promise.resolve();

    Promise.all([fetchWeb, fetchNews, fetchVideos, fetchImages])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    if (tab === 'ai' || tab === 'all') {
      setAiLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}&page=1&pageSize=5`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.results?.length) {
            const pageIds = data.results.map((r: SearchResult) => r.id).join(',');
            return fetch(`/api/search/ai?q=${encodeURIComponent(query)}&pageIds=${pageIds}`)
              .then((res) => res.ok ? res.json() : null);
          }
          return null;
        })
        .then((data) => setAiAnswer(data))
        .catch(() => {})
        .finally(() => setAiLoading(false));
    }
  }, [query, page, tab, newsFilter, videoFilter, imageFilter, pageSize]);

  useEffect(() => {
    fetch('/api/suggestions?q=trending&limit=5')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.suggestions) setTrending(data.suggestions); })
      .catch(() => {});
  }, []);

  const updateTab = (newTab: SearchTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    params.set('page', '1');
    router.push(`/search?${params.toString()}`);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      const params = new URLSearchParams();
      params.set('q', searchInput.trim());
      params.set('tab', tab);
      router.push(`/search?${params.toString()}`);
    }
  };

  const handleResultClick = useCallback((result: SearchResult, position: number) => {
    fetch('/api/analytics/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchLogId: 0, position, url: result.url, pageId: result.id }),
    }).catch(() => {});
  }, []);

  const appliedFilters = webResults?.appliedFilters;

  if (!query) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="flex justify-between items-center p-4 md:p-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            <span className="text-gradient">M4vx</span>{' '}
            <span className="text-muted-foreground">Search</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-accent">Sign in</Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-6">
              <Search className="h-8 w-8 text-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-8 text-foreground">Search the web</h1>
            <SearchBar query={searchInput} onChange={setSearchInput} onSubmit={handleSearch} showSuggestions large placeholder="Search the web..." />
          </motion.div>
          {trending.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mt-10">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 justify-center">
                <TrendingUp className="h-4 w-4" />
                <span>Trending searches</span>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {trending.map((t) => (
                  <button key={t} onClick={() => router.push(`/search?q=${encodeURIComponent(t)}`)} className="px-4 py-2 text-sm bg-card border border-border rounded-full hover:bg-accent hover:border-border transition-all text-muted-foreground hover:text-foreground">
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
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <Link href="/" className="text-lg font-bold shrink-0 tracking-tight">
              <span className="text-gradient">M4vx</span>
            </Link>
            <div className="flex-1 max-w-lg">
              <SearchBar query={searchInput} onChange={setSearchInput} onSubmit={handleSearch} placeholder="Search..." />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-accent">Sign in</Link>
              <ThemeToggle />
            </div>
          </div>
          <SearchTabs activeTab={tab} onTabChange={updateTab} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-5 w-64 mb-6" />
            {tab === 'images' ? (
              <div className="columns-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="break-inside-avoid mb-3">
                    <div className="w-full rounded-lg bg-muted animate-pulse" style={{ height: `${120 + (i * 37) % 160}px` }} />
                  </div>
                ))}
              </div>
            ) : tab === 'videos' ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-video rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              Array.from({ length: 5 }).map((_, i) => (
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
              ))
            )}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Loader2 className="h-7 w-7 text-destructive" />
            </div>
            <p className="text-destructive font-medium">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-4 text-sm text-muted-foreground hover:text-foreground underline underline-offset-2">Try again</button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {(tab === 'ai' || tab === 'all') && (
              <AiAnswer data={aiAnswer} loading={aiLoading} />
            )}

            {(tab === 'all' || tab === 'web') && webResults && (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  About <span className="text-foreground font-medium">{webResults.totalResults.toLocaleString()}</span> web results{' '}
                  <span className="text-muted-foreground/60">({webResults.responseTimeMs}ms)</span>
                </p>
                {appliedFilters && (
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    {appliedFilters.site && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">
                        site:{appliedFilters.site}
                        <button onClick={() => router.push(`/search?q=${encodeURIComponent(query.replace(/site:\S+/i, '').trim())}`)} className="hover:text-foreground"><X className="h-3 w-3" /></button>
                      </span>
                    )}
                    {appliedFilters.fileType && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">filetype:{appliedFilters.fileType}</span>
                    )}
                    {appliedFilters.datePreset && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">{appliedFilters.datePreset}</span>
                    )}
                    {appliedFilters.exactPhrases?.map((p) => (
                      <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">&ldquo;{p}&rdquo;</span>
                    ))}
                  </div>
                )}
                {webResults.correctedQuery && (
                  <div className="mb-6 p-4 bg-accent/30 border border-border rounded-xl text-sm">
                    Showing results for <strong className="text-foreground">{webResults.correctedQuery}</strong>.{' '}
                    <button onClick={() => router.push(`/search?q=${encodeURIComponent(query)}`)} className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
                      Search instead for <span className="text-foreground">{query}</span>
                    </button>
                  </div>
                )}
                <SearchResults results={webResults.results} query={query} appliedFilters={appliedFilters} onResultClick={handleResultClick} />
                {webResults.relatedQuestions && webResults.relatedQuestions.length > 0 && (
                  <div className="mt-8 p-5 bg-card border border-border rounded-xl">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Related questions</h3>
                    <div className="space-y-2">
                      {webResults.relatedQuestions.map((q) => (
                        <button key={q} onClick={() => router.push(`/search?q=${encodeURIComponent(q)}`)} className="w-full flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-3 py-2 transition-colors text-left">
                          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                          <span>{q}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <Pagination currentPage={page} totalPages={webResults.totalPages} totalResults={webResults.totalResults} pageSize={pageSize} />
              </>
            )}

            {(tab === 'all' || tab === 'news') && newsResults && (
              <div>
                {(tab === 'all') && newsResults.totalResults > 0 && (
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-foreground">News</h2>
                    <button onClick={() => updateTab('news')} className="text-xs text-primary hover:underline">View all</button>
                  </div>
                )}
                {tab === 'news' && (
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                    {(['today', 'week', 'month', 'year'] as const).map((tf) => (
                      <button key={tf} onClick={() => setNewsFilter((f) => ({ ...f, timeFrame: f.timeFrame === tf ? undefined : tf }))} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${newsFilter.timeFrame === tf ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                        {tf.charAt(0).toUpperCase() + tf.slice(1)}
                      </button>
                    ))}
                    <span className="w-px h-4 bg-border mx-1" />
                    {(['technology', 'gaming', 'business', 'science', 'sports', 'politics', 'entertainment'] as const).map((cat) => (
                      <button key={cat} onClick={() => setNewsFilter((f) => ({ ...f, category: f.category === cat ? undefined : cat }))} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${newsFilter.category === cat ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
                <NewsResults results={newsResults.results} query={query} />
              </div>
            )}

            {(tab === 'all' || tab === 'videos') && videoResults && (
              <div>
                {(tab === 'all') && videoResults.totalResults > 0 && (
                  <div className="flex items-center justify-between mb-4 mt-6">
                    <h2 className="text-sm font-semibold text-foreground">Videos</h2>
                    <button onClick={() => updateTab('videos')} className="text-xs text-primary hover:underline">View all</button>
                  </div>
                )}
                {tab === 'videos' && (
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                    {(['short', 'medium', 'long'] as const).map((d) => (
                      <button key={d} onClick={() => setVideoFilter((f) => ({ ...f, duration: f.duration === d ? undefined : d }))} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${videoFilter.duration === d ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                        {d === 'short' ? 'Under 4 min' : d === 'medium' ? '4-20 min' : 'Over 20 min'}
                      </button>
                    ))}
                    <span className="w-px h-4 bg-border mx-1" />
                    {(['hd', 'fullhd', '4k'] as const).map((q) => (
                      <button key={q} onClick={() => setVideoFilter((f) => ({ ...f, quality: f.quality === q ? undefined : q }))} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${videoFilter.quality === q ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                        {q.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
                <VideoResults results={videoResults.results} query={query} />
              </div>
            )}

            {(tab === 'all' || tab === 'images') && imageResults && (
              <div>
                {(tab === 'all') && imageResults.totalResults > 0 && (
                  <div className="flex items-center justify-between mb-4 mt-6">
                    <h2 className="text-sm font-semibold text-foreground">Images</h2>
                    <button onClick={() => updateTab('images')} className="text-xs text-primary hover:underline">View all</button>
                  </div>
                )}
                {tab === 'images' && (
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                    {(['small', 'medium', 'large', 'ultrahd'] as const).map((s) => (
                      <button key={s} onClick={() => setImageFilter((f) => ({ ...f, size: f.size === s ? undefined : s }))} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${imageFilter.size === s ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                    <span className="w-px h-4 bg-border mx-1" />
                    {(['landscape', 'portrait', 'square'] as const).map((o) => (
                      <button key={o} onClick={() => setImageFilter((f) => ({ ...f, orientation: f.orientation === o ? undefined : o }))} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${imageFilter.orientation === o ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                        {o.charAt(0).toUpperCase() + o.slice(1)}
                      </button>
                    ))}
                    <span className="w-px h-4 bg-border mx-1" />
                    {(['photo', 'illustration', 'icon', 'gif'] as const).map((t) => (
                      <button key={t} onClick={() => setImageFilter((f) => ({ ...f, type: f.type === t ? undefined : t }))} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${imageFilter.type === t ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
                <ImageResults results={imageResults.results} query={query} />
              </div>
            )}

            {tab === 'ai' && aiAnswer && !aiAnswer.summary && !aiLoading && (
              <div className="text-center py-12 text-muted-foreground">
                No AI overview available for this query
              </div>
            )}
          </motion.div>
        )}
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
