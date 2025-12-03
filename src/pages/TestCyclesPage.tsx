import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useTestCycles, useTestFolders } from '@/hooks/useTestManagement';
import { CreateCycleModal } from '@/components/test-management/CreateCycleModal';
import { CreateFolderModal } from '@/components/test-management/CreateFolderModal';
import { FolderPanel } from '@/components/test-management/FolderPanel';
import { format } from 'date-fns';

export function TestCyclesPage() {
  const navigate = useNavigate();
  const { programId } = useParams<{ programId: string }>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();
  
  const { data: cycles, isLoading } = useTestCycles();
  const { data: folders = [] } = useTestFolders(programId || '');

  // Cycles display without folder filtering (folder_id not in schema yet)
  const filteredCycles = cycles || [];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planned: { label: 'Planned', className: 'bg-blue-500/10 text-blue-500' },
      in_progress: { label: 'In Progress', className: 'bg-yellow-500/10 text-yellow-500' },
      completed: { label: 'Completed', className: 'bg-green-500/10 text-green-500' },
      cancelled: { label: 'Cancelled', className: 'bg-gray-500/10 text-gray-500' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planned;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const calculateProgress = (cycle: any) => {
    // Mock calculation - will be replaced with actual data
    const total = 10;
    const passed = Math.floor(Math.random() * total);
    const percentage = (passed / total) * 100;
    return { total, passed, percentage };
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="animate-pulse space-y-[var(--s4)] p-[var(--s8)] flex-1">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        {/* Folder Panel - hidden on mobile */}
        <div 
          className="hidden lg:block transition-all duration-300 border-r border-border bg-background flex-shrink-0"
          style={{ 
            width: isSidebarCollapsed ? '64px' : 'var(--sidebar-w)',
            minWidth: isSidebarCollapsed ? '64px' : 'var(--sidebar-w)'
          }}
        >
          <FolderPanel
            entityType="test_cycles"
            folders={folders}
            selectedFolderId={selectedFolderId}
            onFolderSelect={setSelectedFolderId}
            onCreateFolder={() => setIsCreateFolderModalOpen(true)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>

        {/* Main Content with responsive container */}
        <div className="flex-1 overflow-auto min-w-0">
          <div className="container mx-auto px-3 sm:px-[var(--s8)] py-4 sm:py-[var(--s8)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-[var(--s6)] gap-3">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Test Cycles</h1>
                <p className="text-muted-foreground mt-1">
                  Organize and track test execution across sprints and releases
                </p>
              </div>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-brand-gold hover:bg-brand-gold/90 text-background"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Cycle
              </Button>
            </div>

        {filteredCycles.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-[var(--s9)] px-[var(--s4)]">
              <div className="p-[var(--s4)] rounded-full bg-brand-gold/10 mb-[var(--s4)]">
                <Clock className="h-12 w-12 text-brand-gold" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-[var(--s2)]">
                {selectedFolderId ? 'No test cycles in this folder' : 'No test cycles yet'}
              </h3>
              <p className="text-muted-foreground text-center max-w-md mb-[var(--s6)] px-[var(--s4)]">
                {selectedFolderId 
                  ? 'Create a test cycle in this folder or select a different folder'
                  : 'Create your first test cycle to organize test execution and track progress'
                }
              </p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-brand-gold hover:bg-brand-gold/90 text-background"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Test Cycle
              </Button>
            </CardContent>
          </Card>
            ) : (
              <div className="grid gap-[var(--s4)]">
                {filteredCycles.map((cycle: any) => {
              const progress = calculateProgress(cycle);
              return (
                 <Card key={cycle.id} className="border-border hover:border-brand-gold/50 transition-colors">
                  <CardHeader className="pb-[var(--s3)]">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-[var(--s2)]">
                      <div className="flex-1">
                        <CardTitle className="text-xl text-foreground mb-[var(--s2)]">{cycle.name}</CardTitle>
                        {cycle.description && (
                          <CardDescription className="text-sm">{cycle.description}</CardDescription>
                        )}
                      </div>
                      {getStatusBadge(cycle.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-[var(--s4)]">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-[var(--s3)] sm:gap-[var(--s6)] text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(cycle.start_date), 'MMM dd')} - {format(new Date(cycle.end_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{progress.total} test cases</span>
                      </div>
                    </div>

                    <div className="space-y-[var(--s2)]">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold text-foreground">
                          {progress.passed}/{progress.total} passed ({Math.round(progress.percentage)}%)
                        </span>
                      </div>
                      <Progress value={progress.percentage} className="h-2" />
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/programs/${programId}/tests/cycles/${cycle.id}`)}
                        className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
            )}
          </div>
        </div>
      </div>

      <CreateCycleModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        entityType="test_cycles"
        folders={folders}
      />
    </>
  );
}
