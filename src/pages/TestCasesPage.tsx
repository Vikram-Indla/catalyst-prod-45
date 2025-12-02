import React, { useState } from 'react';
import { FolderPanel } from '@/components/test-management/FolderPanel';
import { CreateFolderModal } from '@/components/test-management/CreateFolderModal';
import { TestCaseHeader } from '@/components/test-management/TestCaseHeader';
import { TestCaseList } from '@/components/test-management/TestCaseList';
import { CreateTestCaseModal } from '@/components/test-management/CreateTestCaseModal';
import { useTestCases, useTestFolders } from '@/hooks/useTestManagement';

export const TestCasesPage: React.FC = () => {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    testType: '',
    search: ''
  });

  const { data: testCasesData, isLoading: loadingTestCases } = useTestCases(selectedFolder || undefined);
  const { data: foldersData } = useTestFolders();

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
        />

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
    </div>
  );
};
