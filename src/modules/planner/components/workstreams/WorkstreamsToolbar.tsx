// ============================================================
// WORKSTREAMS TOOLBAR
// Search and filter controls for workstreams view
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type HealthFilter = 'all' | 'healthy' | 'at-risk' | 'critical';

interface WorkstreamsToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  healthFilter: HealthFilter;
  onHealthFilterChange: (health: HealthFilter) => void;
  totalCount: number;
}

const FILTER_PILLS: { key: HealthFilter; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: '#64748b' },
  { key: 'healthy', label: 'Healthy', color: '#10b981' },
  { key: 'at-risk', label: 'At Risk', color: '#f59e0b' },
  { key: 'critical', label: 'Critical', color: '#ef4444' },
];

export function WorkstreamsToolbar({
  searchQuery,
  onSearchChange,
  healthFilter,
  onHealthFilterChange,
  totalCount,
}: WorkstreamsToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex items-center gap-4 mb-6">
      {/* Search Input */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search workstreams..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            'w-full h-10 pl-10 pr-16 rounded-lg border bg-white dark:bg-slate-800',
            'text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400',
            'outline-none transition-colors',
            isFocused
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-slate-200 dark:border-slate-700'
          )}
        />
        {searchQuery ? (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        ) : (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-mono">
            ⌘K
          </span>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        {FILTER_PILLS.map((pill) => (
          <button
            key={pill.key}
            onClick={() => onHealthFilterChange(pill.key === healthFilter ? 'all' : pill.key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              'border',
              healthFilter === pill.key
                ? 'text-white border-transparent'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            )}
            style={{
              backgroundColor: healthFilter === pill.key ? pill.color : undefined,
            }}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Count */}
      <span className="text-sm text-slate-500 dark:text-slate-400">
        {totalCount} workstream{totalCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
