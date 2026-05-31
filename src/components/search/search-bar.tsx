'use client';

import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TrendingUp, History, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { highlightMatches } from '@/lib/utils';

interface SearchBarProps {
  query: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  showSuggestions?: boolean;
  large?: boolean;
  placeholder?: string;
}

export function SearchBar({ query, onChange, onSubmit, showSuggestions, large, placeholder }: SearchBarProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  const fetchSuggestions = useCallback(async (prefix: string) => {
    if (!showSuggestions || prefix.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/suggestions?q=${encodeURIComponent(prefix)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        const items = data.suggestions || [];
        setSuggestions(items);
        setShowDropdown(items.length > 0);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [showSuggestions]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestions]);

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

  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    router.push(`/search?q=${encodeURIComponent(suggestion)}`);
    setShowDropdown(false);
  };

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
      selectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  const inputPlaceholder = placeholder || 'Search the web...';

  return (
    <div className="relative w-full">
      <form onSubmit={onSubmit} className="relative">
        <div className={`relative flex items-center ${large ? 'h-14' : 'h-12'}`}>
          <Search className={`absolute left-4 text-muted-foreground ${large ? 'h-6 w-6' : 'h-5 w-5'}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            autoComplete="off"
            role="combobox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            onChange={(e) => {
              onChange(e.target.value);
              setSelectedIndex(-1);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            className={`w-full pl-12 pr-12 bg-card border border-border rounded-full
              focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
              placeholder:text-muted-foreground/50
              ${large ? 'text-lg h-14' : 'text-base h-12'}
              shadow-sm hover:shadow-md transition-all duration-200`}
          />
          <div className="absolute right-4 flex items-center gap-1">
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {query && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-full hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </form>

      <AnimatePresence>
        {showSuggestions && showDropdown && suggestions.length > 0 && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-modal overflow-hidden"
          >
            {suggestions.map((suggestion, i) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left
                  transition-colors
                  ${i === selectedIndex ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                role="option"
                aria-selected={i === selectedIndex}
              >
                <Search className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span
                  className="truncate"
                  dangerouslySetInnerHTML={{
                    __html: highlightMatches(suggestion, query),
                  }}
                />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
