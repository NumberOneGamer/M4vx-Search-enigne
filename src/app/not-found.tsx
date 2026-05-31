'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Home, ArrowLeft } from 'lucide-react';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-8">
          <Search className="h-10 w-10 text-muted-foreground" />
        </div>

        <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
        <p className="text-xl text-muted-foreground mb-2">Page not found</p>
        <p className="text-sm text-muted-foreground/60 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-sm mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search M4vx..."
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-full text-sm
                focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                placeholder:text-muted-foreground/50"
            />
          </div>
        </form>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-accent"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </motion.div>
    </div>
  );
}
