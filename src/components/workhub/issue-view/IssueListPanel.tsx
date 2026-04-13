/**
 * IssueListPanel — Left panel with navigation, search, and issue list
 * ════════════════════════════════════════════════════════════════════════════
 * Features: search with debounce, direct key jump, filter chips,
 * keyboard nav (up/down), infinite scroll, skeleton loading.
 */
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Search, X, ChevronDown, Loader2 } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import type { AllWorkItem } from '@/types/allwork.types';

interface IssueListPanelProps {
  projectKey: string;
  selectedIssueKey: string | null;
  onSelectIssue: (key: string) => void;
  onSearch: (query: string) => void;
  isDark: boolean;
  items?: AllWorkItem[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

const PRIORITY_ICONS: Record<string, { color: string; label: string }> = {
  Highest: { color: '#EF4444', label: 'Highest' },
  High:    { color: '#F97316', label: 'High' },
  Medium:  { color: '#3B82F6', label: 'Medium' },
  Low:     { color: '#22C55E', label: 'Low' },
  Lowest:  { color: '#8C8F96', label: 'Lowest' },
};

function SkeletonRow({ isDark }: { isDark: boolean }) {
  return (
    <div className={cn('px-4 py-3 flex flex-col gap-2 animate-pulse')}>
      <div className="flex items-center gap-2">
        <div className={cn('w-4 h-4 rounded', isDark ? 'bg-[#292929]' : 'bg-[#E2E8F0]')} />
        <div className={cn('w-16 h-3 rounded', isDark ? 'bg-[#292929]' : 'bg-[#E2E8F0]')} />
        <div className="ml-auto">
          <div className={cn('w-12 h-5 rounded-full', isDark ? 'bg-[#292929]' : 'bg-[#E2E8F0]')} />
        </div>
      </div>
      <div className={cn('w-3/4 h-3.5 rounded', isDark ? 'bg-[#292929]' : 'bg-[#E2E8F0]')} />
    </div>
  );
}

export function IssueListPanel({
  projectKey,
  selectedIssueKey,
  onSelectIssue,
  onSearch,
  isDark,
  items = [],
  loading = false,
  hasMore = false,
  onLoadMore,
}: IssueListPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(value), 300);
  }, [onSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!items.length) return;
    const currentIdx = items.findIndex(i => i.issue_key === selectedIssueKey);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(currentIdx + 1, items.length - 1);
      onSelectIssue(items[next].issue_key);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(currentIdx - 1, 0);
      onSelectIssue(items[prev].issue_key);
    }
  }, [items, selectedIssueKey, onSelectIssue]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    if (!listRef.current || !hasMore || loading || !onLoadMore) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollTop + clientHeight >= scrollHeight * 0.75) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  // Filter chips
  const FILTER_CHIPS = ['Type', 'Status', 'Assignee', 'Priority'];

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* ─── Header: project selector ─── */}
      <div className={cn(
        'px-4 py-3 border-b shrink-0',
        isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]',
      )}>
        <button className={cn(
          'flex items-center gap-2 font-body text-sm font-medium px-2 py-1 rounded-md transition-colors w-full',
          isDark
            ? 'text-[#EDEDED] hover:bg-[#1F1F1F]'
            : 'text-[#292A2E] hover:bg-[#F4F5F7]',
        )}>
          <span className="font-heading font-semibold">{projectKey}</span>
          <span className={cn('text-xs', isDark ? 'text-[#A1A1A1]' : 'text-[#505258]')}>
            All work
          </span>
          <ChevronDown className="w-3.5 h-3.5 ml-auto opacity-60" />
        </button>
      </div>

      {/* ─── Search ─── */}
      <div className={cn(
        'px-3 py-2 border-b shrink-0',
        isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]',
      )}>
        <div className={cn(
          'flex items-center gap-2 px-2.5 py-1.5 rounded-md border transition-colors',
          isDark
            ? 'bg-[#1A1A1A] border-[#2E2E2E] focus-within:border-[#0C66E4]'
            : 'bg-white border-[#DFE1E6] focus-within:border-[#0C66E4]',
        )}>
          <Search className={cn('w-3.5 h-3.5 shrink-0', isDark ? 'text-[#878787]' : 'text-[#505258]')} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search issues (key, summary, text)..."
            className={cn(
              'flex-1 bg-transparent border-none outline-none font-body text-sm',
              isDark ? 'text-[#EDEDED] placeholder:text-[#878787]' : 'text-[#292A2E] placeholder:text-[#878787]',
            )}
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className={cn('p-0.5 rounded', isDark ? 'hover:bg-[#292929]' : 'hover:bg-[#F4F5F7]')}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Filter chips ─── */}
      <div className={cn(
        'px-3 py-2 border-b shrink-0 flex items-center gap-1.5 overflow-x-auto scrollbar-none',
        isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]',
      )}>
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-body font-medium whitespace-nowrap',
              'border transition-colors',
              activeFilters.includes(chip)
                ? isDark
                  ? 'bg-[#1A1A1A] border-[#0C66E4] text-[#EDEDED]'
                  : 'bg-[#E9F2FF] border-[#0C66E4] text-[#0C66E4]'
                : isDark
                  ? 'bg-transparent border-[#2E2E2E] text-[#A1A1A1] hover:border-[#454545]'
                  : 'bg-transparent border-[#DFE1E6] text-[#505258] hover:border-[#B3BAC5]',
            )}
            onClick={() => setActiveFilters(prev =>
              prev.includes(chip) ? prev.filter(f => f !== chip) : [...prev, chip]
            )}
          >
            {chip}
            <ChevronDown className="w-3 h-3" />
          </button>
        ))}
      </div>

      {/* ─── Issue list ─── */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {loading && !items.length ? (
          // Skeleton loading
          Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} isDark={isDark} />
          ))
        ) : items.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <p className={cn('font-body text-sm', isDark ? 'text-[#A1A1A1]' : 'text-[#505258]')}>
              No results found
            </p>
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className={cn(
                  'mt-2 text-xs font-body font-medium px-3 py-1.5 rounded-md',
                  'text-[#0C66E4] hover:bg-[#E9F2FF]',
                )}
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          // Issue rows
          items.map((item) => {
            const isSelected = item.issue_key === selectedIssueKey;
            const priority = PRIORITY_ICONS[item.priority];

            return (
              <button
                key={item.issue_key}
                onClick={() => onSelectIssue(item.issue_key)}
                className={cn(
                  'w-full text-left px-4 py-2.5 transition-colors border-l-2',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0C66E4] focus-visible:ring-inset',
                  isSelected
                    ? isDark
                      ? 'bg-[#1A1A1A] border-l-[#0C66E4]'
                      : 'bg-[#E9F2FF] border-l-[#0C66E4]'
                    : isDark
                      ? 'bg-transparent border-l-transparent hover:bg-[#1F1F1F]'
                      : 'bg-transparent border-l-transparent hover:bg-[#F4F5F7]',
                )}
              >
                {/* Row 1: type icon + key + status */}
                <div className="flex items-center gap-2 mb-1">
                  <JiraIssueTypeIcon issueType={item.issue_type} size={16} />
                  <span className={cn(
                    'font-mono text-xs font-medium',
                    isDark ? 'text-[#A1A1A1]' : 'text-[#505258]',
                  )}>
                    {item.issue_key}
                  </span>
                  <div className="ml-auto">
                    <StatusLozenge status={item.status} />
                  </div>
                </div>

                {/* Row 2: summary (1-2 lines) */}
                <p className={cn(
                  'font-body text-sm leading-snug line-clamp-2',
                  isSelected
                    ? isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]'
                    : isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]',
                )}>
                  {item.summary}
                </p>

                {/* Row 3: metadata line */}
                <div className={cn(
                  'flex items-center gap-2 mt-1 text-xs font-body',
                  isDark ? 'text-[#878787]' : 'text-[#6B6E76]',
                )}>
                  {priority && (
                    <span style={{ color: priority.color }} className="font-medium">
                      {priority.label}
                    </span>
                  )}
                  {item.assignee_display_name && (
                    <>
                      <span>·</span>
                      <span className="truncate max-w-[100px]">{item.assignee_display_name}</span>
                    </>
                  )}
                </div>
              </button>
            );
          })
        )}

        {/* Loading more indicator */}
        {loading && items.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className={cn('w-4 h-4 animate-spin', isDark ? 'text-[#878787]' : 'text-[#505258]')} />
          </div>
        )}
      </div>

      {/* ─── Footer: count ─── */}
      <div className={cn(
        'px-4 py-2 border-t shrink-0 text-center',
        isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]',
      )}>
        <span className={cn('font-body text-xs', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
          {items.length} issue{items.length !== 1 ? 's' : ''}
          {hasMore ? '+' : ''}
        </span>
      </div>
    </div>
  );
}
