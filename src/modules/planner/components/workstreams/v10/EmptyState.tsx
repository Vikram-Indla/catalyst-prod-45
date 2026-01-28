// ============================================================
// WORKSTREAMS V10 EMPTY STATE
// Illustrated empty state with clear CTA
// ============================================================

import { Layers, Search, Filter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  type: 'no-workstreams' | 'no-results' | 'error';
  searchQuery?: string;
  hasFilters?: boolean;
  onClearFilters?: () => void;
  onCreateWorkstream?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function EmptyState({
  type,
  searchQuery,
  hasFilters,
  onClearFilters,
  onCreateWorkstream,
  onRetry,
  className,
}: EmptyStateProps) {
  if (type === 'error') {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
          <Layers className="w-8 h-8 text-red-500 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Couldn't load workstreams
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
          There was a problem fetching workstreams data. Please try again.
        </p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </div>
    );
  }

  if (type === 'no-results') {
    return (
      <div 
        className={cn('flex flex-col items-center justify-center py-16 text-center', className)}
        role="status"
        aria-live="polite"
      >
        {/* Illustration */}
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Search className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <div className="absolute -right-2 -bottom-2 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Filter className="w-4 h-4 text-amber-500" />
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          No workstreams found
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
          {searchQuery 
            ? `No workstreams match "${searchQuery}".`
            : 'Try adjusting your search or filters to find what you\'re looking for.'}
        </p>
        
        {(hasFilters || searchQuery) && onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  // No workstreams yet
  return (
    <div 
      className={cn('flex flex-col items-center justify-center py-16 text-center', className)}
      role="status"
    >
      {/* Illustration */}
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
          <Layers className="w-12 h-12 text-blue-500 dark:text-blue-400" />
        </div>
        <div className="absolute -right-3 -top-3 w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shadow-sm">
          <span className="text-lg">✓</span>
        </div>
        <div className="absolute -left-2 -bottom-2 w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shadow-sm">
          <span className="text-sm">📋</span>
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
        No workstreams yet
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
        Workstreams help you organize tasks into focused tracks.
        <br />
        Create your first workstream to get started.
      </p>
      
      {onCreateWorkstream && (
        <Button onClick={onCreateWorkstream} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Workstream
        </Button>
      )}
    </div>
  );
}
