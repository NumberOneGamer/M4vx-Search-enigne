'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
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
    <div className="flex flex-col min-h-screen">
      <header className="flex justify-between items-center p-4">
        <div className="w-10" />
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-20">
        <h1 className="text-5xl font-bold mb-2 tracking-tight">
          <span className="text-primary">M4vx</span> Search
        </h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Fast, private, modern web search
        </p>

        <div className="w-full max-w-2xl">
          <SearchBar
            query={query}
            onChange={setQuery}
            onSubmit={handleSearch}
            showSuggestions
          />
        </div>

        <div className="mt-8 flex gap-2 text-sm text-muted-foreground">
          <span>Try:</span>
          <button
            onClick={() => router.push('/search?q=next.js+documentation')}
            className="hover:text-primary underline underline-offset-2"
          >
            next.js documentation
          </button>
          <button
            onClick={() => router.push('/search?q=typescript+tutorial')}
            className="hover:text-primary underline underline-offset-2"
          >
            typescript tutorial
          </button>
          <button
            onClick={() => router.push('/search?q=react+server+components')}
            className="hover:text-primary underline underline-offset-2"
          >
            react server components
          </button>
        </div>
      </main>

      <footer className="p-4 text-center text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} M4vx Search Engine. All rights reserved.</p>
      </footer>
    </div>
  );
}
