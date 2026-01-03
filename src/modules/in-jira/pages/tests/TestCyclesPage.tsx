/**
 * Test Cycles Page - Execution Orchestration Hub
 * Full CRUD with bulk actions, folder tree, and drawer
 */

import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  Plus, Search, MoreHorizontal, PlayCircle, Calendar, Lock, Unlock, Users, BarChart3, 
  Archive, Settings, ChevronLeft, UserPlus, Copy, Trash2, CheckSquare, FolderInput
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTestCycles, TestCycleWithStats } from '../../hooks/useTestCycles';
import { useTestCycleBulkOperations } from '../../hooks/useTestCycleBulkOperations';
import { useCycleExecutions, ExecutionStatus } from '../../hooks/useCycleExecutions';
import { useCycleBoardConfig } from '../../hooks/useCycleBoardConfig';
import { CreateTestCycleModal } from '../../components/tests/CreateTestCycleModal';
import { CycleExecutionBoard } from '../../components/tests/CycleExecutionBoard';
import { CycleBoardSettings } from '../../components/tests/CycleBoardSettings';
import { BulkAssignDialog } from '../../components/tests/BulkAssignDialog';
import { TestCycleDrawer } from '../../components/tests/TestCycleDrawer';
import { AddCasesToCycleModal } from '../../components/tests/AddCasesToCycleModal';
import { FolderTree } from '../../components/tests/FolderTree';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function TestCyclesPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const programId = searchParams.get('programId');
  const cycleId = searchParams.get('cycleId');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [selectedExecutions, setSelectedExecutions] = useState<Set<string>>(new Set());
  const [detailTab, setDetailTab] = useState('board');
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<TestCycleWithStats | null>(null);
  const [addCasesOpen, setAddCasesOpen] = useState(false);

  // Bulk selection state
  const [selectedCycleIds, setSelectedCycleIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const { 
    testCycles, isLoading: loadingCycles, canCreate, canEdit, canDelete, 
    createTestCycle, updateTestCycle, archiveTestCycle, isCreating, isUpdating 
  } = useTestCycles(programId);
  
  const {
    bulkCopy, bulkArchive, bulkDelete,
    isCopying, isArchiving, isDeleting,
  } = useTestCycleBulkOperations();

  const { 
    cycle, 
    executionsByStatus, 
    workloadByUser, 
    isLoading: loadingExecutions, 
    canEdit: canEditExec, 
    isTeamLead, 
    isScopeLocked, 
    updateStatus, 
    assignExecution, 
    bulkAssign, 
    toggleLock, 
    isUpdating: isUpdatingExec 
  } = useCycleExecutions(cycleId, programId);
  
  const { columns, saveColumns, isSaving } = useCycleBoardConfig(programId);

  // Fetch team members for assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-for-assign', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const filteredCycles = useMemo(() => 
    testCycles.filter(c => {
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (selectedFolderId && c.folder_id !== selectedFolderId) return false;
      return true;
    }), 
    [testCycles, searchQuery, statusFilter, selectedFolderId]
  );

  const openCycleDetail = (c: TestCycleWithStats) => { 
    setSearchParams({ programId: programId || '', cycleId: c.id }); 
  };
  
  const closeCycleDetail = () => { 
    setSearchParams({ programId: programId || '' }); 
    setSelectedExecutions(new Set()); 
  };

  const openDrawer = (c: TestCycleWithStats) => {
    setSelectedCycle(c);
    setDrawerOpen(true);
  };
  
  const getProgressPercent = (c: TestCycleWithStats) => 
    c.total_cases === 0 ? 0 : Math.round(((c.passed + c.failed + c.blocked) / c.total_cases) * 100);

  const handleBulkAssign = async (userId: string | null) => {
    await bulkAssign({ executionIds: Array.from(selectedExecutions), userId });
    setSelectedExecutions(new Set());
  };

  const toggleCycleSelection = (cycleId: string) => {
    setSelectedCycleIds(prev => {
      const next = new Set(prev);
      if (next.has(cycleId)) {
        next.delete(cycleId);
      } else {
        next.add(cycleId);
      }
      return next;
    });
  };

  const selectAllCycles = () => {
    setSelectedCycleIds(new Set(filteredCycles.map(c => c.id)));
  };

  const clearCycleSelection = () => {
    setSelectedCycleIds(new Set());
  };

  const handleBulkCopy = async () => {
    if (selectedCycleIds.size === 0) return;
    await bulkCopy({ cycleIds: Array.from(selectedCycleIds), targetFolderId: selectedFolderId });
    clearCycleSelection();
  };

  const handleBulkArchive = async () => {
    if (selectedCycleIds.size === 0) return;
    await bulkArchive({ cycleIds: Array.from(selectedCycleIds) });
    clearCycleSelection();
  };

  const handleBulkDelete = async () => {
    if (selectedCycleIds.size === 0) return;
    await bulkDelete({ cycleIds: Array.from(selectedCycleIds) });
    clearCycleSelection();
    setBulkDeleteDialogOpen(false);
  };

  const isAnyBulkLoading = isCopying || isArchiving || isDeleting;

  // Detail View (when a cycle is selected)
  if (cycleId) {
    return (
      <div className="h-full flex flex-col bg-surface-1">
        <div className="px-6 py-4 border-b border-border-default">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={closeCycleDetail}>
              <ChevronLeft className="h-4 w-4 mr-1" />Back
            </Button>
            <span className="text-sm text-text-tertiary">{projectKey} / Tests / Cycles</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-text-primary">{cycle?.name || 'Loading...'}</h1>
              {cycle && <Badge variant="outline">{cycle.key}</Badge>}
              {isScopeLocked && (
                <Badge variant="secondary" className="text-status-warning">
                  <Lock className="h-3 w-3 mr-1" />Locked
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isScopeLocked && canEditExec && (
                <Button variant="outline" size="sm" onClick={() => setAddCasesOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />Add Cases
                </Button>
              )}
              {selectedExecutions.size > 0 && (
                <Button variant="outline" size="sm" onClick={() => setBulkAssignOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Assign ({selectedExecutions.size})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4 mr-1" />Board Settings
              </Button>
              {isTeamLead && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => toggleLock(!isScopeLocked)} 
                  disabled={isUpdatingExec}
                >
                  {isScopeLocked ? <Unlock className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                  {isScopeLocked ? 'Unlock' : 'Lock'} Scope
                </Button>
              )}
            </div>
          </div>
          {cycle?.environment && (
            <div className="flex items-center gap-3 mt-2 text-sm text-text-secondary">
              <span>Environment: <strong>{cycle.environment}</strong></span>
              {cycle.build_version && <span>Build: <strong>{cycle.build_version}</strong></span>}
              {cycle.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(cycle.start_date), 'MMM d')} 
                  {cycle.end_date && ` - ${format(new Date(cycle.end_date), 'MMM d')}`}
                </span>
              )}
            </div>
          )}
        </div>

        <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b border-border-default">
            <TabsList>
              <TabsTrigger value="board">
                <BarChart3 className="h-3.5 w-3.5 mr-1" />Board
              </TabsTrigger>
              <TabsTrigger value="workload">
                <Users className="h-3.5 w-3.5 mr-1" />Workload
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="board" className="flex-1 overflow-hidden m-0 p-6">
            {loadingExecutions ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <CycleExecutionBoard 
                executionsByStatus={executionsByStatus} 
                columns={columns}
                onStatusChange={(id, s) => updateStatus({ executionId: id, status: s })} 
                onAssign={(id, u) => assignExecution({ executionId: id, userId: u })} 
                selectedIds={selectedExecutions} 
                onSelectionChange={setSelectedExecutions} 
                canEdit={canEditExec} 
                isScopeLocked={isScopeLocked} 
              />
            )}
          </TabsContent>

          <TabsContent value="workload" className="flex-1 overflow-auto m-0 p-6">
            {workloadByUser.length === 0 ? (
              <div className="text-center py-12 text-text-tertiary">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No assignments yet</p>
                <p className="text-sm mt-1">Assign testers to executions from the Board tab</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workloadByUser.map(w => (
                  <Card key={w.userId} className="bg-surface-2">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{w.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-text-primary">{w.userName}</p>
                          <p className="text-sm text-text-tertiary">{w.total} assigned</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 bg-surface-3 rounded">
                          <p className="font-semibold text-text-secondary">{w.notRun}</p>
                          <p className="text-[10px] text-text-quaternary">Pending</p>
                        </div>
                        <div className="p-2 bg-status-success/10 rounded">
                          <p className="font-semibold text-status-success">{w.passed}</p>
                          <p className="text-[10px]">Passed</p>
                        </div>
                        <div className="p-2 bg-status-error/10 rounded">
                          <p className="font-semibold text-status-error">{w.failed}</p>
                          <p className="text-[10px]">Failed</p>
                        </div>
                        <div className="p-2 bg-surface-3 rounded">
                          <p className="font-semibold text-text-secondary">
                            {w.total > 0 ? Math.round(((w.passed + w.failed) / w.total) * 100) : 0}%
                          </p>
                          <p className="text-[10px]">Done</p>
                        </div>
                      </div>
                      <Progress 
                        value={w.total > 0 ? ((w.passed + w.failed) / w.total) * 100 : 0} 
                        className="h-1.5 mt-3" 
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <CycleBoardSettings
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          columns={columns}
          onSave={saveColumns}
          isSaving={isSaving}
        />

        <BulkAssignDialog
          open={bulkAssignOpen}
          onOpenChange={setBulkAssignOpen}
          selectedCount={selectedExecutions.size}
          teamMembers={teamMembers}
          onAssign={handleBulkAssign}
        />

        {cycle && (
          <AddCasesToCycleModal
            open={addCasesOpen}
            onOpenChange={setAddCasesOpen}
            cycleId={cycle.id}
            cycleName={cycle.name}
            programId={programId || ''}
            isScopeLocked={isScopeLocked}
          />
        )}
      </div>
    );
  }

  // List View
  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-default">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">Test Cycles</h1>
          <div className="flex items-center gap-2">
            {selectedCycleIds.size > 0 && (
              <div className="flex items-center gap-2 mr-4">
                <Badge variant="secondary">{selectedCycleIds.size} selected</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkCopy}
                  disabled={isAnyBulkLoading}
                >
                  <Copy className="h-4 w-4 mr-1.5" />Copy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkArchive}
                  disabled={isAnyBulkLoading}
                >
                  <Archive className="h-4 w-4 mr-1.5" />Archive
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  disabled={isAnyBulkLoading}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={clearCycleSelection}>
                  Clear
                </Button>
              </div>
            )}
            {canCreate && (
              <Button size="sm" onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />Create Cycle
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-border-default flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
          <Input placeholder="Search cycles..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        {filteredCycles.length > 0 && (
          <Button size="sm" variant="ghost" onClick={selectAllCycles}>
            <CheckSquare className="h-4 w-4 mr-1.5" />Select All
          </Button>
        )}
      </div>

      {/* Content with Folder Tree */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <FolderTree
            programId={programId}
            entityType="test_cycles"
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={80}>
          <div className="h-full overflow-auto p-6">
            {loadingCycles ? (
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
              </div>
            ) : filteredCycles.length === 0 ? (
              <div className="text-center py-16">
                <PlayCircle className="h-12 w-12 mx-auto mb-3 text-text-quaternary" />
                <p className="text-text-secondary">No test cycles found</p>
                {canCreate && (
                  <Button className="mt-4" onClick={() => setCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />Create Cycle
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCycles.map(c => (
                  <Card 
                    key={c.id} 
                    className={cn(
                      'bg-surface-2 hover:border-border-hover cursor-pointer transition-colors',
                      selectedCycleIds.has(c.id) && 'ring-2 ring-accent-primary'
                    )}
                    onClick={() => openCycleDetail(c)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedCycleIds.has(c.id)}
                              onCheckedChange={() => toggleCycleSelection(c.id)}
                            />
                          </div>
                          <PlayCircle className="h-5 w-5 text-accent-primary" />
                          <CardTitle className="text-base line-clamp-1">{c.name}</CardTitle>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={e => { e.stopPropagation(); openCycleDetail(c); }}>
                              Open Cycle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={e => { e.stopPropagation(); openDrawer(c); }}>
                              <Settings className="h-4 w-4 mr-2" />View Details
                            </DropdownMenuItem>
                            {canEdit && (
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); bulkCopy({ cycleIds: [c.id] }); }}>
                                <Copy className="h-4 w-4 mr-2" />Clone
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-status-error" 
                                  onClick={e => { e.stopPropagation(); archiveTestCycle(c.id); }}
                                >
                                  <Archive className="h-4 w-4 mr-2" />Archive
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex gap-2 mt-1 ml-7">
                        <Badge variant="outline" className="text-xs">{c.key}</Badge>
                        <Badge variant="secondary" className="text-xs capitalize">{c.status?.replace('_', ' ') || 'not started'}</Badge>
                        {c.scope_locked && <Lock className="h-3 w-3 text-status-warning" />}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Progress value={getProgressPercent(c)} className="h-1.5 mb-3" />
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-1.5 bg-surface-3 rounded">
                          <p className="font-semibold">{c.total_cases}</p>
                          <p className="text-[10px] text-text-quaternary">Total</p>
                        </div>
                        <div className="p-1.5 bg-status-success/10 rounded">
                          <p className="font-semibold text-status-success">{c.passed}</p>
                          <p className="text-[10px]">Pass</p>
                        </div>
                        <div className="p-1.5 bg-status-error/10 rounded">
                          <p className="font-semibold text-status-error">{c.failed}</p>
                          <p className="text-[10px]">Fail</p>
                        </div>
                        <div className="p-1.5 bg-surface-3 rounded">
                          <p className="font-semibold text-text-secondary">{c.not_run}</p>
                          <p className="text-[10px]">Pending</p>
                        </div>
                      </div>
                      {(c.environment || c.start_date) && (
                        <div className="mt-3 text-xs text-text-quaternary space-y-1">
                          {c.environment && <p>Env: {c.environment}</p>}
                          {c.start_date && (
                            <p className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(c.start_date), 'MMM d')} 
                              {c.end_date && ` - ${format(new Date(c.end_date), 'MMM d')}`}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <CreateTestCycleModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen} 
        programId={programId || ''} 
        onSubmit={async (i) => { await createTestCycle(i); }} 
        isSubmitting={isCreating} 
      />

      <TestCycleDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        testCycle={selectedCycle}
        onUpdate={async (input) => { await updateTestCycle(input); }}
        onArchive={async (id) => { await archiveTestCycle(id); }}
        onLockToggle={async (locked) => {
          if (selectedCycle) {
            await updateTestCycle({ id: selectedCycle.id, scope_locked: locked });
          }
        }}
        isUpdating={isUpdating}
        canEdit={canEdit}
        canDelete={canDelete}
        isTeamLead={isTeamLead}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCycleIds.size} Test Cycles?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected cycles and all associated executions.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-status-error text-white hover:bg-status-error/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TestCyclesPage;
