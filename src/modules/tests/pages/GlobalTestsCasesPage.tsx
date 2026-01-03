/**
 * GLOBAL TESTS CASES PAGE
 * Enterprise-grade test case management
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { TestsPageHeader, useTestsScope } from '../components/TestsPageHeader';
import { TestCasesGrid, TestCaseRow } from '../components/TestCasesGrid';
import { TestCaseDetailDrawer } from '../components/TestCaseDetailDrawer';
import { CreateTestCaseModal } from '../components/CreateTestCaseModal';
import { AddToSetModal } from '../components/AddToSetModal';
import { AddToCycleModal } from '../components/AddToCycleModal';
import { MoveToFolderModal } from '../components/MoveToFolderModal';
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
  pageSize: number
) {
  return useQuery({
    queryKey: ['test-cases', scopeId, filters, search, page, pageSize],
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

  // UI State
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string | null>>({
    status: null,
    priority: null,
    type: null,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

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

  // Data query
  const { data, isLoading, error, refetch } = useTestCasesQuery(
    scopeType as 'program' | 'project',
    scopeId,
    filters,
    search,
    page,
    pageSize
  );

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
    <div className="p-6 space-y-4">
      <TestsPageHeader activePage="cases" onCreate={handleCreateNew} />

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
