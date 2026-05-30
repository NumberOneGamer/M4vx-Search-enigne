export interface SearchQuery {
  q: string;
  page?: number;
  pageSize?: number;
  type?: 'all' | 'web' | 'news' | 'images';
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
