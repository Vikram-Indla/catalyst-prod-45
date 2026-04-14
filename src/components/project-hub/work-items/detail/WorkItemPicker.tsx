/**
 * WorkItemPicker — Async searchable work item selector with:
 *   - Debounced search across ph_issues + ph_work_items (FR-17)
 *   - Paste URL/key detection and auto-resolution (FR-11)
 *   - "Load more" pagination (FR-12)
 *   - Excludes self + already-linked items (FR-13)
 *   - Keyboard accessible (FR-42)
 *   - Error state with retry (FR-16)
 *   - Race condition protection via React Query keying (FR-18)
 *   - Deterministic empty state (FR-15)
 *   - aria-live announcements (FR-43)
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { searchWorkItemsForLinking, type SearchResultItem } from '@/services/linkedWorkItemsService';
import { parseWorkItemKey } from '@/lib/parseWorkItemKey';

interface WorkItemPickerProps {
  /** Current item ID — excluded from results */
  excludeSelfId: string;
  /** IDs of already-linked items — excluded from results */
  excludeLinkedIds: string[];
  /** Currently selected item */
  selected: SearchResultItem | null;
  /** Selection callback */
  onSelect: (item: SearchResultItem | null) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
}

const PAGE_SIZE = 15;

// Status lozenge styles matching Catalyst's 3-colour guardrail
const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  todo: { bg: '#DFE1E6', text: '#253858' },
  in_progress: { bg: '#DEEBFF', text: '#0747A6' },
  done: { bg: '#E3FCEF', text: '#006644' },
};

function getStatusStyle(category: string) {
  if (category.includes('done') || category.includes('closed') || category.includes('resolved'))
    return STATUS_STYLES.done;
  if (category.includes('progress') || category.includes('review') || category.includes('active'))
    return STATUS_STYLES.in_progress;
  return STATUS_STYLES.todo;
}

