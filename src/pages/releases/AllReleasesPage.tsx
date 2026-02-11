/**
 * ALL RELEASES PAGE — Enterprise Redesign
 * Compressed layout with StatStrip, Toolbar, AI Drawer, env progression
 */

import { useState, useMemo } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAllReleases } from '@/hooks/releases/useAllReleases';
import {
  ReleasesTable,
  ReleasesTimeline,
  ReleasesBulkActionBar,
  ReleasesEmptyState,
  ExportReleasesDropdown,
  BulkStatusChangeDialog,
  BulkReassignDialog,
  ArchiveConfirmationDialog,
} from '@/components/releases/all-releases';
import { useReleasesFilter } from '@/hooks/releases/useReleasesFilter';
import { useReleasesSelection } from '@/hooks/releases/useReleasesSelection';
import { ReleasesSort } from '@/types/releases';
import {
  StatStrip,
  AIInsightsDrawer,
  CardGridView,
  Toolbar,
  ViewMode,
  ReleaseSummary,
  AIReleaseInsight,
  Release as EnhancedRelease,
  ReleaseStatus as EnhancedStatus,
  getHealthLevel,
} from '@/features/all-releases';
import type { SortOption } from '@/features/all-releases';
import { ReleaseDialog } from '@/components/forms/ReleaseDialog';
import { HealthLevel } from '@/features/all-releases/utils/healthScore';

