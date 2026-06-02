'use client';

import { SearchTab } from '@/types';

const tabs: { id: SearchTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'web', label: 'Web' },
  { id: 'news', label: 'News' },
  { id: 'images', label: 'Images' },
  { id: 'videos', label: 'Videos' },
  { id: 'ai', label: 'AI' },
];

interface SearchTabsProps {
  activeTab: SearchTab;
  onTabChange: (tab: SearchTab) => void;
  counts?: Partial<Record<SearchTab, number>>;
}

export function SearchTabs({ activeTab, onTabChange, counts }: SearchTabsProps) {
  return (
    <div className="flex items-center justify-center gap-1 border-b border-border/50 pb-0.5 overflow-x-auto scrollbar-none">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`relative px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === tab.id
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground/80'
          }`}
        >
          {tab.label}
          {counts?.[tab.id] !== undefined && (
            <span className="ml-1.5 text-xs text-muted-foreground/60">
              {counts[tab.id]}
            </span>
          )}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
