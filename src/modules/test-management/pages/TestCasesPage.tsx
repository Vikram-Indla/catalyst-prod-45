/**
 * Test Cases Page
 * Full 3-column layout with folder tree, data table, and details panel
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  useTestCases,
  useTestCase,
  useTestCaseSteps,
  useFoldersWithCounts,
  useCasePriorities,
  useCaseTypes,
  useLabels,
  useTeamMembers,
  useCreateTestCase,
  useUpdateTestCase,
  useDeleteTestCase,
  useCloneTestCase,
  useMoveTestCase,
  useBulkDeleteTestCases,
  useBulkCopyTestCases,
  useAddTestCasesToCycle,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  useMoveFolder,
  useDuplicateFolder,
  type TMTestCase,
  type CaseStatus,
} from '@/hooks/test-management';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { catalystToast } from '@/lib/catalystToast';
import {
  FolderTree,
  CasesToolbar,
  CasesDataTable,
  CaseDetailsPanel,
  CaseModal,
  AddToCycleDialog,
  ImportTestCasesDialog,
  AITestGenerator,
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
    created_by_profile: c.created_by_profile,
    is_ai_generated: c.is_ai_generated,
    // Include related data if available
    priority: c.priority ? { id: c.priority.id, name: c.priority.name, color: c.priority.color } : undefined,
    type: c.type ? { id: c.type.id, name: c.type.name } : undefined,
    case_type: c.type ? { id: c.type.id, name: c.type.name } : undefined,
    folder: c.folder ? { id: c.folder.id, name: c.folder.name } : undefined,
    labels: c.labels || [],
    steps: c.steps || [],
  };
}

export function TestCasesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [filters, setFilters] = useState<CasesFilters>({
    status: [],
    priorityIds: [],
    typeIds: [],
    assignedTo: null,
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
  const [addToCycleOpen, setAddToCycleOpen] = useState(false);
  const [caseToAddToCycle, setCaseToAddToCycle] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 60000,
  });
  const currentUserId = currentUser?.id;

  // Get project ID from URL or use default TM project
  const urlProjectId = searchParams.get('projectId');
  const DEFAULT_TM_PROJECT_ID = '00000000-0000-0000-0000-000000000001';
  const projectId = urlProjectId || DEFAULT_TM_PROJECT_ID;

  // Build filters for the hook (include pagination in filters)
  const caseFilters = useMemo(() => ({
    folder_id: selectedFolderId || undefined,
    status: filters.status.length > 0 ? filters.status[0].toUpperCase() as CaseStatus : undefined,
    priority_id: filters.priorityIds.length > 0 ? filters.priorityIds[0] : undefined,
    type_id: filters.typeIds.length > 0 ? filters.typeIds[0] : undefined,
    assigned_to: filters.assignedTo === 'me' && currentUserId ? currentUserId : filters.assignedTo || undefined,
    search: filters.search || undefined,
    page,
    per_page: pageSize,
  }), [selectedFolderId, filters, page, pageSize, currentUserId]);

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
  const { data: teamMembers } = useTeamMembers(projectId || null);

  // Mutations
  const createCase = useCreateTestCase();
  const createCaseSilent = useCreateTestCase({ silent: true });
  const updateCase = useUpdateTestCase();
  const deleteCase = useDeleteTestCase();
  const cloneCase = useCloneTestCase();
  const moveCase = useMoveTestCase();
  const bulkDeleteCases = useBulkDeleteTestCases();
  const bulkCopyCases = useBulkCopyTestCases();
  const addToCycle = useAddTestCasesToCycle();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const moveFolder = useMoveFolder();
  const duplicateFolder = useDuplicateFolder();

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
    // Navigate to full-screen editor for new case
    navigate(`/tests/cases/new/edit?projectId=${projectId}${selectedFolderId ? `&folderId=${selectedFolderId}` : ''}`);
  }, [navigate, projectId, selectedFolderId]);

  const handleEditCase = useCallback((testCase: any) => {
    // Navigate to full-screen editor
    navigate(`/tests/cases/${testCase.id}/edit?projectId=${projectId}`);
  }, [navigate, projectId]);

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
    setCaseToAddToCycle(testCase.id);
    setAddToCycleOpen(true);
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
      // Get case details for the toast
      const selectedCases = cases.filter(c => selectedIds.has(c.id));
      const caseDetails = selectedCases.map(c => ({ key: c.case_key, title: c.title }));
      
      bulkDeleteCases.mutate({ 
        case_ids: Array.from(selectedIds), 
        project_id: projectId,
        case_details: caseDetails,
      }, {
        onSuccess: () => {
          setSelectedIds(new Set());
          if (selectedCaseId && selectedIds.has(selectedCaseId)) {
            setSelectedCaseId(null);
          }
        },
      });
    }
  }, [selectedIds, bulkDeleteCases, selectedCaseId, projectId, cases]);

  const handleBulkMove = useCallback(() => {
    // Move to selected folder (use currently selected folder as destination)
    if (selectedIds.size > 0 && projectId && selectedFolderId) {
      // Get case details and folder name for the toast
      const selectedCases = cases.filter(c => selectedIds.has(c.id));
      const caseDetails = selectedCases.map(c => ({ key: c.case_key, title: c.title }));
      const folder = folders.find(f => f.id === selectedFolderId);
      
      moveCase.mutate({ 
        case_ids: Array.from(selectedIds), 
        folder_id: selectedFolderId,
        project_id: projectId,
        case_details: caseDetails,
        folder_name: folder?.name,
      }, {
        onSuccess: () => {
          setSelectedIds(new Set());
        },
      });
    } else if (selectedIds.size > 0) {
      catalystToast.info('Select a destination folder', 'Select a destination folder first, then use bulk move');
    }
  }, [selectedIds, moveCase, projectId, selectedFolderId, cases, folders]);

  const handleBulkCopy = useCallback(() => {
    if (selectedIds.size > 0 && projectId) {
      // Get case details for the toast
      const selectedCases = cases.filter(c => selectedIds.has(c.id));
      const caseDetails = selectedCases.map(c => ({ key: c.case_key, title: c.title }));
      
      bulkCopyCases.mutate({ 
        case_ids: Array.from(selectedIds), 
        folder_id: selectedFolderId,
        project_id: projectId,
        case_details: caseDetails,
      }, {
        onSuccess: () => {
          setSelectedIds(new Set());
        },
      });
    }
  }, [selectedIds, bulkCopyCases, projectId, selectedFolderId, cases]);

  const handleBulkExport = useCallback(() => {
    if (selectedIds.size === 0) return;
    
    // Generate CSV from selected test cases
    const selectedCases = cases.filter(c => selectedIds.has(c.id));
    
    const csvHeaders = ['Key', 'Title', 'Status', 'Priority', 'Type', 'Folder', 'Created', 'Updated'];
    const csvRows = selectedCases.map(tc => [
      tc.case_key || '',
      tc.title || '',
      tc.status || '',
      tc.priority?.name || '',
      tc.type?.name || '',
      tc.folder?.name || '',
      tc.created_at ? new Date(tc.created_at).toLocaleDateString() : '',
      tc.updated_at ? new Date(tc.updated_at).toLocaleDateString() : '',
    ]);
    
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `test-cases-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    catalystToast.success('Export complete', `${selectedIds.size} test cases exported`);
    setSelectedIds(new Set());
  }, [selectedIds, cases]);

  const handleOpenAIGenerator = useCallback(() => {
    setAiGeneratorOpen(true);
  }, []);

  const handleSaveAIGeneratedCases = useCallback(async (
    testCases: any[],
    folderId: string,
    status: string
  ) => {
    if (!projectId) return;
    
    // Find folder name for the toast
    const folder = folders.find(f => f.id === folderId);
    const folderName = folder?.name || 'Root';
    
    // Create each test case silently (no individual toasts)
    const createdCases: { key: string; title: string }[] = [];
    for (const tc of testCases) {
      try {
        const result = await createCaseSilent.mutateAsync({
          title: tc.title,
          objective: tc.summary,
          preconditions: tc.preconditions?.join('\n'),
          folder_id: folderId,
          priority_id: undefined,
          type_id: undefined,
          assigned_to: currentUserId, // Assign to current logged-in user
          steps: tc.steps?.map((s: any, i: number) => ({
            step_number: i + 1,
            action: s.action,
            test_data: s.testData,
            expected_result: s.expectedResult,
          })) || [],
          project_id: projectId,
          is_ai_generated: true,
          ai_generation_prompt: tc.title,
        });
        createdCases.push({ 
          key: result.key || (result as any).case_key || '', 
          title: tc.title 
        });
      } catch (err) {
        console.error('Failed to create case:', tc.title, err);
      }
    }
    
    // Show single batch toast with folder and case details
    if (createdCases.length > 0) {
      const casesSummary = createdCases
        .map(c => `• ${c.key}: ${c.title.slice(0, 30)}${c.title.length > 30 ? '…' : ''}`)
        .join('\n');
      
      catalystToast.success(
        `${createdCases.length} test case${createdCases.length > 1 ? 's' : ''} saved to "${folderName}"`,
        casesSummary
      );
    }
  }, [createCaseSilent, projectId, folders, currentUserId]);

  const handleAddSelectedToCycle = useCallback((cycleId: string) => {
    if (selectedIds.size > 0 && projectId) {
      addToCycle.mutate({ 
        case_ids: Array.from(selectedIds), 
        cycle_id: cycleId,
        project_id: projectId 
      }, {
        onSuccess: () => {
          setSelectedIds(new Set());
        },
      });
    }
  }, [selectedIds, addToCycle, projectId]);

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

  const handleMoveFolder = useCallback((folderId: string, newParentId: string | null) => {
    if (!projectId) return;
    moveFolder.mutate({ id: folderId, project_id: projectId, new_parent_id: newParentId || '' });
  }, [moveFolder, projectId]);

  const handleDuplicateFolder = useCallback((folderId: string) => {
    if (!projectId) return;
    duplicateFolder.mutate({ id: folderId, project_id: projectId });
  }, [duplicateFolder, projectId]);

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
            onMoveFolder={handleMoveFolder}
            onDuplicateFolder={handleDuplicateFolder}
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
          onGenerateWithAI={handleOpenAIGenerator}
          onBulkCopy={handleBulkCopy}
          onBulkMove={handleBulkMove}
          onBulkDelete={handleBulkDelete}
          onBulkExport={handleBulkExport}
          onClearSelection={() => setSelectedIds(new Set())}
          onImport={() => setImportDialogOpen(true)}
          priorities={prioritiesForUI}
          caseTypes={typesForUI}
          teamMembers={teamMembers || []}
          currentUserId={currentUserId}
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

      {/* Add to Cycle Dialog */}
      <AddToCycleDialog
        open={addToCycleOpen}
        onOpenChange={setAddToCycleOpen}
        caseIds={caseToAddToCycle ? [caseToAddToCycle] : Array.from(selectedIds)}
        projectId={projectId}
        onSuccess={() => {
          setCaseToAddToCycle(null);
        }}
      />

      {/* Import Dialog */}
      <ImportTestCasesDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        projectId={projectId}
        folderId={selectedFolderId}
        onSuccess={() => {
          // Data will be refetched automatically via react-query
        }}
      />

      {/* AI Test Case Generator */}
      <AITestGenerator
        open={aiGeneratorOpen}
        onOpenChange={setAiGeneratorOpen}
        onSaveTestCases={handleSaveAIGeneratedCases}
        defaultFolderId={selectedFolderId}
        projectId={projectId}
      />
    </div>
  );
}

export default TestCasesPage;
