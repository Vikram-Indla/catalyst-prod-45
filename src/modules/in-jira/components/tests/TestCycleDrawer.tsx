/**
 * Test Cycle Drawer
 * View/edit cycle details, settings, and manage scope
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  PlayCircle,
  Settings,
  History,
  Lock,
  Unlock,
  Save,
  Loader2,
  Trash2,
  Plus,
  Calendar,
  FileText,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TestCycleWithStats, UpdateTestCycleInput } from '../../hooks/useTestCycles';
import { AddCasesToCycleModal } from './AddCasesToCycleModal';

interface TestCycleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCycle: TestCycleWithStats | null;
  onUpdate: (input: UpdateTestCycleInput) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onLockToggle: (locked: boolean) => Promise<void>;
  isUpdating?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  isTeamLead?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'aborted', label: 'Aborted' },
];

const ENVIRONMENT_OPTIONS = [
  'Development',
  'QA',
  'Staging',
  'UAT',
  'Production',
];

export function TestCycleDrawer({
  open,
  onOpenChange,
  testCycle,
  onUpdate,
  onArchive,
  onLockToggle,
  isUpdating,
  canEdit,
  canDelete,
  isTeamLead,
}: TestCycleDrawerProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [addCasesOpen, setAddCasesOpen] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editEnvironment, setEditEnvironment] = useState('');
  const [editBuildVersion, setEditBuildVersion] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editAutoClose, setEditAutoClose] = useState(false);

  // Fetch activity history
  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['test-cycle-history', testCycle?.id],
    queryFn: async () => {
      if (!testCycle) return [];
      const { data, error } = await supabase
        .from('test_activity_log')
        .select('*')
        .eq('entity_type', 'test_cycle')
        .eq('entity_id', testCycle.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!testCycle?.id && activeTab === 'history' && open,
  });

  // Fetch execution summary
  const { data: executionSummary } = useQuery({
    queryKey: ['cycle-execution-summary', testCycle?.id],
    queryFn: async () => {
      if (!testCycle) return null;
      const { data, error } = await supabase
        .from('test_cycle_executions')
        .select('status, assigned_to')
        .eq('cycle_id', testCycle.id);
      if (error) throw error;
      
      const total = data?.length || 0;
      const passed = data?.filter(e => e.status === 'passed').length || 0;
      const failed = data?.filter(e => e.status === 'failed').length || 0;
      const blocked = data?.filter(e => e.status === 'blocked').length || 0;
      const notRun = data?.filter(e => e.status === 'not_run' || !e.status).length || 0;
      const assigned = data?.filter(e => e.assigned_to).length || 0;
      
      return { total, passed, failed, blocked, notRun, assigned };
    },
    enabled: !!testCycle?.id && open,
  });

  const handleStartEdit = () => {
    if (!testCycle) return;
    setEditName(testCycle.name);
    setEditObjective(testCycle.objective || '');
    setEditStatus(testCycle.status || 'not_started');
    setEditEnvironment(testCycle.environment || '');
    setEditBuildVersion(testCycle.build_version || '');
    setEditStartDate(testCycle.start_date || '');
    setEditEndDate(testCycle.end_date || '');
    setEditAutoClose(testCycle.auto_close_on_completion || false);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!testCycle) return;
    await onUpdate({
      id: testCycle.id,
      name: editName,
      objective: editObjective || undefined,
      status: editStatus,
      environment: editEnvironment || undefined,
      build_version: editBuildVersion || undefined,
      start_date: editStartDate || undefined,
      end_date: editEndDate || undefined,
      auto_close_on_completion: editAutoClose,
    });
    setIsEditing(false);
  };

  const handleArchive = async () => {
    if (!testCycle) return;
    await onArchive(testCycle.id);
    setArchiveDialogOpen(false);
    onOpenChange(false);
  };

  const progressPercent = executionSummary 
    ? executionSummary.total > 0 
      ? Math.round(((executionSummary.passed + executionSummary.failed + executionSummary.blocked) / executionSummary.total) * 100)
      : 0
    : 0;

  if (!testCycle) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b border-border-default">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <SheetTitle className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-accent-primary shrink-0" />
                  <span className="truncate">{testCycle.name}</span>
                  {testCycle.scope_locked && (
                    <Badge variant="secondary" className="text-status-warning ml-2">
                      <Lock className="h-3 w-3 mr-1" />Locked
                    </Badge>
                  )}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">{testCycle.key}</Badge>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {testCycle.status?.replace('_', ' ') || 'not started'}
                  </Badge>
                  {testCycle.environment && (
                    <Badge variant="outline" className="text-xs">{testCycle.environment}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isTeamLead && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onLockToggle(!testCycle.scope_locked)}
                    disabled={isUpdating}
                  >
                    {testCycle.scope_locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </Button>
                )}
                {canEdit && (
                  isEditing ? (
                    <Button size="sm" onClick={handleSaveEdit} disabled={isUpdating}>
                      {isUpdating && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      Save
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={handleStartEdit}>
                      Edit
                    </Button>
                  )
                )}
              </div>
            </div>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 justify-start">
              <TabsTrigger value="overview" className="gap-1.5">
                <PlayCircle className="h-3.5 w-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5">
                <History className="h-3.5 w-3.5" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="flex-1 overflow-auto m-0 px-6 py-4">
              <div className="space-y-6">
                {/* Progress Summary */}
                <div className="p-4 bg-surface-2 rounded-lg border border-border-default">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-text-primary">Execution Progress</span>
                    <span className="text-sm text-text-secondary">{progressPercent}% complete</span>
                  </div>
                  <Progress value={progressPercent} className="h-2 mb-4" />
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="p-2 bg-surface-3 rounded">
                      <p className="font-semibold text-lg">{executionSummary?.total || 0}</p>
                      <p className="text-xs text-text-quaternary">Total</p>
                    </div>
                    <div className="p-2 bg-status-success/10 rounded">
                      <p className="font-semibold text-lg text-status-success">{executionSummary?.passed || 0}</p>
                      <p className="text-xs">Passed</p>
                    </div>
                    <div className="p-2 bg-status-error/10 rounded">
                      <p className="font-semibold text-lg text-status-error">{executionSummary?.failed || 0}</p>
                      <p className="text-xs">Failed</p>
                    </div>
                    <div className="p-2 bg-status-warning/10 rounded">
                      <p className="font-semibold text-lg text-status-warning">{executionSummary?.blocked || 0}</p>
                      <p className="text-xs">Blocked</p>
                    </div>
                    <div className="p-2 bg-surface-3 rounded">
                      <p className="font-semibold text-lg">{executionSummary?.notRun || 0}</p>
                      <p className="text-xs text-text-quaternary">Pending</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                {canEdit && !testCycle.scope_locked && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setAddCasesOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Cases
                    </Button>
                  </div>
                )}

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-text-tertiary text-xs">Objective</Label>
                    <p className="text-sm text-text-primary mt-1">
                      {testCycle.objective || 'No objective specified'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-text-tertiary text-xs">Environment</Label>
                      <p className="text-sm text-text-primary mt-1">
                        {testCycle.environment || '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-text-tertiary text-xs">Build Version</Label>
                      <p className="text-sm text-text-primary mt-1">
                        {testCycle.build_version || '-'}
                      </p>
                    </div>
                  </div>

                  {(testCycle.start_date || testCycle.end_date) && (
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Calendar className="h-4 w-4" />
                      {testCycle.start_date && format(new Date(testCycle.start_date), 'MMM d, yyyy')}
                      {testCycle.end_date && ` - ${format(new Date(testCycle.end_date), 'MMM d, yyyy')}`}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-text-tertiary">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      {executionSummary?.total || 0} cases
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {executionSummary?.assigned || 0} assigned
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="flex-1 overflow-auto m-0 px-6 py-4">
              <div className="space-y-6">
                {isEditing ? (
                  <>
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label>Objective</Label>
                      <Textarea
                        value={editObjective}
                        onChange={e => setEditObjective(e.target.value)}
                        className="mt-1.5 min-h-[80px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Status</Label>
                        <Select value={editStatus} onValueChange={setEditStatus}>
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Environment</Label>
                        <Select value={editEnvironment} onValueChange={setEditEnvironment}>
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select environment" />
                          </SelectTrigger>
                          <SelectContent>
                            {ENVIRONMENT_OPTIONS.map(env => (
                              <SelectItem key={env} value={env}>
                                {env}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Build Version</Label>
                      <Input
                        value={editBuildVersion}
                        onChange={e => setEditBuildVersion(e.target.value)}
                        placeholder="e.g., v1.2.3"
                        className="mt-1.5"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={editStartDate}
                          onChange={e => setEditStartDate(e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={editEndDate}
                          onChange={e => setEditEndDate(e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg border border-border-default">
                      <div>
                        <Label>Auto-close on completion</Label>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          Automatically mark as completed when all cases are executed
                        </p>
                      </div>
                      <Switch
                        checked={editAutoClose}
                        onCheckedChange={setEditAutoClose}
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-surface-2 rounded-lg">
                        <p className="text-xs text-text-tertiary mb-1">Status</p>
                        <Badge variant="secondary" className="capitalize">
                          {testCycle.status?.replace('_', ' ') || 'not started'}
                        </Badge>
                      </div>
                      <div className="p-3 bg-surface-2 rounded-lg">
                        <p className="text-xs text-text-tertiary mb-1">Scope</p>
                        <Badge variant={testCycle.scope_locked ? 'secondary' : 'outline'}>
                          {testCycle.scope_locked ? 'Locked' : 'Open'}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3 bg-surface-2 rounded-lg">
                      <p className="text-xs text-text-tertiary mb-1">Auto-close on completion</p>
                      <p className="text-sm font-medium">
                        {testCycle.auto_close_on_completion ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                )}

                {canDelete && (
                  <div className="pt-4 border-t border-border-default">
                    <Button
                      variant="destructive"
                      onClick={() => setArchiveDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Archive Cycle
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 overflow-hidden m-0 px-6 py-4">
              <ScrollArea className="h-full">
                {loadingHistory ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : history?.length === 0 ? (
                  <div className="text-center py-12 text-text-tertiary">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No activity recorded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history?.map(entry => (
                      <div
                        key={entry.id}
                        className="p-3 bg-surface-2 rounded-lg border border-border-default"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs capitalize">
                            {entry.activity_type?.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-text-quaternary">
                            {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                        {entry.description && (
                          <p className="text-sm text-text-secondary">{entry.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Add Cases Modal */}
      <AddCasesToCycleModal
        open={addCasesOpen}
        onOpenChange={setAddCasesOpen}
        cycleId={testCycle.id}
        cycleName={testCycle.name}
        programId={testCycle.program_id || ''}
        isScopeLocked={testCycle.scope_locked || false}
      />

      {/* Archive Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Test Cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive "{testCycle.name}" and hide it from the active view.
              Archived cycles can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-status-error text-white hover:bg-status-error/90">
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
