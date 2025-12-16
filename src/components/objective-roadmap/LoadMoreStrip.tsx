import React from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';

interface LoadMoreStripProps {
  visibleCount: number;
  totalCount: number;
  needAttentionCount: number;
  onLoadMore: () => void;
  hasMore: boolean;
}

export const LoadMoreStrip: React.FC<LoadMoreStripProps> = ({
  visibleCount,
  totalCount,
  needAttentionCount,
  onLoadMore,
  hasMore,
}) => {
  return (
    <div className="flex items-center justify-center gap-6 px-6 py-3 border-t border-border bg-muted/50">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Showing <strong className="text-foreground">{visibleCount}</strong> of{' '}
          <strong className="text-foreground">{totalCount}</strong> objectives
        </span>
        {needAttentionCount > 0 && (
          <span className="flex items-center gap-1.5 text-sm text-amber-600">
            <AlertTriangle size={14} />
            {needAttentionCount} objective{needAttentionCount !== 1 ? 's' : ''} below need attention
          </span>
        )}
      </div>
      {hasMore && (
        <button 
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium border border-border rounded-lg bg-background hover:bg-muted transition-colors"
          onClick={onLoadMore}
        >
          <ChevronDown size={16} />
          Load More
        </button>
      )}
    </div>
  );
};
