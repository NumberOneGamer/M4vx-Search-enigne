export interface SearchQuery {
  q: string;
  page?: number;
  pageSize?: number;
  type?: 'all' | 'web' | 'news' | 'images' | 'videos' | 'ai';
  language?: string;
  fileType?: string;
  site?: string;
  sort?: 'relevance' | 'date';
}

export interface SearchResult {
  id: number;
  title: string;
  url: string;
  description: string;
  highlightedKeywords: string[];
  domain: string;
  lastCrawledAt: string | null;
  position: number;
  score: number;
  contentType?: string;
  favicon?: string;
  wordCount?: number;
  language?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  correctedQuery?: string;
  relatedSearches: string[];
  suggestions: string[];
  responseTimeMs: number;
  appliedFilters?: AppliedFilters;
  aiSummary?: string | null;
  relatedQuestions?: string[];
}

export interface AppliedFilters {
  site?: string;
  fileType?: string;
  excludeTerms?: string[];
  dateAfter?: string;
  dateBefore?: string;
  datePreset?: string;
  exactPhrases?: string[];
  language?: string;
  sort?: 'relevance' | 'date';
}

export interface NewsResult {
  id: number;
  headline: string;
  url: string;
  description: string;
  body?: string;
  author: string | null;
  publisher: string | null;
  publisherLogo: string | null;
  publishDate: string | null;
  updatedDate: string | null;
  featuredImage: string | null;
  category: string | null;
  source: string | null;
  score: number;
}

export interface VideoResult {
  id: number;
  title: string;
  url: string;
  description: string;
  thumbnailUrl: string | null;
  duration: number | null;
  channelName: string | null;
  channelUrl: string | null;
  publishDate: string | null;
  viewCount: number | null;
  tags: string | null;
  source: string | null;
  embedUrl: string | null;
  quality: string | null;
  score: number;
}

export interface ImageResult {
  id: number;
  url: string;
  altText: string | null;
  caption: string | null;
  pageTitle: string | null;
  pageUrl: string | null;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  mimeType: string | null;
  dominantColor: string | null;
  score: number;
}

export interface AiAnswerResponse {
  answer: string;
  summary: string;
  keyPoints: string[];
  sources: { title: string; url: string; snippet: string }[];
  confidenceScore: number;
  relatedQuestions: string[];
  queryType: 'informational' | 'navigational' | 'transactional' | 'question';
}

export interface UnifiedSearchResponse {
  web?: SearchResponse;
  news?: { results: NewsResult[]; totalResults: number; page: number; pageSize: number };
  videos?: { results: VideoResult[]; totalResults: number; page: number; pageSize: number };
  images?: { results: ImageResult[]; totalResults: number; page: number; pageSize: number };
  ai?: AiAnswerResponse | null;
  query: string;
  responseTimeMs: number;
}

export interface SuggestionResponse {
  suggestions: string[];
  query: string;
}

export interface CrawlRequest {
  urls: string[];
  depth?: number;
  priority?: number;
}

export interface CrawlStatus {
  id: number;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  depth: number;
  attempts: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface DomainInfo {
  id: number;
  url: string;
  name: string;
  authorityScore: number;
  crawlRate: number;
  isBlocklisted: boolean;
  totalPages: number;
  lastCrawledAt: string | null;
}

export interface AdminStats {
  totalPages: number;
  totalDomains: number;
  totalSearches: number;
  totalUsers: number;
  queueSize: number;
  avgResponseTime: number;
  topQueries: { term: string; frequency: number }[];
  crawlRate: { date: string; count: number }[];
  searchTrend: { date: string; count: number }[];
  domainDistribution: { name: string; count: number }[];
  totalNewsArticles?: number;
  totalVideos?: number;
  totalImages?: number;
  indexedNews?: number;
  indexedVideos?: number;
  indexedImages?: number;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
  avatarUrl?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface TokenPayload {
  userId: number;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RankingFactors {
  relevanceWeight: number;
  contentQualityWeight: number;
  freshnessWeight: number;
  backlinkWeight: number;
  engagementWeight: number;
  domainAuthorityWeight: number;
}

export const DEFAULT_RANKING_FACTORS: RankingFactors = {
  relevanceWeight: 0.30,
  contentQualityWeight: 0.20,
  freshnessWeight: 0.10,
  backlinkWeight: 0.15,
  engagementWeight: 0.10,
  domainAuthorityWeight: 0.15,
};

export type SearchTab = 'all' | 'web' | 'news' | 'videos' | 'images' | 'ai';

export interface TrendingItem {
  term: string;
  score: number;
  type: 'trending' | 'rising' | 'daily';
  period: string;
}

export interface NewsFilter {
  timeFrame?: 'hour' | 'today' | 'week' | 'month' | 'year';
  category?: 'technology' | 'gaming' | 'business' | 'science' | 'sports' | 'politics' | 'entertainment';
  publisher?: string;
}

export interface VideoFilter {
  duration?: 'short' | 'medium' | 'long';
  uploadDate?: 'today' | 'week' | 'month' | 'year';
  quality?: 'hd' | 'fullhd' | '4k';
  source?: string;
}

export interface ImageFilter {
  size?: 'small' | 'medium' | 'large' | 'ultrahd';
  orientation?: 'landscape' | 'portrait' | 'square';
  color?: string;
  type?: 'photo' | 'illustration' | 'icon' | 'gif';
}

export interface PublisherInfo {
  id: number;
  name: string;
  url: string;
  logoUrl: string | null;
  isApproved: boolean;
  isBanned: boolean;
  totalArticles: number;
  totalViews: number;
  lastArticleAt: string | null;
}
