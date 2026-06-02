import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function timeAgo(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatDate(date);
}

export function sanitizeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function highlightMatches(text: string, query: string | string[]): string {
  const terms = Array.isArray(query) ? query : query.split(/\s+/).filter(Boolean);
  const patterns = terms
    .filter(t => t.trim())
    .map(t => `(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`);
  if (!patterns.length) return sanitizeHtml(text);
  const regex = new RegExp(patterns.join('|'), 'gi');
  return sanitizeHtml(text).replace(
    regex,
    '<mark class="bg-black dark:bg-white text-white dark:text-black rounded px-0.5">$&</mark>'
  );
}

export function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
