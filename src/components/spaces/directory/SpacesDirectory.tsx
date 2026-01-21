// ════════════════════════════════════════════════════════════════════════════
// SPACES DIRECTORY - Main page component
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Plus, FolderKanban } from 'lucide-react';
import { useSpaces, useSpaceCategories } from '@/hooks/spaces';
import { useSpaceStore } from '@/stores/spaceStore';
import { SpacesToolbar } from './SpacesToolbar';
import { SpacesGrid } from './SpacesGrid';
import { SpacesList } from './SpacesList';
import { SpacesStats } from './SpacesStats';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import type { SpaceListParams } from '@/types/spaces';

const PAGE_SIZE = 24;

export function SpacesDirectory() {
  const [page, setPage] = useState(1);
  const { viewMode, filters, sort, openCreateModal } = useSpaceStore();
  const { data: categories = [] } = useSpaceCategories();

  const params: SpaceListParams = { filters, sort, page, limit: PAGE_SIZE };

  const { data, isLoading, isError, refetch } = useSpaces(params);

  const spaces = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const hasActiveFilters =
    filters.search || filters.type || filters.category_id || filters.starred;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Spaces</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your projects and workspaces
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Space
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <SpacesStats />

        <SpacesToolbar categories={categories} />

        {isLoading ? (
          <LoadingSkeleton viewMode={viewMode} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : spaces.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="w-12 h-12" />}
            title={hasActiveFilters ? 'No spaces found' : 'No spaces yet'}
            description={
              hasActiveFilters
                ? 'Try adjusting your filters or search query'
                : 'Create your first space to get started organizing your work'
            }
            action={
              !hasActiveFilters ? (
                <button
                  onClick={openCreateModal}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Space
                </button>
              ) : undefined
            }
          />
        ) : viewMode === 'grid' ? (
          <SpacesGrid spaces={spaces} />
        ) : (
          <SpacesList spaces={spaces} />
        )}

        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalCount}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADING SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function LoadingSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-background border border-border rounded-lg p-4 h-40 animate-pulse"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-muted rounded-md" />
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
            <div className="h-3 bg-muted rounded w-full mb-2" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 gap-4 px-4 py-3 bg-muted/50 border-b border-border">
        {['', 'Name', 'Key', 'Lead', 'Category', 'Type', 'Actions'].map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded" />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-7 gap-4 px-4 py-3 border-b border-border last:border-b-0"
        >
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse col-span-2" />
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR STATE
// ─────────────────────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl">⚠</span>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Failed to load spaces
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Something went wrong while loading your spaces.
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
