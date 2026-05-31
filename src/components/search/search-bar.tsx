'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchBarProps {
  query: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  showSuggestions?: boolean;
  large?: boolean;
}

export function SearchBar({ query, onChange, onSubmit, showSuggestions, large }: SearchBarProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!showSuggestions || query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setShowDropdown(data.suggestions?.length > 0);
        }
      } catch {
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, showSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      router.push(`/search?q=${encodeURIComponent(suggestions[selectedIndex])}`);
      setShowDropdown(false);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative w-full">
      <form onSubmit={onSubmit} className="relative">
        <div className={`relative flex items-center ${large ? 'h-14' : 'h-12'}`}>
          <Search className={`absolute left-4 text-muted-foreground ${large ? 'h-6 w-6' : 'h-5 w-5'}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              onChange(e.target.value);
              setSelectedIndex(-1);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search the web..."
            className={`w-full pl-12 pr-12 bg-card border border-border rounded-full
              focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
              ${large ? 'text-lg h-14' : 'text-base h-12'}
              shadow-sm hover:shadow-md transition-all duration-200`}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              className="absolute right-4 p-1 rounded-full hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </form>

      <AnimatePresence>
        {showSuggestions && showDropdown && suggestions.length > 0 && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-modal overflow-hidden"
          >
            {suggestions.map((suggestion, i) => (
              <button
                key={suggestion}
                onClick={() => {
                  router.push(`/search?q=${encodeURIComponent(suggestion)}`);
                  setShowDropdown(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left
                  transition-colors
                  ${i === selectedIndex ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{suggestion}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