// Transform legacy release to enhanced release
function transformRelease(r: any): EnhancedRelease {
  const passRate = r.test_cases_total > 0 
    ? (r.test_cases_passed / r.test_cases_total) * 100 
    : 100;
  
  const healthScore = Math.round(
    (passRate * 0.4) + 
    ((r.coverage_percent || 0) * 0.3) + 
    (Math.max(0, 100 - (r.defects_open || 0) * 10) * 0.3)
  );

  return {
    id: r.id,
    version: r.version || 'v1.0',
    name: r.name,
    description: r.description,
    status: r.status === 'active' ? 'in_progress' : r.status === 'uat' ? 'testing' : r.status,
    plannedDate: r.target_date || new Date().toISOString(),
    actualDate: r.release_date,
    healthScore,
    healthLevel: getHealthLevel(healthScore),
    metrics: {
      totalTests: r.test_cases_total || 0,
      passedTests: r.test_cases_passed || 0,
      failedTests: (r.test_cases_total || 0) - (r.test_cases_passed || 0),
      blockedTests: 0,
      notRunTests: 0,
      passRate,
      testCoverage: r.coverage_percent || 0,
      totalDefects: r.defects_open || 0,
      blockerDefects: Math.floor((r.defects_open || 0) / 3),
      criticalDefects: Math.floor((r.defects_open || 0) / 3),
      openDefects: r.defects_open || 0,
      totalGates: 6,
      passingGates: Math.min(6, Math.max(0, Math.floor(healthScore / 20))),
      failingGates: Math.max(0, 6 - Math.floor(healthScore / 20)),
      scopeItems: 10,
      completedItems: Math.floor(r.progress || 0),
      scopeCreep: 0,
    },
    schedule: {
      status: healthScore >= 70 ? 'on_track' : healthScore >= 50 ? 'at_risk' : 'delayed',
      daysRemaining: Math.max(0, Math.floor((new Date(r.target_date || Date.now()).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
    },
    releaseManager: r.owner ? { id: r.owner.id, full_name: r.owner.full_name, avatar_url: r.owner.avatar_url } : undefined,
  };
}

export default function AllReleasesPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sort, setSort] = useState<ReleasesSort>({ column: 'name', direction: 'asc' });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [sortBy, setSortBy] = useState<SortOption>('health-asc');
  const [statusFilter, setStatusFilter] = useState<EnhancedStatus[]>([]);
  const [healthFilter, setHealthFilter] = useState<HealthLevel[]>([]);
  const [quarterFilter, setQuarterFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'status' | 'reassign' | 'archive' | null>(null);
  const [statFilter, setStatFilter] = useState<string | null>(null);
  
  const { filter, clearFilters } = useReleasesFilter();
  
  const { data, isLoading, refetch } = useAllReleases({
    filter,
    sort,
    page,
    pageSize,
  });
  
  const releases = data?.releases ?? [];
  const total = data?.total ?? 0;
  
  const enhancedReleases = useMemo(() => releases.map(transformRelease), [releases]);
  
  const { selected, toggle, toggleAll, clear, selectAllState } = useReleasesSelection(
    releases.map(r => r.id)
  );
  
  const selectedReleases = useMemo(() => 
    releases.filter(r => selected.has(r.id)),
    [releases, selected]
  );
  
  // Calculate summary
  const summary: ReleaseSummary = useMemo(() => ({
    total,
    byStatus: {
      planning: enhancedReleases.filter(r => r.status === 'planning').length,
      in_progress: enhancedReleases.filter(r => r.status === 'in_progress').length,
      testing: enhancedReleases.filter(r => r.status === 'testing').length,
      staging: enhancedReleases.filter(r => r.status === 'staging').length,
      released: enhancedReleases.filter(r => r.status === 'released').length,
      cancelled: enhancedReleases.filter(r => r.status === 'cancelled').length,
    },
    byHealth: {
      healthy: enhancedReleases.filter(r => r.healthLevel === 'healthy').length,
      attention: enhancedReleases.filter(r => r.healthLevel === 'attention').length,
      at_risk: enhancedReleases.filter(r => r.healthLevel === 'at_risk').length,
      critical: enhancedReleases.filter(r => r.healthLevel === 'critical').length,
    },
    atRiskReleases: enhancedReleases.filter(r => r.healthLevel === 'at_risk' || r.healthLevel === 'critical'),
  }), [enhancedReleases, total]);
  
  // Generate AI insights
  const insights: AIReleaseInsight[] = useMemo(() => {
    const result: AIReleaseInsight[] = [];
    enhancedReleases.forEach(r => {
      if (r.healthScore < 70 && r.schedule.daysRemaining < 14) {
        result.push({
          releaseId: r.id,
          releaseName: r.version,
          type: 'critical',
          message: `${r.version} critical — ${r.healthScore}% health, ${r.schedule.daysRemaining} days remaining`,
          action: 'Review blockers',
        });
      }
      if (r.metrics.blockerDefects > 0) {
        result.push({
          releaseId: r.id,
          releaseName: r.version,
          type: 'critical',
          message: `${r.version} has ${r.metrics.blockerDefects} blocker defects`,
          action: 'Resolve blockers',
        });
      }
    });
    return result.slice(0, 5);
  }, [enhancedReleases]);

  // Client-side sort
  const sortedReleases = useMemo(() => {
    return [...enhancedReleases].sort((a, b) => {
      switch (sortBy) {
        case 'health-asc': return a.healthScore - b.healthScore;
        case 'health-desc': return b.healthScore - a.healthScore;
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'date-asc': return new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime();
        case 'date-desc': return new Date(b.plannedDate).getTime() - new Date(a.plannedDate).getTime();
        default: return 0;
      }
    });
  }, [enhancedReleases, sortBy]);

  // Client-side filter count
  const activeFilterCount = statusFilter.length + healthFilter.length + (quarterFilter !== 'all' ? 1 : 0) + (searchFilter ? 1 : 0);

  const handleStatusToggle = (status: EnhancedStatus) => {
    setStatusFilter(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  };

  const handleHealthToggle = (health: HealthLevel) => {
    setHealthFilter(prev => prev.includes(health) ? prev.filter(h => h !== health) : [...prev, health]);
  };

  const handleClearFilters = () => {
    setStatusFilter([]);
    setHealthFilter([]);
    setQuarterFilter('all');
    setSearchFilter('');
    setStatFilter(null);
  };
  
  const handleCreateSuccess = () => {
    refetch();
    setIsCreateDialogOpen(false);
  };

  const handleReleaseClick = (release: EnhancedRelease) => {
    navigate(`/releasehub/${release.id}`);
  };
  
  const handleBulkStatusChange = async (newStatus: string) => {
    const ids = selectedReleases.map(r => r.id);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase
        .from('releases')
        .update({ status: newStatus as any, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      toast.success(`Updated ${ids.length} releases to ${newStatus}`);
      clear();
      refetch();
    } catch (error) {
      toast.error('Failed to update releases');
    }
  };
  
  const handleBulkReassign = async (ownerId: string, ownerName: string) => {
    const ids = selectedReleases.map(r => r.id);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase
        .from('releases')
        .update({ owner_id: ownerId, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      toast.success(`Reassigned ${ids.length} releases to ${ownerName}`);
      clear();
      refetch();
    } catch (error) {
      toast.error('Failed to reassign releases');
    }
  };
  
  const handleBulkArchive = async () => {
    const ids = selectedReleases.map(r => r.id);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase
        .from('releases')
        .update({ status: 'shipped' as any, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      toast.success(`Archived ${ids.length} releases`);
      clear();
      refetch();
    } catch (error) {
      toast.error('Failed to archive releases');
    }
  };
  
  // Pagination
  const totalPages = Math.ceil(sortedReleases.length / pageSize);
  const paginatedReleases = sortedReleases.slice(page * pageSize, (page + 1) * pageSize);
  const showingFrom = sortedReleases.length > 0 ? page * pageSize + 1 : 0;
  const showingTo = Math.min((page + 1) * pageSize, sortedReleases.length);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header — 36px single row */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-6 flex items-center justify-between" style={{ height: '52px' }}>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-900">All Releases</h1>
            <span className="px-2 py-0.5 text-xs font-medium text-slate-500 bg-slate-100 rounded-full">
              {total} releases
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ExportReleasesDropdown
              releases={releases}
              selectedReleases={selectedReleases}
              hasSelection={selected.size > 0}
            />
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Release
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main */}
      <main className="max-w-[1440px] mx-auto px-6 py-5">
        {/* StatStrip */}
        <StatStrip
          summary={summary}
          activeFilter={statFilter}
          onFilterClick={(f) => setStatFilter(prev => prev === f ? null : f)}
          aiInsightCount={insights.length}
          onAIInsightClick={() => setIsAIDrawerOpen(true)}
        />
        
        {/* Toolbar */}
        <Toolbar
          search={searchFilter}
          onSearchChange={setSearchFilter}
          statusFilter={statusFilter}
          onStatusToggle={handleStatusToggle}
          healthFilter={healthFilter}
          onHealthToggle={handleHealthToggle}
          quarter={quarterFilter}
          onQuarterChange={setQuarterFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onClearFilters={handleClearFilters}
          activeFilterCount={activeFilterCount}
        />

        {/* Bulk Action Bar */}
        {selected.size > 0 && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg animate-in slide-in-from-top-2 duration-200">
            <span className="text-xs font-medium">{selected.size} selected</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-white hover:bg-white/15 border border-white/20"
              onClick={() => setBulkAction('status')}
            >
              Change Status
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-white hover:bg-white/15 border border-white/20"
              onClick={() => setBulkAction('reassign')}
            >
              Reassign
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-white hover:bg-white/15 border border-white/20"
              onClick={() => setBulkAction('archive')}
            >
              Archive
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-white/80 hover:text-white hover:bg-white/15"
              onClick={clear}
            >
              Clear
            </Button>
          </div>
        )}
        
        {/* Content */}
        {isLoading ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
          </div>
        ) : sortedReleases.length === 0 ? (
          <ReleasesEmptyState onClearFilters={handleClearFilters} />
        ) : viewMode === 'cards' ? (
          <CardGridView
            releases={paginatedReleases}
            selectedIds={selected}
            onSelect={(id) => {
              const idx = releases.findIndex(r => r.id === id);
              toggle(id, idx, false);
            }}
            onReleaseClick={handleReleaseClick}
          />
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
        
        {/* Pagination */}
        {sortedReleases.length > 0 && (
          <div className="flex items-center justify-between mt-5 text-xs text-slate-500">
            <span>
              Showing {showingFrom}-{showingTo} of {sortedReleases.length} releases
            </span>
            <div className="flex items-center gap-1.5">
              <span className="mr-1">Per page:</span>
              {[6, 12, 24].map(size => (
                <button
                  key={size}
                  onClick={() => { setPageSize(size); setPage(0); }}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    pageSize === size
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
      
      {/* AI Insights Drawer */}
      <AIInsightsDrawer
        isOpen={isAIDrawerOpen}
        onClose={() => setIsAIDrawerOpen(false)}
        insights={insights}
      />
      
      {/* Create Release Dialog */}
      <ReleaseDialog
        open={isCreateDialogOpen}
        onClose={handleCreateSuccess}
      />
      
      {/* Bulk Action Dialogs */}
      <BulkStatusChangeDialog
        open={bulkAction === 'status'}
        onOpenChange={(open) => !open && setBulkAction(null)}
        selectedCount={selected.size}
        onConfirm={handleBulkStatusChange}
      />
      
      <BulkReassignDialog
        open={bulkAction === 'reassign'}
        onOpenChange={(open) => !open && setBulkAction(null)}
        selectedCount={selected.size}
        onConfirm={handleBulkReassign}
      />
      
      <ArchiveConfirmationDialog
        open={bulkAction === 'archive'}
        onOpenChange={(open) => !open && setBulkAction(null)}
        releases={selectedReleases}
        onConfirm={handleBulkArchive}
      />
    </div>
  );
}
