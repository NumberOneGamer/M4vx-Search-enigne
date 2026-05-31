'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SearchBar } from '@/components/search/search-bar';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex justify-between items-center p-4 md:p-6">
        <div className="w-10" />
        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-accent"
          >
            Sign in
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center"
        >
          <h1 className="text-6xl md:text-7xl font-bold mb-3 tracking-tight">
            <span className="text-gradient">M4vx</span>{' '}
            <span className="text-foreground">Search</span>
          </h1>
          <p className="text-muted-foreground mb-10 text-lg md:text-xl">
            Fast, private, modern web search
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
          className="w-full max-w-2xl"
        >
          <SearchBar
            query={query}
            onChange={setQuery}
            onSubmit={handleSearch}
            showSuggestions
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm"
        >
          <span className="text-muted-foreground">Try:</span>
          <button
            onClick={() => router.push('/search?q=next.js+documentation')}
            className="px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent hover:border-border transition-all"
          >
            next.js documentation
          </button>
          <button
            onClick={() => router.push('/search?q=typescript+tutorial')}
            className="px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent hover:border-border transition-all"
          >
            typescript tutorial
          </button>
          <button
            onClick={() => router.push('/search?q=react+server+components')}
            className="px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent hover:border-border transition-all"
          >
            react server components
          </button>
        </motion.div>
      </main>

      <footer className="p-6 text-center text-xs text-muted-foreground border-t border-border">
        <p>&copy; {new Date().getFullYear()} M4vx Search Engine. All rights reserved.</p>
      </footer>
    </div>
  );
}
