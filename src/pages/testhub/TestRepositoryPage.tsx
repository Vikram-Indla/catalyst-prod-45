/**
 * Test Repository Page — TestHub Module
 * Route: /testhub/repository
 * 
 * Full database-wired page using CATALYST V10 ring-fenced design system.
 * Uses tm_folders and tm_test_cases tables via existing hooks.
 */

import '@/styles/testhub.css';

import { useState, useMemo } from 'react';
import { FolderTree, Plus, Search, Filter, LayoutGrid, List, RefreshCw, ChevronLeft, ChevronRight, Folder } from 'lucide-react';
import { 
  useFoldersWithCounts, 
  useTestCases, 
  useCreateFolder,
  useDeleteFolder,
  useUpdateFolder,
} from '@/hooks/test-management';
import { TestHubFolderTree } from '@/components/testhub/TestHubFolderTree';
import { TestHubCasesTable } from '@/components/testhub/TestHubCasesTable';
import { CreateFolderDialog } from '@/components/releases/test-cases/CreateFolderDialog';
import { CreateTestCaseModal } from '@/components/testhub/CreateTestCaseModal';
import { cn } from '@/lib/utils';

// Default project for demo - uses project with existing test data
const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

export default function TestRepositoryPage() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null);
  const [createTestCaseOpen, setCreateTestCaseOpen] = useState(false);
  const [folderPanelCollapsed, setFolderPanelCollapsed] = useState(false);
  
  const projectId = DEFAULT_PROJECT_ID;
  
  // Fetch folders with counts
  const { 
    data: folders = [], 
    isLoading: foldersLoading,
    refetch: refetchFolders,
  } = useFoldersWithCounts(projectId);
  
  // Fetch test cases with filters
  const { 
    data: casesData,
    isLoading: casesLoading,
    refetch: refetchCases,
  } = useTestCases(projectId, {
    folder_id: selectedFolderId || undefined,
    search: searchQuery || undefined,
    page: 1,
    per_page: 50,
  });

  const cases = casesData?.cases || [];
  const totalCases = casesData?.total || 0;

  // Folder mutations
  const createFolderMutation = useCreateFolder();
  const deleteFolderMutation = useDeleteFolder();
  const updateFolderMutation = useUpdateFolder();

  // Calculate folder counts for tree display
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    folders.forEach(f => {
      counts[f.id] = f.case_count || 0;
    });
    return counts;
  }, [folders]);

  // Handle folder selection
  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId);
  };

  // Handle folder creation
  const handleCreateFolder = async (name: string, parentId: string | null) => {
    await createFolderMutation.mutateAsync({
      project_id: projectId,
      name,
      parent_id: parentId,
    });
    setCreateFolderOpen(false);
    setCreateFolderParentId(null);
  };

  // Handle folder deletion
  const handleDeleteFolder = async (folderId: string) => {
    await deleteFolderMutation.mutateAsync({
      id: folderId,
      project_id: projectId,
    });
    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
    }
  };

  // Handle folder rename
  const handleRenameFolder = async (folderId: string, newName: string) => {
    await updateFolderMutation.mutateAsync({
      id: folderId,
      project_id: projectId,
      name: newName,
    });
  };

  // Refresh all data
  const handleRefresh = () => {
    refetchFolders();
    refetchCases();
  };

  // Open create folder dialog with optional parent
  const handleOpenCreateFolder = (parentId?: string) => {
    setCreateFolderParentId(parentId || null);
    setCreateFolderOpen(true);
  };

  return (
    <div className="testhub th-page">
      {/* Page Header */}
      <header className="th-page-header">
        <div>
          <h1 className="th-page-title">Test Repository</h1>
          <p className="text-sm" style={{ color: 'var(--th-text-muted)', marginTop: '4px' }}>
            {totalCases} test case{totalCases !== 1 ? 's' : ''} 
            {selectedFolderId ? ' in selected folder' : ' total'}
          </p>
        </div>
        <div className="th-page-actions">
          <button className="th-btn-secondary" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button className="th-btn-primary" onClick={() => setCreateTestCaseOpen(true)}>
            <Plus className="h-4 w-4" />
            New Test Case
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="th-page-content">
        {/* Collapsed Folder Strip */}
        <div className={cn('th-folder-strip', folderPanelCollapsed && 'visible')}>
          <button 
            className="th-folder-expand-btn"
            onClick={() => setFolderPanelCollapsed(false)}
            title="Expand folders"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button 
            className="th-folder-expand-btn"
            style={{ marginTop: '8px', color: 'var(--th-warning)' }}
            title={`${folders.length} folders`}
          >
            <Folder className="h-4 w-4" />
          </button>
        </div>

        {/* Folder Panel */}
        <aside className={cn('th-folder-panel', folderPanelCollapsed && 'collapsed')}>
          <div className="th-folder-header">
            <h3>
              <FolderTree className="h-4 w-4 inline mr-2" style={{ color: 'var(--th-primary)' }} />
              Folders
            </h3>
            <div className="th-folder-actions">
              <button 
                className="th-btn-icon th-btn-icon-sm"
                onClick={() => handleOpenCreateFolder()}
                title="Create folder"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button 
                className="th-btn-icon th-btn-icon-sm"
                onClick={() => setFolderPanelCollapsed(true)}
                title="Collapse panel"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {foldersLoading ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--th-text-muted)' }}>
                Loading folders...
              </div>
            ) : (
              <TestHubFolderTree
                folders={folders}
                selectedFolderId={selectedFolderId}
                folderCounts={folderCounts}
                onSelect={handleFolderSelect}
                onCreateFolder={handleOpenCreateFolder}
                onDeleteFolder={handleDeleteFolder}
                onRenameFolder={handleRenameFolder}
              />
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="th-main-area">
          {/* Toolbar */}
          <div className="th-toolbar">
            <div className="th-input-wrapper" style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <Search className="th-input-icon" />
              <input
                type="text"
                className="th-input th-input-with-icon"
                placeholder="Search test cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="th-btn-secondary">
              <Filter className="h-4 w-4" />
              Filters
            </button>
            <div style={{ display: 'flex', border: '1px solid var(--th-border)', borderRadius: 'var(--th-radius)' }}>
              <button
                className={cn('th-btn-icon', viewMode === 'table' && 'selected')}
                style={{ 
                  borderRadius: 'var(--th-radius) 0 0 var(--th-radius)',
                  background: viewMode === 'table' ? 'var(--th-primary-active-bg)' : undefined,
                  color: viewMode === 'table' ? 'var(--th-primary)' : undefined,
                }}
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                className={cn('th-btn-icon', viewMode === 'grid' && 'selected')}
                style={{ 
                  borderRadius: '0 var(--th-radius) var(--th-radius) 0',
                  background: viewMode === 'grid' ? 'var(--th-primary-active-bg)' : undefined,
                  color: viewMode === 'grid' ? 'var(--th-primary)' : undefined,
                }}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="th-table-container">
            {casesLoading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--th-text-muted)' }}>
                Loading test cases...
              </div>
            ) : cases.length === 0 ? (
              <div className="th-empty-state">
                <FolderTree className="th-empty-icon" />
                <h3 className="th-empty-title">No test cases found</h3>
                <p className="th-empty-desc">
                  {selectedFolderId 
                    ? 'This folder is empty. Create a test case to get started.'
                    : 'Create your first test case to start building your test repository.'}
                </p>
                <button 
                  className="th-btn-primary" 
                  style={{ marginTop: '16px' }}
                  onClick={() => setCreateTestCaseOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Create Test Case
                </button>
              </div>
            ) : (
              <TestHubCasesTable 
                cases={cases} 
                projectId={projectId}
                onRefresh={refetchCases}
              />
            )}
          </div>
        </div>
      </div>

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        projectId={projectId}
        parentFolderId={createFolderParentId}
      />

      {/* Create Test Case Modal */}
      <CreateTestCaseModal
        isOpen={createTestCaseOpen}
        onClose={() => setCreateTestCaseOpen(false)}
        onSave={async (data) => {
          // TODO: Integrate with useCreateTestCase mutation
          console.log('Creating test case:', data);
          refetchCases();
        }}
        folders={folders.map(f => ({ id: f.id, name: f.name }))}
        selectedFolderId={selectedFolderId || undefined}
      />
    </div>
  );
}
