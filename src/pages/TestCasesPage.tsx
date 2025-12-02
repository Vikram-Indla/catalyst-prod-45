import React, { useState } from 'react';
import { FolderPanel } from '@/components/test-management/FolderPanel';
import { CreateFolderModal } from '@/components/test-management/CreateFolderModal';
import { TestCaseHeader } from '@/components/test-management/TestCaseHeader';
import { TestCaseList } from '@/components/test-management/TestCaseList';
import { CreateTestCaseModal } from '@/components/test-management/CreateTestCaseModal';
import { useTestCases, useTestFolders } from '@/hooks/useTestManagement';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { BulkSelectToolbar } from '@/components/test-management/BulkSelectToolbar';
import { BulkEditModal } from '@/components/test-management/BulkEditModal';
import { BulkDeleteModal } from '@/components/test-management/BulkDeleteModal';
import { EditModeToggle } from '@/components/test-management/EditModeToggle';
import { useCaseOperations } from '@/hooks/useCaseOperations';

export const TestCasesPage: React.FC = () => {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    testType: '',
    search: ''
  });

  const { data: testCasesData, isLoading: loadingTestCases } = useTestCases(selectedFolder || undefined);
  const { data: foldersData } = useTestFolders();
  const bulkSelection = useBulkSelection();
  const caseOperations = useCaseOperations();

  // Client-side filtering
  const filteredTestCases = React.useMemo(() => {
    if (!testCasesData) return [];
    
    return testCasesData.filter(testCase => {
      if (filters.status && filters.status !== 'all' && testCase.status !== filters.status) return false;
      if (filters.priority && filters.priority !== 'all' && testCase.priority !== filters.priority) return false;
      if (filters.testType && filters.testType !== 'all' && testCase.test_type !== filters.testType) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return testCase.title.toLowerCase().includes(searchLower) ||
               testCase.description?.toLowerCase().includes(searchLower);
      }
      return true;
    });
  }, [testCasesData, filters]);

  return (
    <div className="flex h-screen bg-background">
      <div className={`${isSidebarCollapsed ? 'w-16' : 'w-[300px]'} transition-all duration-300`}>
        <FolderPanel
          entityType="test_cases"
          folders={foldersData || []}
          selectedFolderId={selectedFolder}
          onFolderSelect={setSelectedFolder}
          onCreateFolder={() => setIsCreateFolderModalOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <TestCaseHeader
          onCreateTestCase={() => setIsCreateModalOpen(true)}
          filters={filters}
          onFilterChange={setFilters}
          testCases={filteredTestCases}
        >
          <EditModeToggle 
            isActive={bulkSelection.isEditMode} 
            onToggle={bulkSelection.toggleEditMode}
          />
        </TestCaseHeader>

        {bulkSelection.isEditMode && bulkSelection.selectedCount > 0 && (
          <BulkSelectToolbar
            selectedCount={bulkSelection.selectedCount}
            onCancel={bulkSelection.toggleEditMode}
            onEdit={() => setIsBulkEditOpen(true)}
            onMove={() => {}}
            onDelete={() => setIsBulkDeleteOpen(true)}
            onArchive={() => {}}
            onAddToSet={() => {}}
            onAddToCycle={() => {}}
          />
        )}

        <div className="flex-1 overflow-auto">
          <TestCaseList
            testCases={filteredTestCases}
            loading={loadingTestCases}
          />
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateTestCaseModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          folders={foldersData || []}
        />
      )}

      {isCreateFolderModalOpen && (
        <CreateFolderModal
          isOpen={isCreateFolderModalOpen}
          onClose={() => setIsCreateFolderModalOpen(false)}
          folders={foldersData || []}
          entityType="test_cases"
        />
      )}

      <BulkEditModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedCount={bulkSelection.selectedCount}
        onSubmit={async (request) => {
          await caseOperations.bulkEdit({ ...request, case_ids: bulkSelection.getSelectedIds() });
          bulkSelection.deselectAll();
        }}
      />

      <BulkDeleteModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        selectedCount={bulkSelection.selectedCount}
        onConfirm={async (cascadeDelete) => {
          await caseOperations.bulkDelete({
            case_ids: bulkSelection.getSelectedIds(),
            confirmation_text: 'DELETE',
            cascade_delete_executions: cascadeDelete
          });
          bulkSelection.deselectAll();
        }}
      />
    </div>
  );
};
