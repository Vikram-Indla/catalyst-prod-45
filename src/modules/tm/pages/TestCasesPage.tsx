/**
 * Test Cases Page - Main page for test case management
 */

import React, { useState, useCallback } from 'react';
import { TMTopBar } from '../components/TMTopBar';
import { FolderTree } from '../components/FolderTree';
import { TestCaseTable } from '../components/TestCaseTable';
import { TestCaseToolbar } from '../components/TestCaseToolbar';
import { TestCaseModal } from '../components/TestCaseModal';
import { AIGenerateModal } from '../components/AIGenerateModal';
import { useTestFolders, useCreateFolder, useUpdateFolder, useDeleteFolder } from '../hooks/useTestFolders';
import { useTestCases, useCreateTestCase, useDeleteTestCase, useBulkDeleteTestCases, useBulkUpdateStatus } from '../hooks/useTestCases';
import { toast } from 'sonner';
import type { TMTestCaseWithMeta, TMSortState, TestCaseCreateInput, TestCaseStatus, AIGeneratedTestCase } from '../types';
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

export function TestCasesPage() {
  // State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<TMSortState>({ column: 'key', direction: 'asc' });
  const [search, setSearch] = useState('');
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<TMTestCaseWithMeta | null>(null);

  // Hooks
  const { data: foldersData, isLoading: foldersLoading } = useTestFolders();
  const folders = foldersData?.tree || [];
  const totalCount = foldersData?.totalCount || 0;

  const { data: testCases = [], isLoading: casesLoading } = useTestCases({
    folderId: selectedFolderId,
    search,
    sort,
  });

  // Map to TMTestCaseWithMeta
  const testCasesWithMeta: TMTestCaseWithMeta[] = testCases.map((tc) => ({
    ...tc,
    stepCount: 0,
    lastRunResult: null,
  }));

  // Mutations
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const createTestCase = useCreateTestCase();
  const deleteTestCase = useDeleteTestCase();
  const bulkDelete = useBulkDeleteTestCases();
  const bulkStatus = useBulkUpdateStatus();

  // Handlers
  const handleSortChange = useCallback((column: string) => {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleCreateTestCase = useCallback((data: TestCaseCreateInput) => {
    createTestCase.mutate({ ...data, folderId: selectedFolderId });
  }, [createTestCase, selectedFolderId]);

  const handleAddAICases = useCallback((cases: AIGeneratedTestCase[]) => {
    cases.forEach((tc) => {
      createTestCase.mutate({
        title: tc.title,
        type: tc.type,
        priority: tc.priority,
        status: 'draft',
        folderId: selectedFolderId,
      });
    });
  }, [createTestCase, selectedFolderId]);

  const handleDeleteCase = useCallback((tc: TMTestCaseWithMeta) => {
    setCaseToDelete(tc);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (caseToDelete) {
      deleteTestCase.mutate(caseToDelete.id);
      setDeleteDialogOpen(false);
      setCaseToDelete(null);
    }
  }, [caseToDelete, deleteTestCase]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size > 0) {
      bulkDelete.mutate(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  }, [selectedIds, bulkDelete]);

  const handleBulkStatus = useCallback((status: TestCaseStatus) => {
    if (selectedIds.size > 0) {
      bulkStatus.mutate({ ids: Array.from(selectedIds), status });
      setSelectedIds(new Set());
    }
  }, [selectedIds, bulkStatus]);

  const selectedFolderName = selectedFolderId
    ? folders.find((f) => f.id === selectedFolderId)?.name
    : undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
      <TMTopBar
        folderName={selectedFolderName}
        searchValue={search}
        onSearchChange={setSearch}
      />

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Folder Tree - 280px */}
        <FolderTree
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onCreateFolder={(name, parentId) => createFolder.mutate({ name, parentId })}
          onRenameFolder={(id, name) => updateFolder.mutate({ id, name })}
          onDeleteFolder={(id) => deleteFolder.mutate(id)}
          totalCaseCount={totalCount}
          isLoading={foldersLoading}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-1)]">
          {/* Toolbar */}
          <TestCaseToolbar
            selectedCount={selectedIds.size}
            onNewTestCase={() => setCaseModalOpen(true)}
            onAIGenerate={() => setAiModalOpen(true)}
            onBulkDelete={handleBulkDelete}
            onBulkMove={() => toast.info('Bulk move coming soon')}
            onBulkStatus={handleBulkStatus}
            onClearSelection={() => setSelectedIds(new Set())}
          />

          {/* Table */}
          <TestCaseTable
            testCases={testCasesWithMeta}
            isLoading={casesLoading}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            sort={sort}
            onSortChange={handleSortChange}
            onRowClick={(tc) => toast.info(`Viewing ${tc.key}`)}
            onEdit={(tc) => toast.info(`Edit ${tc.key} coming soon`)}
            onDuplicate={(tc) => toast.info(`Duplicate ${tc.key} coming soon`)}
            onDelete={handleDeleteCase}
            onMove={(tc) => toast.info(`Move ${tc.key} coming soon`)}
          />
        </div>
      </div>

      {/* Modals */}
      <TestCaseModal
        open={caseModalOpen}
        onOpenChange={setCaseModalOpen}
        folders={folders}
        onSave={handleCreateTestCase}
      />

      <AIGenerateModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        onAddCases={handleAddAICases}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent style={{ borderRadius: '12px' }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{caseToDelete?.key}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-[#dc2626] text-white hover:bg-[#b91c1c]"
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
