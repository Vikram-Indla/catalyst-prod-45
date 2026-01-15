// =====================================================
// ALL RELEASES PAGE
// Main entry point for the Release Module
// =====================================================

import { useState, useEffect } from 'react';
import { Plus, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAllReleases } from '@/hooks/releases/useAllReleases';
import { useReleasesFilter } from '@/hooks/releases/useReleasesFilter';
import { useReleasesSelection } from '@/hooks/releases/useReleasesSelection';
import {
  ReleasesToolbar,
  ReleasesTable,
  ReleasesTimeline,
  ReleasesBulkActionBar,
  ReleasesEmptyState,
  ReleasesPagination,
} from '@/components/releases/all-releases';
import { ViewMode, ReleasesSort } from '@/types/releases';

export default function AllReleasesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sort, setSort] = useState<ReleasesSort>({ column: 'name', direction: 'asc' });
  const [page, setPage] = useState(0);
  const pageSize = 10;
  
  const { filter, toggleStatus, toggleHealth, setSearch, clearFilters, activeFilterCount } = useReleasesFilter();
  
  const { data, isLoading } = useAllReleases({
    filter,
    sort,
    page,
    pageSize,
  });
  
  const releases = data?.releases ?? [];
  const total = data?.total ?? 0;
  
  const { selected, toggle, toggleAll, clear, selectAllState } = useReleasesSelection(
    releases.map(r => r.id)
  );
  
  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === '/') {
        e.preventDefault();
        document.getElementById('release-search')?.focus();
      }
      if (e.key === 'Escape') clear();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clear]);
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2 text-sm text-slate-400">
              <span>Catalyst</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-slate-800 font-semibold">Releases</span>
            </nav>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
              {total} total
            </span>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Release
          </Button>
        </div>
      </header>
      
      {/* Main */}
      <main className="max-w-[1440px] mx-auto px-6 py-6">
        <ReleasesToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filter={filter}
          onToggleStatus={toggleStatus}
          onToggleHealth={toggleHealth}
          onSearch={setSearch}
          onClearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
        />
        
        {isLoading ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          </div>
        ) : releases.length === 0 ? (
          <ReleasesEmptyState onClearFilters={clearFilters} />
        ) : viewMode === 'table' ? (
          <ReleasesTable
            releases={releases}
            sort={sort}
            onSort={setSort}
            selected={selected}
            onToggleSelect={toggle}
            onToggleSelectAll={toggleAll}
            selectAllState={selectAllState}
          />
        ) : (
          <ReleasesTimeline releases={releases} />
        )}
        
        {releases.length > 0 && (
          <ReleasesPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
          />
        )}
      </main>
      
      {/* Bulk Action Bar */}
      <ReleasesBulkActionBar
        selectedCount={selected.size}
        onClear={clear}
        onChangeStatus={() => {}}
        onReassign={() => {}}
        onArchive={() => {}}
      />
      
      {/* Keyboard Hints */}
      {selected.size === 0 && (
        <div className="fixed bottom-6 right-6 flex items-center gap-4 px-5 py-3 rounded-xl text-xs bg-slate-800 text-slate-300">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 rounded bg-slate-700">/</kbd> Search
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 rounded bg-slate-700">⇧</kbd>+Click Range
          </div>
        </div>
      )}
    </div>
  );
}
