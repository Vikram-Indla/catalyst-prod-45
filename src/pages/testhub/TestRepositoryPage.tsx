/**
 * Test Repository Page — TestHub Module
 * Route: /testhub/repository
 * 
 * Full database-wired page for managing test cases and folders.
 * Uses tm_folders and tm_test_cases tables via existing hooks.
 */

import { useState, useMemo } from 'react';
import { FolderTree, Plus, Search, Filter, LayoutGrid, List, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Skeleton } from '@/components/ui/skeleton';

// Default project for demo - uses project with existing test data
const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

export default function TestRepositoryPage() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null);
  
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
    <div className="flex h-full overflow-hidden bg-surface-1">
      {/* Left Panel - Folder Tree */}
      <aside className="w-72 flex-shrink-0 border-r border-border bg-surface-2 flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Folders</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => handleOpenCreateFolder()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-2">
          {foldersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
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

      {/* Main Content - Test Cases */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 border-b border-border bg-surface-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-text-primary">Test Repository</h1>
              <p className="text-sm text-text-secondary mt-1">
                {totalCases} test case{totalCases !== 1 ? 's' : ''} 
                {selectedFolderId ? ' in selected folder' : ' total'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Test Case
              </Button>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search test cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Cases Table */}
        <div className="flex-1 overflow-auto p-6">
          {casesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FolderTree className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No test cases found</h3>
              <p className="text-sm text-text-secondary mb-4">
                {selectedFolderId 
                  ? 'This folder is empty. Create a test case to get started.'
                  : 'Create your first test case to start building your test repository.'}
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Test Case
              </Button>
            </div>
          ) : (
            <TestHubCasesTable 
              cases={cases} 
              projectId={projectId}
              onRefresh={refetchCases}
            />
          )}
        </div>
      </main>

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        projectId={projectId}
        parentFolderId={createFolderParentId}
      />
    </div>
  );
}
