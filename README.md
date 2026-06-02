# M4vx Search Engine

A production-ready web search engine built with Next.js 15, TypeScript, PostgreSQL, Drizzle ORM, Redis, and Tailwind CSS.

## Architecture

```
├── src/
│   ├── app/           # Next.js App Router pages & API routes
│   ├── components/    # UI, search, admin, auth components
│   ├── db/            # Drizzle ORM schema & connection
│   ├── lib/           # Core libraries (crawler, search, auth, cache)
│   ├── services/      # Background services (crawler, indexer, ranker, analytics)
│   └── types/         # TypeScript types
├── docker-compose.yml # PostgreSQL + Redis + App
├── Dockerfile         # Production container
└── drizzle.config.ts  # Drizzle Kit config
```

## Features

- **Web Crawler** - Recursive crawling with robots.txt respect, rate limiting, duplicate detection
- **Full-Text Search** - TF-IDF ranking, tokenization, stemming, boolean operators
- **Ranking Algorithm** - Configurable weights: relevance, content quality, freshness, backlinks, engagement, domain authority
- **Search Suggestions** - Auto-complete with prefix matching and trending searches
- **Admin Dashboard** - Crawl management, queue monitoring, analytics, domain/blocklist management
- **Authentication** - JWT-based auth with role-based access (user/admin)
- **Dark Mode** - Full dark/light theme support
- **REST API** - Search, suggestions, analytics, and admin endpoints
- **Caching** - Redis-based caching for search results and suggestions
- **Docker** - Fully containerized deployment

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (recommended)
- PostgreSQL 16+ (if running locally)
- Redis 7+ (if running locally)

### Using Docker (Recommended)

```bash
# Clone and start
git clone <repo-url>
cd search-engine

# Set JWT secret
$env:JWT_SECRET="your-secret-key"  # PowerShell
# or
export JWT_SECRET="your-secret-key" # Linux/Mac

# Start all services
docker compose up -d

# Run database migrations
docker compose exec app npx drizzle-kit push

# Create admin user (via API)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!","name":"Admin"}'

# Visit http://localhost:3000
```

### Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Run database migrations
npx drizzle-kit push

# 4. Start the app
npm run dev

# 5. (Optional) Start the crawler in a separate terminal
npm run crawler

# 6. (Optional) Start the indexer in a separate terminal
npm run indexer
```

### Adding Seed URLs

```bash
curl -X POST http://localhost:3000/api/admin/crawl \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"urls":["https://example.com"],"depth":2}'
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/search_engine` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | (required) | Secret key for JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | Token expiration time |
| `CRAWLER_USER_AGENT` | `SearchEngineBot/1.0` | User agent for crawler |
| `CRAWLER_DELAY_MS` | `1000` | Delay between requests (ms) |
| `CRAWLER_MAX_DEPTH` | `3` | Maximum crawl depth |
| `CRAWLER_MAX_PAGES_PER_DOMAIN` | `10000` | Max pages per domain |
| `CRAWLER_CONCURRENCY` | `5` | Concurrent crawl tasks |

## API Reference

### Search

```
GET /api/search?q=<query>&page=1&pageSize=10&type=all&sort=relevance
```

### Suggestions

```
GET /api/suggestions?q=<prefix>&limit=8
```

### Analytics

```
GET /api/analytics?from=<iso>&to=<iso>&limit=50
```

### Admin

```
POST /api/admin/crawl    # Add seed URLs
GET  /api/admin/queue    # View crawl queue
GET  /api/admin/domains  # List domains
GET  /api/admin/stats    # Dashboard stats
GET  /api/admin/settings # Get settings
POST /api/admin/settings # Save setting
GET  /api/admin/blocklist # List blocked domains
POST /api/admin/blocklist # Block/unblock domain
```

### Auth

```
POST /api/auth/register  # Register
POST /api/auth/login     # Login
GET  /api/auth/me        # Current user
```

## Database Schema

- **users** - User accounts with role-based access
- **domains** - Crawled domains with authority scores
- **pages** - Indexed web pages with content and metadata
- **crawl_queue** - URL queue for the crawler
- **backlinks** - Internal/external link relationships
- **search_terms** - Search term frequency tracking
- **search_logs** - Search query logs
- **clicks** - Click-through tracking
- **rankings** - Page rankings per keyword with multi-factor scores
- **settings** - Application settings (ranking weights, etc.)

## Ranking Factors

The ranking algorithm uses configurable weights:

| Factor | Default Weight | Description |
|--------|---------------|-------------|
| Keyword Relevance | 0.30 | TF-IDF based keyword matching |
| Content Quality | 0.20 | Word count, headings, meta tags |
| Freshness | 0.10 | Recency of last crawl |
| Backlinks | 0.15 | Number of incoming links |
| Engagement | 0.10 | Click-through rate |
| Domain Authority | 0.15 | Domain trust score |

Weights can be configured in the Admin Dashboard under Settings.

## License

MIT
