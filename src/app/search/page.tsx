'use client';

import { useState, FormEvent, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Loader2, TrendingUp, Search, Filter, X, ChevronRight, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';

function useKeyboardShortcuts(activeTab: SearchTab, setActiveTab: (tab: SearchTab) => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!e.ctrlKey && !e.metaKey) return;
      const key = e.key.toLowerCase();
      if (key === 'i') { e.preventDefault(); setActiveTab('images'); }
      else if (key === 'v') { e.preventDefault(); setActiveTab('videos'); }
      else if (key === 'n') { e.preventDefault(); setActiveTab('news'); }
      else if (key === 'a') { e.preventDefault(); setActiveTab('all'); }
      else if (key === 'w') { e.preventDefault(); setActiveTab('web'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setActiveTab]);
}

function useInfiniteScroll(
  containerRef: React.RefObject<HTMLDivElement | null>,
  onLoadMore: () => void,
  hasMore: boolean,
  loading: boolean
) {
  useEffect(() => {
    if (!containerRef.current || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );
    const sentinel = document.getElementById('infinite-scroll-sentinel');
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, [containerRef, onLoadMore, hasMore, loading]);
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const initialTab = (searchParams.get('tab') || 'all') as SearchTab;
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(query);
  const [activeTab, setActiveTab] = useState<SearchTab>(initialTab);
  const [webResults, setWebResults] = useState<SearchResponse | null>(null);
  const [newsResults, setNewsResults] = useState<{ results: NewsResult[]; totalResults: number } | null>(null);
  const [videoResults, setVideoResults] = useState<{ results: VideoResult[]; totalResults: number } | null>(null);
  const [imageResults, setImageResults] = useState<{ results: ImageResult[]; totalResults: number } | null>(null);
  const [imagePage, setImagePage] = useState(1);
  const [allImageResults, setAllImageResults] = useState<ImageResult[]>([]);
  const [hasMoreImages, setHasMoreImages] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<AiAnswerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState('');
  const [trending, setTrending] = useState<string[]>([]);
  const [newsFilter, setNewsFilter] = useState<NewsFilter>({});
  const [videoFilter, setVideoFilter] = useState<VideoFilter>({});
  const [imageFilter, setImageFilter] = useState<ImageFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [language, setLanguage] = useState('all');
  const [webSite, setWebSite] = useState('');
  const [webFileType, setWebFileType] = useState('');
  const [webDatePreset, setWebDatePreset] = useState('');
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const prevQueryRef = useRef(query);

  useKeyboardShortcuts(activeTab, setActiveTab);

  const pageSize = activeTab === 'images' ? 20 : activeTab === 'videos' ? 12 : 10;

  const handleTabChange = useCallback((tab: SearchTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    params.set('page', '1');
    window.history.replaceState(null, '', `/search?${params.toString()}`);
  }, [searchParams]);

  const fetchImages = useCallback(async (q: string, pg: number, append = false) => {
    if (!q) return;
    setImageLoading(true);
    try {
      const params = new URLSearchParams({ q, page: pg.toString(), pageSize: '20' });
      if (imageFilter.size) params.set('size', imageFilter.size);
      if (imageFilter.orientation) params.set('orientation', imageFilter.orientation);
      if (imageFilter.color) params.set('color', imageFilter.color);
      if (imageFilter.type) params.set('imageType', imageFilter.type);
      const res = await fetch(`/api/search/images?${params}`);
      const data = await res.json();
      if (data.results) {
        if (append) {
          setAllImageResults((prev) => [...prev, ...data.results]);
          setImageResults((prev) => ({ results: [...(prev?.results || []), ...data.results], totalResults: data.totalResults }));
        } else {
          setAllImageResults(data.results);
          setImageResults({ results: data.results, totalResults: data.totalResults });
        }
        setHasMoreImages(data.results.length === 20);
      }
    } catch (e) { console.error('Image fetch error:', e); }
    setImageLoading(false);
  }, [imageFilter]);

  const loadMoreImages = useCallback(() => {
    if (!imageLoading && hasMoreImages) {
      const nextPage = imagePage + 1;
      setImagePage(nextPage);
      fetchImages(query, nextPage, true);
    }
  }, [imageLoading, hasMoreImages, imagePage, fetchImages, query]);

  useInfiniteScroll(imageContainerRef, loadMoreImages, hasMoreImages, imageLoading);

  useEffect(() => { setSearchInput(query); }, [query]);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError('');

    if (prevQueryRef.current !== query) {
      setAllImageResults([]);
      setImagePage(1);
    }
    prevQueryRef.current = query;

    const fetchWeb = fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}${language !== 'all' ? `&language=${language}` : ''}${webSite ? `&site=${encodeURIComponent(webSite)}` : ''}${webFileType ? `&fileType=${webFileType}` : ''}${webDatePreset ? `&datePreset=${webDatePreset}` : ''}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setWebResults(data));

    const fetchNews = activeTab === 'all' || activeTab === 'news' ? fetch(`/api/search/news?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}${newsFilter.timeFrame ? `&timeFrame=${newsFilter.timeFrame}` : ''}${newsFilter.category ? `&category=${newsFilter.category}` : ''}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setNewsResults(data)) : Promise.resolve();

    const fetchVids = activeTab === 'all' || activeTab === 'videos' ? fetch(`/api/search/videos?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}${videoFilter.duration ? `&duration=${videoFilter.duration}` : ''}${videoFilter.quality ? `&quality=${videoFilter.quality}` : ''}${videoFilter.uploadDate ? `&uploadDate=${videoFilter.uploadDate}` : ''}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setVideoResults(data)) : Promise.resolve();

    const fetchImgs = activeTab === 'all' || activeTab === 'images' ? fetchImages(query, 1, false) : Promise.resolve();

    Promise.all([fetchWeb, fetchNews, fetchVids, fetchImgs])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    if (activeTab === 'ai' || activeTab === 'all') {
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
        .catch((e) => console.error('AI answer fetch error:', e))
        .finally(() => setAiLoading(false));
    }
  }, [query, page, activeTab, newsFilter, videoFilter, fetchImages, pageSize]);

  useEffect(() => {
    fetch('/api/suggestions?q=trending&limit=5')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.suggestions) setTrending(data.suggestions); })
      .catch((e) => console.error('Trending fetch error:', e));
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      const params = new URLSearchParams();
      params.set('q', searchInput.trim());
      params.set('tab', activeTab);
      router.push(`/search?${params.toString()}`);
    }
  };

  const handleResultClick = useCallback((result: SearchResult, position: number) => {
    fetch('/api/analytics/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchLogId: 0, position, url: result.url, pageId: result.id }),
    }).catch((e) => console.error('Analytics click error:', e));
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
                  <button key={t} onClick={() => router.push(`/search?q=${encodeURIComponent(t)}`)} className="px-4 py-2 text-sm bg-card border border-border rounded-full hover:bg-accent hover:border-border transition-all text-muted-foreground hover:text-foreground">{t}</button>
                ))}
              </div>
            </motion.div>
          )}
          <div className="mt-8 text-xs text-muted-foreground/50 flex items-center gap-3">
            <span>Ctrl+W Web</span>
            <span>Ctrl+N News</span>
            <span>Ctrl+I Images</span>
            <span>Ctrl+V Videos</span>
            <span>Ctrl+A All</span>
          </div>
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
          <div className="flex items-center border-b border-border/50">
            <SearchTabs activeTab={activeTab} onTabChange={handleTabChange} />
            <div className="flex items-center gap-1 ml-auto">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer outline-none transition-colors"
              >
                <option value="all">All langs</option>
                <option value="en">English</option>
                <option value="de">German</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="nl">Dutch</option>
                <option value="ru">Russian</option>
                <option value="ar">Arabic</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
              </select>
            </div>
          </div>
          </div>
      </header>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-border/50 bg-muted/30 overflow-hidden"
          >
            <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap gap-4 items-end">
              {(activeTab === 'all' || activeTab === 'web') && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Site</label>
                    <input type="text" value={webSite} onChange={(e) => setWebSite(e.target.value)} placeholder="example.com" className="h-8 px-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-ring w-40" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">File type</label>
                    <select value={webFileType} onChange={(e) => setWebFileType(e.target.value)} className="h-8 px-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-ring">
                      <option value="">Any</option>
                      <option value="pdf">PDF</option>
                      <option value="doc">DOC</option>
                      <option value="txt">TXT</option>
                      <option value="html">HTML</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Date</label>
                    <select value={webDatePreset} onChange={(e) => setWebDatePreset(e.target.value)} className="h-8 px-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-ring">
                      <option value="">Any time</option>
                      <option value="hour">Past hour</option>
                      <option value="today">Past 24 hours</option>
                      <option value="week">Past week</option>
                      <option value="month">Past month</option>
                      <option value="year">Past year</option>
                    </select>
                  </div>
                </>
              )}
              {activeTab === 'news' && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Time frame</label>
                    <select value={newsFilter.timeFrame || ''} onChange={(e) => setNewsFilter((p) => ({ ...p, timeFrame: e.target.value as any || undefined }))} className="h-8 px-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-ring">
                      <option value="">Any time</option>
                      <option value="hour">Past hour</option>
                      <option value="today">Past 24 hours</option>
                      <option value="week">Past week</option>
                      <option value="month">Past month</option>
                      <option value="year">Past year</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Category</label>
                    <select value={newsFilter.category || ''} onChange={(e) => setNewsFilter((p) => ({ ...p, category: e.target.value as any || undefined }))} className="h-8 px-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-ring">
                      <option value="">All</option>
                      <option value="technology">Technology</option>
                      <option value="gaming">Gaming</option>
                      <option value="business">Business</option>
                      <option value="science">Science</option>
                      <option value="sports">Sports</option>
                      <option value="politics">Politics</option>
                      <option value="entertainment">Entertainment</option>
                    </select>
                  </div>
                </>
              )}
              {activeTab === 'videos' && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Duration</label>
                    <select value={videoFilter.duration || ''} onChange={(e) => setVideoFilter((p) => ({ ...p, duration: e.target.value as any || undefined }))} className="h-8 px-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-ring">
                      <option value="">Any</option>
                      <option value="short">Short (&lt;5 min)</option>
                      <option value="medium">Medium (5-20 min)</option>
                      <option value="long">Long (&gt;20 min)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Upload date</label>
                    <select value={videoFilter.uploadDate || ''} onChange={(e) => setVideoFilter((p) => ({ ...p, uploadDate: e.target.value as any || undefined }))} className="h-8 px-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-ring">
                      <option value="">Any</option>
                      <option value="today">Today</option>
                      <option value="week">This week</option>
                      <option value="month">This month</option>
                      <option value="year">This year</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Quality</label>
                    <select value={videoFilter.quality || ''} onChange={(e) => setVideoFilter((p) => ({ ...p, quality: e.target.value as any || undefined }))} className="h-8 px-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-ring">
                      <option value="">Any</option>
                      <option value="hd">HD</option>
                      <option value="fullhd">Full HD</option>
                      <option value="4k">4K</option>
                    </select>
                  </div>
                </>
              )}
              {activeTab === 'images' && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Size</label>
                    <select value={imageFilter.size || ''} onChange={(e) => setImageFilter((p) => ({ ...p, size: e.target.value as any || undefined }))} className="h-8 px-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-ring">
                      <option value="">Any</option>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                      <option value="ultrahd">Ultra HD</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Orientation</label>
                    <select value={imageFilter.orientation || ''} onChange={(e) => setImageFilter((p) => ({ ...p, orientation: e.target.value as any || undefined }))} className="h-8 px-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-ring">
                      <option value="">Any</option>
                      <option value="landscape">Landscape</option>
                      <option value="portrait">Portrait</option>
                      <option value="square">Square</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Color</label>
                    <input type="text" value={imageFilter.color || ''} onChange={(e) => setImageFilter((p) => ({ ...p, color: e.target.value || undefined }))} placeholder="e.g. red, #ff0000" className="h-8 px-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-ring w-32" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Type</label>
                    <select value={imageFilter.type || ''} onChange={(e) => setImageFilter((p) => ({ ...p, type: e.target.value as any || undefined }))} className="h-8 px-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-ring">
                      <option value="">Any</option>
                      <option value="photo">Photo</option>
                      <option value="illustration">Illustration</option>
                      <option value="icon">Icon</option>
                      <option value="gif">GIF</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-6xl mx-auto px-4 py-6" ref={imageContainerRef}>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-5 w-64 mb-6" />
            {activeTab === 'images' ? (
              <div className="columns-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="break-inside-avoid mb-3">
                    <div className="w-full rounded-lg bg-muted animate-pulse" style={{ height: `${120 + (i * 37) % 160}px` }} />
                  </div>
                ))}
              </div>
            ) : activeTab === 'videos' ? (
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
            {(activeTab === 'ai' || activeTab === 'all') && (
              <AiAnswer data={aiAnswer} loading={aiLoading} />
            )}

            {(activeTab === 'all' || activeTab === 'web') && webResults && (
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

            {(activeTab === 'all' || activeTab === 'news') && newsResults && (
              <div>
                {(activeTab === 'all') && newsResults.totalResults > 0 && (
                  <div className="flex items-center justify-between mb-4 mt-6">
                    <h2 className="text-sm font-semibold text-foreground">News</h2>
                    <button onClick={() => handleTabChange('news')} className="text-xs text-primary hover:underline">View all</button>
                  </div>
                )}
                {activeTab === 'news' && (
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                    {(['today', 'week', 'month', 'year'] as const).map((tf) => (
                      <button key={tf} onClick={() => setNewsFilter((f) => ({ ...f, timeFrame: f.timeFrame === tf ? undefined : tf }))} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${newsFilter.timeFrame === tf ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{tf.charAt(0).toUpperCase() + tf.slice(1)}</button>
                    ))}
                    <span className="w-px h-4 bg-border mx-1" />
                    {(['technology', 'gaming', 'business', 'science', 'sports', 'politics', 'entertainment'] as const).map((cat) => (
                      <button key={cat} onClick={() => setNewsFilter((f) => ({ ...f, category: f.category === cat ? undefined : cat }))} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${newsFilter.category === cat ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{cat}</button>
                    ))}
                  </div>
                )}
                <NewsResults results={newsResults.results} query={query} />
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'videos') && videoResults && (
              <div>
                {(activeTab === 'all') && videoResults.totalResults > 0 && (
                  <div className="flex items-center justify-between mb-4 mt-6">
                    <h2 className="text-sm font-semibold text-foreground">Videos</h2>
                    <button onClick={() => handleTabChange('videos')} className="text-xs text-primary hover:underline">View all</button>
                  </div>
                )}
                {activeTab === 'videos' && (
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                    {(['short', 'medium', 'long'] as const).map((d) => (
                      <button key={d} onClick={() => setVideoFilter((f) => ({ ...f, duration: f.duration === d ? undefined : d }))} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${videoFilter.duration === d ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{d === 'short' ? 'Under 4 min' : d === 'medium' ? '4-20 min' : 'Over 20 min'}</button>
                    ))}
                    <span className="w-px h-4 bg-border mx-1" />
                    {(['hd', 'fullhd', '4k'] as const).map((q) => (
                      <button key={q} onClick={() => setVideoFilter((f) => ({ ...f, quality: f.quality === q ? undefined : q }))} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${videoFilter.quality === q ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{q.toUpperCase()}</button>
                    ))}
                  </div>
                )}
                <VideoResults results={videoResults.results} query={query} />
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'images') && (
              <div>
                {(activeTab === 'all') && allImageResults.length > 0 && (
                  <div className="flex items-center justify-between mb-4 mt-6">
                    <h2 className="text-sm font-semibold text-foreground">Images</h2>
                    <button onClick={() => handleTabChange('images')} className="text-xs text-primary hover:underline">View all</button>
                  </div>
                )}
                {activeTab === 'images' && (
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                    {(['small', 'medium', 'large', 'ultrahd'] as const).map((s) => (
                      <button key={s} onClick={() => setImageFilter((f) => ({ ...f, size: f.size === s ? undefined : s }))} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${imageFilter.size === s ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                    ))}
                    <span className="w-px h-4 bg-border mx-1" />
                    {(['landscape', 'portrait', 'square'] as const).map((o) => (
                      <button key={o} onClick={() => setImageFilter((f) => ({ ...f, orientation: f.orientation === o ? undefined : o }))} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${imageFilter.orientation === o ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{o.charAt(0).toUpperCase() + o.slice(1)}</button>
                    ))}
                    <span className="w-px h-4 bg-border mx-1" />
                    {(['photo', 'illustration', 'icon', 'gif'] as const).map((t) => (
                      <button key={t} onClick={() => setImageFilter((f) => ({ ...f, type: f.type === t ? undefined : t }))} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${imageFilter.type === t ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                    ))}
                  </div>
                )}
                <ImageResults results={allImageResults} query={query} />
                <div id="infinite-scroll-sentinel" className="h-4" />
                {imageLoading && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ai' && aiAnswer && !aiAnswer.summary && !aiLoading && (
              <div className="text-center py-12 text-muted-foreground">No AI overview available for this query</div>
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
