/**
 * Test Cases Page
 * Full 3-column layout with folder tree, data table, and details panel
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useTestCases,
  useTestCase,
  useTestCaseSteps,
  useFoldersWithCounts,
  useCasePriorities,
  useCaseTypes,
  useLabels,
  useCreateTestCase,
  useUpdateTestCase,
  useDeleteTestCase,
  useCloneTestCase,
  useMoveTestCase,
  useBulkDeleteTestCases,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  type TMTestCase,
  type CaseStatus,
} from '@/hooks/test-management';
import {
  FolderTree,
  CasesToolbar,
  CasesDataTable,
  CaseDetailsPanel,
  CaseModal,
  type CasesFilters,
  type SortField,
  type SortDirection,
} from '../components/cases';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

// Helper to map TMTestCase to component-compatible format
function mapTMCaseToCase(c: TMTestCase): any {
  return {
    id: c.id,
    project_id: c.project_id,
    folder_id: c.folder_id,
    case_key: c.key,
    title: c.title,
    objective: c.objective,
    preconditions: c.preconditions,
    status: c.status.toLowerCase(),
    priority_id: c.priority_id,
    type_id: c.type_id,
    version: c.version,
    created_at: c.created_at,
    updated_at: c.updated_at,
    created_by: c.created_by,
    // Include related data if available
    priority: c.priority ? { id: c.priority.id, name: c.priority.name, color: c.priority.color } : undefined,
    type: c.type ? { id: c.type.id, name: c.type.name } : undefined,
    folder: c.folder ? { id: c.folder.id, name: c.folder.name } : undefined,
    labels: c.labels || [],
    steps: c.steps || [],
  };
}

export function TestCasesPage() {
  const [searchParams] = useSearchParams();
  
  // State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [filters, setFilters] = useState<CasesFilters>({
    status: [],
    priorityIds: [],
    typeIds: [],
    search: '',
  });
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<any | null>(null);

  // Get project ID from URL
  const projectId = searchParams.get('projectId') || undefined;

  // Build filters for the hook (include pagination in filters)
  const caseFilters = useMemo(() => ({
    folder_id: selectedFolderId || undefined,
    status: filters.status.length > 0 ? filters.status[0].toUpperCase() as CaseStatus : undefined,
    priority_id: filters.priorityIds.length > 0 ? filters.priorityIds[0] : undefined,
    type_id: filters.typeIds.length > 0 ? filters.typeIds[0] : undefined,
    search: filters.search || undefined,
    page,
    per_page: pageSize,
  }), [selectedFolderId, filters, page, pageSize]);

  // API hooks using new test-management hooks
  const { data: foldersData, isLoading: foldersLoading } = useFoldersWithCounts(projectId);
  const folders = foldersData || [];

  const { data: casesRaw, isLoading: casesLoading } = useTestCases(projectId, caseFilters);
  const cases = useMemo(() => (casesRaw?.cases || []).map(mapTMCaseToCase), [casesRaw]);
  const totalCases = casesRaw?.total || 0;
  const totalPages = Math.ceil(totalCases / pageSize);

  const { data: selectedCaseRaw, isLoading: caseLoading } = useTestCase(selectedCaseId);
  const selectedCase = selectedCaseRaw ? mapTMCaseToCase(selectedCaseRaw) : null;

  const { data: selectedCaseStepsRaw } = useTestCaseSteps(selectedCaseId);
  const selectedCaseSteps = selectedCaseStepsRaw || [];

  // Config data
  const { data: priorities } = useCasePriorities(projectId || null);
  const { data: types } = useCaseTypes(projectId || null);
  const { data: labels } = useLabels(projectId || null);

  // Mutations
  const createCase = useCreateTestCase();
  const updateCase = useUpdateTestCase();
  const deleteCase = useDeleteTestCase();
  const cloneCase = useCloneTestCase();
  const moveCase = useMoveTestCase();
  const bulkDeleteCases = useBulkDeleteTestCases();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  // Handlers
  const handleSortChange = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const handleRowClick = useCallback((testCase: any) => {
    setSelectedCaseId(testCase.id);
    setShowDetailsPanel(true);
  }, []);

  const handleCreateCase = useCallback(() => {
    setEditingCase(null);
    setModalOpen(true);
  }, []);

  const handleEditCase = useCallback((testCase: any) => {
    setEditingCase(testCase);
    setModalOpen(true);
  }, []);

  const handleDuplicateCase = useCallback((testCase: any) => {
    if (!projectId) return;
    cloneCase.mutate({ 
      id: testCase.id, 
      project_id: projectId,
    });
  }, [cloneCase, projectId]);

  const handleDeleteCase = useCallback((testCase: any) => {
    setCaseToDelete(testCase);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (caseToDelete && projectId) {
      deleteCase.mutate({ id: caseToDelete.id, project_id: projectId });
      if (selectedCaseId === caseToDelete.id) {
        setSelectedCaseId(null);
      }
      setDeleteDialogOpen(false);
      setCaseToDelete(null);
    }
  }, [caseToDelete, deleteCase, selectedCaseId, projectId]);

  const handleAddToCycle = useCallback((testCase: any) => {
    // TODO: Open add to cycle modal
    console.log('Add to cycle:', testCase.case_key);
  }, []);

  const handleSaveCase = useCallback(
    (data: any, steps: any[]) => {
      if (!projectId) return;
      
      if (editingCase) {
        updateCase.mutate(
          { 
            id: editingCase.id, 
            title: data.title,
            objective: data.objective,
            preconditions: data.preconditions,
            status: data.status?.toUpperCase() as CaseStatus,
            priority_id: data.priority_id,
            type_id: data.type_id,
            folder_id: data.folder_id,
            project_id: projectId,
          },
          {
            onSuccess: () => {
              setModalOpen(false);
              setEditingCase(null);
            },
          }
        );
      } else {
        createCase.mutate(
          { 
            title: data.title,
            objective: data.objective,
            preconditions: data.preconditions,
            folder_id: data.folder_id || selectedFolderId,
            priority_id: data.priority_id,
            type_id: data.type_id,
            steps: steps.map((s, i) => ({
              step_number: i + 1,
              action: s.action,
              test_data: s.test_data,
              expected_result: s.expected_result,
            })),
            project_id: projectId,
          },
          {
            onSuccess: () => {
              setModalOpen(false);
            },
          }
        );
      }
    },
    [editingCase, updateCase, createCase, projectId, selectedFolderId]
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size > 0 && projectId) {
      bulkDeleteCases.mutate({ case_ids: Array.from(selectedIds), project_id: projectId }, {
        onSuccess: () => {
          setSelectedIds(new Set());
          if (selectedCaseId && selectedIds.has(selectedCaseId)) {
            setSelectedCaseId(null);
          }
        },
      });
    }
  }, [selectedIds, bulkDeleteCases, selectedCaseId, projectId]);

  const handleBulkMove = useCallback(() => {
    // TODO: Open move to folder modal
    console.log('Move cases:', Array.from(selectedIds));
  }, [selectedIds]);

  const handleBulkCopy = useCallback(() => {
    // TODO: Implement bulk copy
    console.log('Copy cases:', Array.from(selectedIds));
  }, [selectedIds]);

  const handleBulkExport = useCallback(() => {
    // TODO: Implement export
    console.log('Export cases:', Array.from(selectedIds));
  }, [selectedIds]);

  const handleCreateFolder = useCallback((parentId: string | null, name: string) => {
    if (!projectId) return;
    createFolder.mutate({
      project_id: projectId,
      parent_id: parentId || undefined,
      name,
    });
  }, [createFolder, projectId]);

  const handleRenameFolder = useCallback((folderId: string, name: string) => {
    if (!projectId) return;
    updateFolder.mutate({
      id: folderId,
      project_id: projectId,
      name,
    });
  }, [updateFolder, projectId]);

  const handleDeleteFolder = useCallback((folderId: string) => {
    if (!projectId) return;
    deleteFolder.mutate({ id: folderId, project_id: projectId });
  }, [deleteFolder, projectId]);

  // Map priorities and types to component format
  const prioritiesForUI = useMemo(() => 
    (priorities || []).map(p => ({ id: p.id, name: p.name, color: p.color })),
    [priorities]
  );

  const typesForUI = useMemo(() => 
    (types || []).map(t => ({ id: t.id, name: t.name })),
    [types]
  );

  const labelsForUI = useMemo(() => 
    (labels || []).map(l => ({ id: l.id, name: l.name, color: l.color })),
    [labels]
  );

  // Show empty state if no project selected
  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>No project selected</p>
          <p className="text-sm">Please select a project to view test cases</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-0">
      {/* Left Panel - Folder Tree */}
      <div className="w-60 shrink-0 border-r border-border bg-background">
        {foldersLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        ) : (
          <FolderTree
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            totalCaseCount={totalCases}
            isLoading={foldersLoading}
          />
        )}
      </div>

      {/* Center Panel - Data Table */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/30">
        {/* Toolbar */}
        <CasesToolbar
          filters={filters}
          onFiltersChange={setFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedCount={selectedIds.size}
          onCreateCase={handleCreateCase}
          onBulkCopy={handleBulkCopy}
          onBulkMove={handleBulkMove}
          onBulkDelete={handleBulkDelete}
          onBulkExport={handleBulkExport}
          onClearSelection={() => setSelectedIds(new Set())}
          priorities={prioritiesForUI}
          caseTypes={typesForUI}
        />

        {/* Data Table */}
        {casesLoading ? (
          <div className="flex-1 p-4 space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : cases.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">No test cases found</p>
              <p className="text-sm">Create your first test case to get started</p>
            </div>
          </div>
        ) : (
          <CasesDataTable
            cases={cases}
            isLoading={casesLoading}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={handleRowClick}
            onEdit={handleEditCase}
            onDuplicate={handleDuplicateCase}
            onDelete={handleDeleteCase}
            onAddToCycle={handleAddToCycle}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            totalItems={totalCases}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </div>

      {/* Right Panel - Details */}
      {showDetailsPanel && selectedCaseId && (
        caseLoading ? (
          <div className="w-96 border-l border-border bg-background p-4 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <CaseDetailsPanel
            testCase={selectedCase}
            steps={selectedCaseSteps}
            isLoading={caseLoading}
            onClose={() => {
              setShowDetailsPanel(false);
              setSelectedCaseId(null);
            }}
            onEdit={handleEditCase}
            onDuplicate={handleDuplicateCase}
            onAddToCycle={handleAddToCycle}
          />
        )
      )}

      {/* Create/Edit Modal */}
      <CaseModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCase(null);
        }}
        testCase={editingCase}
        steps={editingCase ? selectedCaseSteps : []}
        folders={folders}
        priorities={prioritiesForUI}
        caseTypes={typesForUI}
        labels={labelsForUI}
        onSave={handleSaveCase}
        isSubmitting={createCase.isPending || updateCase.isPending}
        projectId={projectId}
        defaultFolderId={selectedFolderId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{caseToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TestCasesPage;
