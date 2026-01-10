/**
 * Test Cycles Page - Phase 5 Complete Implementation
 * 3-column layout with folder tree, main content, and detail drawer
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  useTestCycles, 
  useCreateCycle, 
  useUpdateCycle,
  useDeleteCycle,
  useStartCycle, 
  useCompleteCycle,
  useCloneCycle,
  useEnvironments,
} from '@/hooks/test-management';
import type { TMCycle } from '@/types/test-management';
import { 
  CyclesFolderTree,
  CycleStatsCards,
  CyclesToolbar,
  CycleTableView,
  CycleCardView,
  CycleCalendarView,
  CyclesEmptyState,
  CreateCycleModal,
  EditCycleModal,
  DeleteCycleModal,
  BulkActionsModal,
  CycleDetailDrawer,
  type CycleFolder,
  type CycleViewMode,
  type CycleStatusFilter,
} from '../components/cycles';
import { useProjectStore } from '../stores/projectStore';
import type { TestCycle, CycleStatus } from '../api/types';
import { cn } from '@/lib/utils';
import { catalystToast } from '@/lib/catalystToast';

// Map TMCycle to component-compatible TestCycle
function mapToTestCycle(cycle: TMCycle): TestCycle {
  const statusMap: Record<string, CycleStatus> = {
    'PLANNED': 'planned',
    'IN_PROGRESS': 'active',
    'COMPLETED': 'completed',
    'CANCELLED': 'cancelled',
  };
  
  return {
    id: cycle.id,
    project_id: cycle.project_id,
    cycle_key: cycle.key,
    title: cycle.name,
    description: cycle.description || '',
    status: statusMap[cycle.status] || 'planned',
    environment_id: cycle.environment || undefined,
    environment: cycle.environment ? { id: cycle.environment, name: cycle.environment } as any : undefined,
    planned_start: cycle.planned_start_date || undefined,
    planned_end: cycle.planned_end_date || undefined,
    actual_start: cycle.actual_start_date || undefined,
    actual_end: cycle.actual_end_date || undefined,
    created_at: cycle.created_at,
    updated_at: cycle.updated_at,
    statistics: {
      total_cases: cycle.total_cases || 0,
      passed_count: cycle.passed_count || 0,
      failed_count: cycle.failed_count || 0,
      blocked_count: cycle.blocked_count || 0,
      not_run_count: cycle.not_run_count || 0,
    },
  } as TestCycle;
}

// Mock folders for demo - would come from API
const MOCK_FOLDERS: CycleFolder[] = [
  {
    id: 'sprint-cycles',
    name: 'Sprint Cycles',
    count: 12,
    children: [
      { id: 'sprint-q1', name: 'Q1 2026', count: 4 },
      { id: 'sprint-q2', name: 'Q2 2026', count: 3 },
    ],
  },
  {
    id: 'release-cycles',
    name: 'Release Cycles',
    count: 5,
    children: [
      { id: 'release-v1', name: 'v1.0', count: 2 },
      { id: 'release-v2', name: 'v2.0', count: 3 },
    ],
  },
  {
    id: 'regression',
    name: 'Regression',
    count: 8,
  },
];

export function TestCyclesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // View state
  const [viewMode, setViewMode] = useState<CycleViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CycleStatusFilter>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Modal/drawer states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<TestCycle | null>(null);
  const [deleteConfirmCycle, setDeleteConfirmCycle] = useState<TestCycle | null>(null);
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  const [detailDrawerCycle, setDetailDrawerCycle] = useState<TestCycle | null>(null);

  // Get project ID from store or search params
  const selectedProjectId = useProjectStore(s => s.selectedProjectId);
  const projectId = selectedProjectId || searchParams.get('projectId') || undefined;

  // Build filters for the hook
  const filters = useMemo(() => ({
    status: statusFilter !== 'all' ? statusFilter.toUpperCase() as 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' : undefined,
    search: searchQuery || undefined,
  }), [statusFilter, searchQuery]);

  // Fetch cycles using hooks
  const { data: cycles = [], isLoading: cyclesLoading, refetch } = useTestCycles(projectId, filters);
  const { data: environmentNames = [] } = useEnvironments(projectId || null);

  // Convert environment strings to objects for dropdown
  const environmentOptions = environmentNames.map((name) => ({ id: name, name }));
  
  // Mutations
  const createCycleMutation = useCreateCycle();
  const updateCycleMutation = useUpdateCycle();
  const deleteCycleMutation = useDeleteCycle();
  const startCycleMutation = useStartCycle();
  const completeCycleMutation = useCompleteCycle();
  const cloneCycleMutation = useCloneCycle();

  // Map cycles to component-compatible format
  const mappedCycles = useMemo(() => cycles.map(mapToTestCycle), [cycles]);

  // Client-side filtering for folder and date range
  const filteredCycles = useMemo(() => {
    let result = mappedCycles;
    
    // TODO: Filter by folder when folder structure is implemented
    
    if (dateRange.from) {
      result = result.filter(c => {
        if (!c.planned_start) return true;
        return new Date(c.planned_start) >= dateRange.from!;
      });
    }
    
    if (dateRange.to) {
      result = result.filter(c => {
        if (!c.planned_end) return true;
        return new Date(c.planned_end) <= dateRange.to!;
      });
    }
    
    return result;
  }, [mappedCycles, selectedFolderId, dateRange]);

  // Summary stats
  const stats = useMemo(() => {
    const total = mappedCycles.length;
    const active = mappedCycles.filter(c => c.status === 'active').length;
    const completed = mappedCycles.filter(c => c.status === 'completed').length;
    
    let avgPassRate = 0;
    const cyclesWithStats = mappedCycles.filter(c => c.statistics?.total_cases);
    if (cyclesWithStats.length > 0) {
      const totalRate = cyclesWithStats.reduce((acc, c) => {
        const stats = c.statistics!;
        const executed = stats.total_cases - stats.not_run_count;
        return acc + (executed > 0 ? (stats.passed_count / executed) * 100 : 0);
      }, 0);
      avgPassRate = Math.round(totalRate / cyclesWithStats.length);
    }
    
    return { total, active, completed, avgPassRate };
  }, [mappedCycles]);

  // Handlers
  const handleCreate = useCallback(async (data: any) => {
    if (!projectId) return;
    createCycleMutation.mutate({
      name: data.title || data.name,
      description: data.description,
      environment: data.environment_id,
      build_version: data.build_version,
      planned_start_date: data.planned_start,
      planned_end_date: data.planned_end,
      project_id: projectId,
    }, {
      onSuccess: () => setCreateModalOpen(false),
    });
  }, [projectId, createCycleMutation]);

  const handleEdit = useCallback((cycle: TestCycle) => {
    setEditingCycle(cycle);
  }, []);

  const handleUpdate = useCallback(async (data: any) => {
    if (!editingCycle || !projectId) return;
    updateCycleMutation.mutate({
      id: data.id,
      name: data.title || data.name,
      description: data.description,
      environment: data.environment_id,
      build_version: data.build_version,
      planned_start_date: data.planned_start,
      planned_end_date: data.planned_end,
      project_id: projectId,
    }, {
      onSuccess: () => setEditingCycle(null),
    });
  }, [editingCycle, projectId, updateCycleMutation]);

  const handleClone = useCallback(async (cycle: TestCycle) => {
    if (!projectId) return;
    cloneCycleMutation.mutate({ id: cycle.id, project_id: projectId });
  }, [projectId, cloneCycleMutation]);

  const handleStart = useCallback(async (cycle: TestCycle) => {
    if (!projectId) return;
    startCycleMutation.mutate({ id: cycle.id, project_id: projectId });
  }, [projectId, startCycleMutation]);

  const handleComplete = useCallback(async (cycle: TestCycle) => {
    if (!projectId) return;
    completeCycleMutation.mutate({ id: cycle.id, project_id: projectId });
  }, [projectId, completeCycleMutation]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirmCycle || !projectId) return;
    deleteCycleMutation.mutate({ id: deleteConfirmCycle.id, project_id: projectId }, {
      onSuccess: () => setDeleteConfirmCycle(null),
    });
  }, [deleteConfirmCycle, projectId, deleteCycleMutation]);

  const handleRowClick = useCallback((cycle: TestCycle) => {
    setDetailDrawerCycle(cycle);
  }, []);

  const handleViewExecution = useCallback((cycle: TestCycle) => {
    navigate(`/tests/cycles/${cycle.id}`);
  }, [navigate]);

  const handleSelectionChange = useCallback((ids: Set<string>) => {
    setSelectedIds(ids);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateRange({});
    setSelectedFolderId(null);
  }, []);

  // Bulk action handlers
  const handleBulkDelete = useCallback(() => {
    catalystToast.info('Bulk delete not yet implemented');
  }, []);

  const handleBulkStart = useCallback(() => {
    catalystToast.info('Bulk start not yet implemented');
  }, []);

  const handleBulkComplete = useCallback(() => {
    catalystToast.info('Bulk complete not yet implemented');
  }, []);

  const handleBulkClone = useCallback(() => {
    catalystToast.info('Bulk clone not yet implemented');
  }, []);

  const handleBulkMove = useCallback((folderId: string) => {
    catalystToast.info('Bulk move not yet implemented');
  }, []);

  const handleBulkReschedule = useCallback((startDate: string, endDate: string) => {
    catalystToast.info('Bulk reschedule not yet implemented');
  }, []);

  const selectedCycles = filteredCycles.filter(c => selectedIds.has(c.id));
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || dateRange.from || dateRange.to;

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Folder Tree */}
      <div className="w-64 border-r bg-muted/30 flex-shrink-0">
        <CyclesFolderTree
          folders={MOCK_FOLDERS}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onSearch={(q) => setSearchQuery(q)}
          totalCyclesCount={stats.total}
          archivedCount={0}
          onCreateFolder={() => catalystToast.info('Create folder coming soon')}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h1 className="text-lg font-semibold">Test Cycles</h1>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Cycle
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="px-6 py-4">
          <CycleStatsCards
            stats={{
              total: stats.total,
              inProgress: stats.active,
              completed: stats.completed,
              passRate: stats.avgPassRate,
            }}
          />
        </div>

        {/* Toolbar */}
        <div className="px-6 pb-4">
          <CyclesToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            selectedCount={selectedIds.size}
            onBulkAction={() => setBulkActionsOpen(true)}
            onCreateCycle={() => setCreateModalOpen(true)}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          {cyclesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredCycles.length === 0 ? (
            <CyclesEmptyState
              variant={hasActiveFilters ? 'search' : 'default'}
              title={hasActiveFilters ? 'No matching cycles' : 'No test cycles found'}
              description={hasActiveFilters ? 'Try adjusting your filters' : 'Create your first test cycle to start organizing test execution'}
              onAction={hasActiveFilters ? handleClearFilters : () => setCreateModalOpen(true)}
              actionLabel={hasActiveFilters ? 'Clear Filters' : 'Create Cycle'}
            />
          ) : viewMode === 'list' ? (
            <CycleTableView
              cycles={filteredCycles}
              selectedIds={Array.from(selectedIds)}
              onSelectAll={(selected) => {
                if (selected) {
                  setSelectedIds(new Set(filteredCycles.map(c => c.id)));
                } else {
                  setSelectedIds(new Set());
                }
              }}
              onSelectCycle={(id, selected) => {
                const newSet = new Set(selectedIds);
                if (selected) newSet.add(id);
                else newSet.delete(id);
                setSelectedIds(newSet);
              }}
              onCycleClick={handleRowClick}
              onEdit={handleEdit}
              onClone={handleClone}
              onDelete={setDeleteConfirmCycle}
            />
          ) : viewMode === 'grid' ? (
            <CycleCardView
              cycles={filteredCycles}
              onCycleClick={handleRowClick}
              onEdit={handleEdit}
              onClone={handleClone}
              onDelete={setDeleteConfirmCycle}
            />
          ) : (
            <CycleCalendarView
              cycles={filteredCycles}
              onCycleClick={handleRowClick}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateCycleModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        environments={environmentOptions as any}
        onSubmit={handleCreate}
        isLoading={createCycleMutation.isPending}
      />

      {editingCycle && (
        <EditCycleModal
          open={!!editingCycle}
          onOpenChange={(open) => !open && setEditingCycle(null)}
          cycle={editingCycle}
          environments={environmentOptions as any}
          onSubmit={handleUpdate}
          isLoading={updateCycleMutation.isPending}
        />
      )}

      <DeleteCycleModal
        open={!!deleteConfirmCycle}
        onOpenChange={(open) => !open && setDeleteConfirmCycle(null)}
        cycle={deleteConfirmCycle}
        onConfirm={handleDelete}
        isLoading={deleteCycleMutation.isPending}
      />

      <BulkActionsModal
        open={bulkActionsOpen}
        onOpenChange={setBulkActionsOpen}
        selectedCycles={selectedCycles}
        folders={MOCK_FOLDERS}
        onBulkDelete={handleBulkDelete}
        onBulkStart={handleBulkStart}
        onBulkComplete={handleBulkComplete}
        onBulkClone={handleBulkClone}
        onBulkMove={handleBulkMove}
        onBulkReschedule={handleBulkReschedule}
      />

      <CycleDetailDrawer
        open={!!detailDrawerCycle}
        onOpenChange={(open) => !open && setDetailDrawerCycle(null)}
        cycle={detailDrawerCycle}
        onEdit={handleEdit}
        onStart={handleStart}
        onComplete={handleComplete}
        onClone={handleClone}
        onDelete={setDeleteConfirmCycle}
        onViewExecution={handleViewExecution}
      />
    </div>
  );
}

export default TestCyclesPage;
