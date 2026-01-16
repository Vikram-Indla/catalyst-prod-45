/**
 * ALL RELEASES PAGE
 * Enhanced with Summary Cards, AI Insights, and Card Grid View
 */

import { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronRight, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAllReleases } from '@/hooks/releases/useAllReleases';
import {
  ReleasesTable,
  ReleasesTimeline,
  ReleasesBulkActionBar,
  ReleasesEmptyState,
  ReleasesPagination,
} from '@/components/releases/all-releases';
import { useReleasesFilter } from '@/hooks/releases/useReleasesFilter';
import { useReleasesSelection } from '@/hooks/releases/useReleasesSelection';
import { ReleasesSort } from '@/types/releases';
import {
  SummaryCards,
  AIInsightsBar,
  CardGridView,
  ViewToggle,
  FilterBar,
  ViewMode,
  ReleaseSummary,
  AIReleaseInsight,
  Release as EnhancedRelease,
  getHealthLevel,
} from '@/features/all-releases';

// Transform legacy release to enhanced release
function transformRelease(r: any): EnhancedRelease {
  const passRate = r.test_cases_total > 0 
    ? (r.test_cases_passed / r.test_cases_total) * 100 
    : 100;
  
  // Calculate health score based on available data
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
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sort, setSort] = useState<ReleasesSort>({ column: 'name', direction: 'asc' });
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [healthFilter, setHealthFilter] = useState<string[]>([]);
  const [quarterFilter, setQuarterFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const pageSize = 12;
  
  const { filter, toggleStatus, toggleHealth, setSearch, clearFilters, activeFilterCount } = useReleasesFilter();
  
  const { data, isLoading } = useAllReleases({
    filter,
    sort,
    page,
    pageSize,
  });
  
  const releases = data?.releases ?? [];
  const total = data?.total ?? 0;
  
  // Transform releases
  const enhancedReleases = useMemo(() => releases.map(transformRelease), [releases]);
  
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
  
  const { selected, toggle, toggleAll, clear, selectAllState } = useReleasesSelection(
    releases.map(r => r.id)
  );
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">All Releases</h1>
              <p className="text-sm text-slate-500">Manage and monitor all releases across your portfolio</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                New Release
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main */}
      <main className="max-w-[1440px] mx-auto px-6 py-6">
        {/* Summary Cards */}
        <SummaryCards summary={summary} />
        
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <FilterBar
            filter={{
              status: statusFilter as any,
              health: healthFilter as any,
              quarter: quarterFilter,
              search: searchFilter,
            }}
            onStatusChange={setStatusFilter as any}
            onHealthChange={setHealthFilter as any}
            onQuarterChange={setQuarterFilter}
            onSearchChange={setSearchFilter}
            onClearFilters={() => {
              setStatusFilter([]);
              setHealthFilter([]);
              setQuarterFilter('all');
              setSearchFilter('');
            }}
            activeFilterCount={statusFilter.length + healthFilter.length + (quarterFilter !== 'all' ? 1 : 0) + (searchFilter ? 1 : 0)}
          />
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
        
        {/* AI Insights */}
        {insights.length > 0 && <AIInsightsBar insights={insights} />}
        
        {/* Content */}
        {isLoading ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          </div>
        ) : enhancedReleases.length === 0 ? (
          <ReleasesEmptyState onClearFilters={clearFilters} />
        ) : viewMode === 'cards' ? (
          <CardGridView releases={enhancedReleases} />
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
        
        {enhancedReleases.length > 0 && (
          <ReleasesPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
          />
        )}
      </main>
      
      <ReleasesBulkActionBar
        selectedCount={selected.size}
        onClear={clear}
        onChangeStatus={() => {}}
        onReassign={() => {}}
        onArchive={() => {}}
      />
    </div>
  );
}
