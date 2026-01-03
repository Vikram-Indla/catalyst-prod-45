/**
 * GLOBAL TESTS CASES PAGE
 * Enterprise-grade test case management with folder tree
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TestsPageHeader, useTestsScope } from '../components/TestsPageHeader';
import { TestCasesGrid, TestCaseRow } from '../components/TestCasesGrid';
import { TestCaseDetailDrawer } from '../components/TestCaseDetailDrawer';
import { CreateTestCaseModal } from '../components/CreateTestCaseModal';
import { AddToSetModal } from '../components/AddToSetModal';
import { AddToCycleModal } from '../components/AddToCycleModal';
import { MoveToFolderModal } from '../components/MoveToFolderModal';
import { TestFolderTree } from '../components/TestFolderTree';
import {
  runMutationWithAudit,
  createPipelineContext,
  PipelineError,
} from '../lib/actionPipeline';

// ═══════════════════════════════════════════════════════════════════
// HOOK: useTestCasesQuery
// ═══════════════════════════════════════════════════════════════════

function useTestCasesQuery(
  scopeType: 'program' | 'project',
  scopeId: string | null,
  filters: Record<string, string | null>,
  search: string,
  page: number,
  pageSize: number,
  folderId: string | null
) {
  return useQuery({
    queryKey: ['test-cases', scopeId, filters, search, page, pageSize, folderId],
    queryFn: async () => {
      if (!scopeId) return { data: [], total: 0 };

      let query = supabase
        .from('test_cases')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .is('is_archived', null)
        .order('updated_at', { ascending: false });

      // Scope filter
      if (scopeType === 'project') {
        query = query.eq('project_id', scopeId);
      } else {
        query = query.eq('program_id', scopeId);
      }

      // Folder filter
      if (folderId) {
        query = query.eq('folder_id', folderId);
      }

      // Search
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,component.ilike.%${search}%`);
      }

      // Filters
      if (filters.status) {
        query = query.eq('status', filters.status as any);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority as any);
      }
      if (filters.type) {
        query = query.eq('test_type', filters.type as any);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: (data || []) as TestCaseRow[],
        total: count || 0,
      };
    },
    enabled: !!scopeId,
    staleTime: 15000,
  });
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function GlobalTestsCasesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { scopeType, scopeId } = useTestsScope();

  // SCOPE ENFORCEMENT: Test Cases are ONLY manageable at project level
  const isProjectScope = scopeType === 'project';
  
  // UI State
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string | null>>({
    status: null,
    priority: null,
    type: null,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderPanelOpen, setFolderPanelOpen] = useState(true);

  // Drawer state
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [addToSetModalOpen, setAddToSetModalOpen] = useState(false);
  const [addToCycleModalOpen, setAddToCycleModalOpen] = useState(false);
  const [moveToFolderModalOpen, setMoveToFolderModalOpen] = useState(false);
  const [actionCaseIds, setActionCaseIds] = useState<string[]>([]);

  // Data query (includes folder filter) - only fetch if project scope
  const { data, isLoading, error, refetch } = useTestCasesQuery(
    scopeType as 'program' | 'project',
    isProjectScope ? scopeId : null, // Only load data at project scope
    filters,
    search,
    page,
    pageSize,
    selectedFolderId
  );

  // SCOPE ENFORCEMENT: Block non-project scope
  if (!isProjectScope) {
    const { ProjectScopeRequired } = require('../components/ProjectScopeRequired');
    return <ProjectScopeRequired featureName="Test Cases" />;
  }

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!user || !scopeId) throw new Error('Not authenticated');
      const context = createPipelineContext(
        user.id,
        scopeType as 'program' | 'project',
        scopeId
      );

      return runMutationWithAudit({ ids }, {
        context,
        action: 'delete',
        entityType: 'test_cases',
        activityType: 'archived',
        successMessage: `${ids.length} case(s) archived`,
        queryClient,
        invalidateKeys: [
          ['test-cases', scopeId],
          ['test-metrics', scopeId],
        ],
        mutationFn: async ({ ids }) => {
          const { error } = await supabase
            .from('test_cases')
            .update({
              is_archived: true,
              archived_at: new Date().toISOString(),
              archived_by: user.id,
            })
            .in('id', ids);
          if (error) throw new PipelineError('unknown', error.message);
          return { count: ids.length };
        },
        getAuditInfo: (input) => ({
          entityId: input.ids[0],
          description: `Archived ${input.ids.length} test case(s)`,
          metadata: { caseIds: input.ids },
        }),
      });
    },
  });

  // Handlers
  const handleRowClick = useCallback((id: string) => {
    setSelectedCaseId(id);
    setEditMode(false);
    setDrawerOpen(true);
  }, []);

  const handleViewDetails = useCallback((id: string) => {
    setSelectedCaseId(id);
    setEditMode(false);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((id: string) => {
    setSelectedCaseId(id);
    setEditMode(true);
    setDrawerOpen(true);
  }, []);

  const handleAddToSet = useCallback((id: string) => {
    setActionCaseIds([id]);
    setAddToSetModalOpen(true);
  }, []);

  const handleAddToCycle = useCallback((id: string) => {
    setActionCaseIds([id]);
    setAddToCycleModalOpen(true);
  }, []);

  const handleArchive = useCallback((id: string) => {
    archiveMutation.mutate([id]);
  }, [archiveMutation]);

  const handleBulkArchive = useCallback((ids: string[]) => {
    archiveMutation.mutate(ids);
  }, [archiveMutation]);

  const handleBulkAddToSet = useCallback((ids: string[]) => {
    setActionCaseIds(ids);
    setAddToSetModalOpen(true);
  }, []);

  const handleBulkAddToCycle = useCallback((ids: string[]) => {
    setActionCaseIds(ids);
    setAddToCycleModalOpen(true);
  }, []);

  const handleBulkMoveFolder = useCallback((ids: string[]) => {
    setActionCaseIds(ids);
    setMoveToFolderModalOpen(true);
  }, []);

  const handleCreateNew = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const handleCaseCreated = useCallback((id: string) => {
    setSelectedCaseId(id);
    setEditMode(false);
    setDrawerOpen(true);
  }, []);

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <TestsPageHeader activePage="cases" />
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load test cases: {(error as Error).message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-4 pb-2">
        <TestsPageHeader activePage="cases" onCreate={handleCreateNew} />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Folder Tree Panel */}
        <div
          className={cn(
            'border-r border-border-default bg-surface-1 transition-all duration-200 flex flex-col',
            folderPanelOpen ? 'w-56' : 'w-0 overflow-hidden'
          )}
        >
          {folderPanelOpen && (
            <TestFolderTree
              programId={scopeId}
              entityType="test_cases"
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              className="flex-1"
            />
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 p-4">
          {/* Folder toggle button */}
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setFolderPanelOpen(!folderPanelOpen)}
            >
              {folderPanelOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </Button>
            {selectedFolderId && (
              <span className="text-xs text-text-tertiary">
                Filtered by folder
              </span>
            )}
          </div>

          <TestCasesGrid
            cases={data?.data || []}
            isLoading={isLoading}
            totalCount={data?.total || 0}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onRefresh={refetch}
            onRowClick={handleRowClick}
            onCreateNew={handleCreateNew}
            onBulkArchive={handleBulkArchive}
            onBulkAddToSet={handleBulkAddToSet}
            onBulkAddToCycle={handleBulkAddToCycle}
            onBulkMoveFolder={handleBulkMoveFolder}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onAddToSet={handleAddToSet}
            onAddToCycle={handleAddToCycle}
            onArchive={handleArchive}
            filters={filters}
            onFiltersChange={setFilters}
            searchQuery={search}
            onSearchChange={setSearch}
          />
        </div>
      </div>

      {/* Detail Drawer */}
      <TestCaseDetailDrawer
        testCaseId={selectedCaseId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editMode={editMode}
        scopeType={scopeType as 'program' | 'project'}
        scopeId={scopeId || ''}
      />

      {/* Create Modal */}
      <CreateTestCaseModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        scopeType={scopeType as 'program' | 'project'}
        scopeId={scopeId || ''}
        onSuccess={handleCaseCreated}
        defaultFolderId={selectedFolderId}
      />

      {/* Add to Set Modal */}
      <AddToSetModal
        open={addToSetModalOpen}
        onOpenChange={setAddToSetModalOpen}
        caseIds={actionCaseIds}
        scopeType={scopeType as 'program' | 'project'}
        scopeId={scopeId || ''}
        onSuccess={() => setActionCaseIds([])}
      />

      {/* Add to Cycle Modal */}
      <AddToCycleModal
        open={addToCycleModalOpen}
        onOpenChange={setAddToCycleModalOpen}
        caseIds={actionCaseIds}
        scopeType={scopeType as 'program' | 'project'}
        scopeId={scopeId || ''}
        onSuccess={() => setActionCaseIds([])}
      />

      {/* Move to Folder Modal */}
      <MoveToFolderModal
        open={moveToFolderModalOpen}
        onOpenChange={setMoveToFolderModalOpen}
        caseIds={actionCaseIds}
        scopeType={scopeType as 'program' | 'project'}
        scopeId={scopeId || ''}
        onSuccess={() => setActionCaseIds([])}
      />
    </div>
  );
}