export function WorkItemPicker({
  excludeSelfId,
  excludeLinkedIds,
  selected,
  onSelect,
  placeholder = 'Type, search or paste URL',
  autoFocus = true,
}: WorkItemPickerProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [allResults, setAllResults] = useState<SearchResultItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [focusIdx, setFocusIdx] = useState(-1);

  const allExcludeIds = [excludeSelfId, ...excludeLinkedIds];

  // Auto-focus
  useEffect(() => {
    if (autoFocus) setTimeout(() => inputRef.current?.focus(), 50);
  }, [autoFocus]);

  // Debounce search input (FR-17)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Check for pasted key/URL (FR-11)
      const parsedKey = parseWorkItemKey(search);
      setDebouncedSearch(parsedKey || search);
      setPage(0);
      setAllResults([]);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch search results — React Query keying handles race conditions (FR-18)
  const { data: searchData, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['linked-items-picker', debouncedSearch, allExcludeIds.join(','), page],
    queryFn: () => searchWorkItemsForLinking(debouncedSearch, allExcludeIds, PAGE_SIZE, page * PAGE_SIZE),
    enabled: debouncedSearch.trim().length >= 2 && !selected,
    staleTime: 30_000,
    retry: 1,
  });

  // Accumulate paginated results
  useEffect(() => {
    if (!searchData) return;
    if (page === 0) {
      setAllResults(searchData.items);
    } else {
      setAllResults(prev => {
        const existingIds = new Set(prev.map(r => r.id));
        const newItems = searchData.items.filter(r => !existingIds.has(r.id));
        return [...prev, ...newItems];
      });
    }
  }, [searchData, page]);

  const hasMore = searchData ? allResults.length < searchData.total : false;

  const handleLoadMore = useCallback(() => {
    setPage(p => p + 1);
  }, []);

  const handleSelect = (item: SearchResultItem) => {
    onSelect(item);
    setSearch(`${item.item_key} ${item.summary}`);
  };

  const handleClear = () => {
    onSelect(null);
    setSearch('');
    setAllResults([]);
    setPage(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selected) onSelect(null);
    setSearch(e.target.value);
    setFocusIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx(prev => Math.min(prev + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && focusIdx >= 0 && allResults[focusIdx]) {
      e.preventDefault();
      handleSelect(allResults[focusIdx]);
    } else if (e.key === 'Escape' && selected) {
      handleClear();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusIdx(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setFocusIdx(allResults.length - 1);
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusIdx < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-result]');
    items[focusIdx]?.scrollIntoView({ block: 'nearest' });
  }, [focusIdx]);

  const showResults = !selected && debouncedSearch.length >= 2;

  // Build aria-live status message (FR-43)
  const statusMessage = isLoading
    ? 'Searching...'
    : isError
    ? 'Search failed'
    : showResults && allResults.length === 0
    ? 'No matching work items'
    : showResults
    ? `${allResults.length} results found`
    : '';

  return (
    <div className="relative flex-1">
      {/* aria-live status region (FR-43) */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </div>

      {/* Search input */}
      <div
        className="flex items-center gap-1.5 rounded"
        style={{
          height: 36,
          padding: '0 10px',
          border: isError ? '2px solid #DE350B' : '2px solid #4C9AFF',
          borderRadius: 3,
          background: 'var(--cp-float, #fff)',
        }}
      >
        <Search size={14} color="#6B778C" />
        <input
          ref={inputRef}
          value={search}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search work items"
          aria-autocomplete="list"
          aria-controls={showResults ? 'work-item-picker-results' : undefined}
          aria-activedescendant={focusIdx >= 0 ? `picker-option-${focusIdx}` : undefined}
          className="flex-1 text-[14px] outline-none bg-transparent"
          style={{ color: '#172B4D', fontFamily: 'Inter, sans-serif' }}
        />
        {selected && (
          <button
            onClick={handleClear}
            className="text-[12px] font-medium px-1.5 rounded hover:bg-[#F4F5F7] transition-colors"
            style={{ color: '#6B778C' }}
            title="Clear selection"
          >
            ×
          </button>
        )}
        {(isLoading || isFetching) && <Loader2 size={14} className="animate-spin" color="#6B778C" />}
      </div>

      {/* Results dropdown */}
      {showResults && (
        <div
          id="work-item-picker-results"
          ref={listRef}
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 overflow-hidden"
          style={{
            top: 'calc(100% + 2px)',
            background: 'var(--cp-float, #fff)',
            border: '1px solid #DFE1E6',
            borderRadius: 3,
            boxShadow: '0 4px 8px rgba(9,30,66,0.25)',
            zIndex: 60,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {/* FR-16: Error state with retry */}
          {isError && (
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} color="#DE350B" />
              <span style={{ flex: 1, fontSize: 13, color: '#DE350B' }}>
                Search failed: {(error as Error)?.message || 'Unknown error'}
              </span>
              <button
                onClick={() => refetch()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 500, color: '#0052CC',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '2px 6px', borderRadius: 3,
                }}
                className="hover:bg-[#F4F5F7]"
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          )}

          {/* FR-15: deterministic empty state */}
          {!isError && allResults.length === 0 && !isLoading && !isFetching && (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: '#6B778C' }}>
              No matching work items
            </div>
          )}

          {!isError && allResults.map((item, i) => {
            const statusStyle = getStatusStyle(item.status_category);
            const isFocused = focusIdx === i;
            return (
              <div
                key={item.id}
                id={`picker-option-${i}`}
                data-result
                role="option"
                aria-selected={isFocused}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setFocusIdx(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 40,
                  padding: '0 12px',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#172B4D',
                  borderBottom: '1px solid #F4F5F7',
                  background: isFocused ? '#F4F5F7' : 'transparent',
                  transition: 'background 0.1s',
                }}
              >
                {/* Type indicator */}
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: item.type_color || '#94A3B8' }}
                />
                {/* Key */}
                <span
                  className="shrink-0"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#0052CC',
                  }}
                >
                  {item.item_key}
                </span>
                {/* Summary */}
                <span
                  className="flex-1 truncate"
                  style={{ color: '#172B4D' }}
                >
                  {item.summary}
                </span>
                {/* Status */}
                <span
                  className="shrink-0"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 18,
                    padding: '0 6px',
                    borderRadius: 3,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    whiteSpace: 'nowrap',
                    background: statusStyle.bg,
                    color: statusStyle.text,
                  }}
                >
                  {item.status_name}
                </span>
              </div>
            );
          })}

          {/* Load more (FR-12) */}
          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={isFetching}
              className="w-full text-center py-2 text-[12px] font-medium hover:bg-[#F4F5F7] transition-colors"
              style={{ color: '#0052CC', borderTop: '1px solid #DFE1E6' }}
            >
              {isFetching ? 'Loading...' : `Load more (${allResults.length} of ${searchData?.total ?? '?'})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
