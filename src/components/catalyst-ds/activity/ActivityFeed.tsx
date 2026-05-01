import * as React from 'react';
import { useMemo, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { History, Loader2 } from 'lucide-react';
import type { CdsActivityItem, CdsSortOrder } from '../types';
import type { JiraUserMap } from '../utils/jiraContent';
import { ActivityItem } from './ActivityItem';

export interface ActivityFeedProps {
  items: CdsActivityItem[];
  sortOrder?: CdsSortOrder;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  jiraUserMap?: JiraUserMap;
  className?: string;
}

function ActivityFeed({
  items,
  sortOrder = 'newest',
  isLoading = false,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  emptyMessage = 'No history yet',
  emptyDescription = 'Changes will appear here',
  jiraUserMap,
  className,
}: ActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortedItems = useMemo(() => {
    const sorted = [...items];
    sorted.sort((a, b) => {
      const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return sortOrder === 'newest' ? -diff : diff;
    });
    return sorted;
  }, [items, sortOrder]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isLoadingMore || !hasMore || !onLoadMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="h-5 w-5 animate-spin text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#878787)] mr-2" />
        <span className="text-[13px] text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#878787)]">Loading history...</span>
      </div>
    );
  }

  if (sortedItems.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <History className="h-10 w-10 mx-auto mb-3 text-[#C1C7D0] dark:text-[var(--ds-border-bold,#454545)]" />
        <p className="text-[14px] font-medium text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#A1A1A1)]">{emptyMessage}</p>
        <p className="text-[12px] text-[#97A0AF] dark:text-[var(--ds-text-subtlest,#878787)] mt-1">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className={cn('overflow-y-auto', className)}>
      <div className="divide-y divide-[#EBECF0] dark:divide-[var(--ds-border,#2E2E2E)]">
        {sortedItems.map((item) => (
          <ActivityItem key={item.id} item={item} jiraUserMap={jiraUserMap} />
        ))}
      </div>

      {isLoadingMore && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#878787)] mr-2" />
          <span className="text-[12px] text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#878787)]">Loading more...</span>
        </div>
      )}
    </div>
  );
}

export { ActivityFeed };
