/**
 * CATALYST TESTS - Test Sets Page
 * Manages test sets with folder organization
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FolderKanban, TestTube } from 'lucide-react';
import { FolderPanel } from '@/components/test-management/FolderPanel';
import { CreateFolderModal } from '@/components/test-management/CreateFolderModal';
import { useTestFolders } from '@/hooks/useTestManagement';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';

export const TestSetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { programId } = useParams<{ programId: string }>();
  const [selectedFolder, setSelectedFolder] = useState<string | undefined>();
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { data: foldersData } = useTestFolders();

  // Fetch test sets
  const { data: testSets = [], isLoading } = useQuery({
    queryKey: ['test-sets', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_sets')
        .select('id, name, description, program_id, created_at, created_by')
        .eq('program_id', programId!)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!programId,
  });

  const handleSetClick = (setId: string) => {
    navigate(`/programs/${programId}/tests/sets/${setId}`);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Folder Sidebar - hidden on mobile */}
      <div className={`hidden lg:block ${isSidebarCollapsed ? 'w-16' : 'w-[300px]'} transition-all duration-300 flex-shrink-0 border-r border-border`}>
        <FolderPanel
          entityType="test_sets"
          folders={foldersData || []}
          selectedFolderId={selectedFolder}
          onFolderSelect={setSelectedFolder}
          onCreateFolder={() => setIsCreateFolderModalOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="border-b bg-card px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold">Test Sets</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Organize and manage test case collections
              </p>
            </div>
            <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm" onClick={() => navigate(`/programs/${programId}/tests/sets/create`)}>
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Set</span>
              <span className="sm:hidden ml-1">Create</span>
            </Button>
          </div>
        </div>

        {/* Test Sets Grid */}
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Loading test sets...</div>
            </div>
          ) : testSets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FolderKanban className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No test sets found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first test set to organize test cases
              </p>
              <Button onClick={() => navigate(`/programs/${programId}/tests/sets/create`)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Test Set
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testSets.map((set: any) => (
                <Card
                  key={set.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleSetClick(set.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-5 w-5 text-brand-gold" />
                        <h3 className="font-semibold text-lg line-clamp-1">{set.name}</h3>
                      </div>
                    </div>
                    
                    {set.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {set.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TestTube className="h-4 w-4" />
                        <span>Test set</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        folders={foldersData || []}
        entityType="test_sets"
      />
    </div>
  );
};