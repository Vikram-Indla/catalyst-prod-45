/**
 * Test Cases Page
 * Full 3-column layout with folder tree, data table, and details panel
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  useTestCases,
  useTestCase,
  useTestCaseSteps,
  useFolderTree,
  useCreateTestCase,
  useUpdateTestCase,
  useDeleteTestCase,
  useDuplicateTestCase,
  useMoveTestCases,
  useBulkDeleteTestCases,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
} from '../hooks/useCases';
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
import type { TestCase, CreateTestCaseInput, TestStep } from '../api/types';
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

// Mock project ID - in real app, get from context/route
const PROJECT_ID = 'proj-1';

// Mock data for priorities and types (in real app, fetch from API)
const MOCK_PRIORITIES = [
  { id: 'p1', name: 'Critical', color: '#ef4444' },
  { id: 'p2', name: 'High', color: '#f97316' },
  { id: 'p3', name: 'Medium', color: '#eab308' },
  { id: 'p4', name: 'Low', color: '#22c55e' },
];

const MOCK_TYPES = [
  { id: 't1', name: 'Functional' },
  { id: 't2', name: 'Regression' },
  { id: 't3', name: 'Smoke' },
  { id: 't4', name: 'Integration' },
  { id: 't5', name: 'Performance' },
];

const MOCK_LABELS = [
  { id: 'l1', name: 'Automation', color: '#3b82f6' },
  { id: 'l2', name: 'API', color: '#2563eb' },
  { id: 'l3', name: 'UI', color: '#ec4899' },
  { id: 'l4', name: 'Mobile', color: '#10b981' },
];

export function TestCasesPage() {
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
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<TestCase | null>(null);

  // API hooks
  const { data: foldersData, isLoading: foldersLoading } = useFolderTree(PROJECT_ID);
  const folders = foldersData || [];

  const casesParams = useMemo(() => ({
    project_id: PROJECT_ID,
    folder_id: selectedFolderId || undefined,
    status: filters.status.length > 0 ? filters.status[0] : undefined,
    priority_id: filters.priorityIds.length > 0 ? filters.priorityIds[0] : undefined,
    type_id: filters.typeIds.length > 0 ? filters.typeIds[0] : undefined,
    search: filters.search || undefined,
    page,
    limit: pageSize,
  }), [selectedFolderId, filters, page, pageSize]);

  const { data: casesData, isLoading: casesLoading } = useTestCases(casesParams);
  const cases = casesData?.data || [];
  const pagination = casesData?.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 };

  const { data: selectedCase, isLoading: caseLoading } = useTestCase(selectedCaseId);
  const { data: selectedCaseSteps = [] } = useTestCaseSteps(selectedCaseId);

  // Mutations
  const createCase = useCreateTestCase();
  const updateCase = useUpdateTestCase();
  const deleteCase = useDeleteTestCase();
  const duplicateCase = useDuplicateTestCase();
  const moveCases = useMoveTestCases();
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

  const handleRowClick = useCallback((testCase: TestCase) => {
    setSelectedCaseId(testCase.id);
    setShowDetailsPanel(true);
  }, []);

  const handleCreateCase = useCallback(() => {
    setEditingCase(null);
    setModalOpen(true);
  }, []);

  const handleEditCase = useCallback((testCase: TestCase) => {
    setEditingCase(testCase);
    setModalOpen(true);
  }, []);

  const handleDuplicateCase = useCallback((testCase: TestCase) => {
    duplicateCase.mutate({ id: testCase.id, targetFolderId: testCase.folder_id });
  }, [duplicateCase]);

  const handleDeleteCase = useCallback((testCase: TestCase) => {
    setCaseToDelete(testCase);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (caseToDelete) {
      deleteCase.mutate(caseToDelete.id);
      if (selectedCaseId === caseToDelete.id) {
        setSelectedCaseId(null);
      }
      setDeleteDialogOpen(false);
      setCaseToDelete(null);
    }
  }, [caseToDelete, deleteCase, selectedCaseId]);

  const handleAddToCycle = useCallback((testCase: TestCase) => {
    // TODO: Open add to cycle modal
    console.log('Add to cycle:', testCase.case_key);
  }, []);

  const handleSaveCase = useCallback(
    (data: CreateTestCaseInput, steps: Omit<TestStep, 'id' | 'case_id' | 'created_at' | 'updated_at'>[]) => {
      if (editingCase) {
        updateCase.mutate(
          { id: editingCase.id, ...data },
          {
            onSuccess: () => {
              setModalOpen(false);
              setEditingCase(null);
            },
          }
        );
      } else {
        createCase.mutate(
          { ...data, steps },
          {
            onSuccess: () => {
              setModalOpen(false);
            },
          }
        );
      }
    },
    [editingCase, updateCase, createCase]
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size > 0) {
      bulkDeleteCases.mutate(Array.from(selectedIds), {
        onSuccess: () => {
          setSelectedIds(new Set());
          if (selectedCaseId && selectedIds.has(selectedCaseId)) {
            setSelectedCaseId(null);
          }
        },
      });
    }
  }, [selectedIds, bulkDeleteCases, selectedCaseId]);

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
    createFolder.mutate({
      project_id: PROJECT_ID,
      parent_id: parentId || undefined,
      name,
    });
  }, [createFolder]);

  const handleRenameFolder = useCallback((folderId: string, name: string) => {
    updateFolder.mutate({
      id: folderId,
      projectId: PROJECT_ID,
      name,
    });
  }, [updateFolder]);

  const handleDeleteFolder = useCallback((folderId: string) => {
    deleteFolder.mutate({ id: folderId });
  }, [deleteFolder]);

  // Calculate total case count
  const totalCaseCount = pagination.total;

  return (
    <div className="flex h-full gap-0">
      {/* Left Panel - Folder Tree */}
      <div className="w-60 shrink-0 border-r border-border-default bg-surface-0">
        <FolderTree
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          totalCaseCount={totalCaseCount}
          isLoading={foldersLoading}
        />
      </div>

      {/* Center Panel - Data Table */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface-1">
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
          priorities={MOCK_PRIORITIES}
          caseTypes={MOCK_TYPES}
        />

        {/* Data Table */}
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
          page={pagination.page}
          pageSize={pagination.limit}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {/* Right Panel - Details */}
      {showDetailsPanel && selectedCaseId && (
        <CaseDetailsPanel
          testCase={selectedCase || null}
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
        priorities={MOCK_PRIORITIES}
        caseTypes={MOCK_TYPES}
        labels={MOCK_LABELS}
        onSave={handleSaveCase}
        isSubmitting={createCase.isPending || updateCase.isPending}
        projectId={PROJECT_ID}
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
