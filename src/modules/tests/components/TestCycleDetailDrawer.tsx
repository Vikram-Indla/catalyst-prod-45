/**
 * TEST CYCLE DETAIL DRAWER
 * Full-featured drawer with Scope, Runs, Assignments, Progress tabs
 */

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCcw,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  Package,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  Layers,
  BarChart3,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { runMutationWithAudit, createPipelineContext } from '../lib/actionPipeline';

interface TestCycleDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string | null;
  scopeType: 'program' | 'project' | 'global';
  scopeId: string | null;
  onExecute?: (executionId: string) => void;
}

export function TestCycleDetailDrawer({
  open,
  onOpenChange,
  cycleId,
  scopeType,
  scopeId,
  onExecute,
}: TestCycleDetailDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('scope');

  // Fetch cycle details
  const { data: cycle, isLoading } = useQuery({
    queryKey: ['test-cycle-detail', cycleId],
    queryFn: async () => {
      if (!cycleId) return null;
      const { data, error } = await supabase
        .from('test_cycles')
        .select(`
          *,
          test_cycle_executions(
            id, status, assigned_to, executed_at,
            test_case:test_cases(id, title, priority),
            assigned_user:profiles!test_cycle_executions_assigned_to_fkey(id, full_name)
          ),
          created_by_user:profiles!test_cycles_created_by_fkey(id, full_name)
        `)
        .eq('id', cycleId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!cycleId,
  });

  // Fetch linked sets
  const { data: linkedSets } = useQuery({
    queryKey: ['test-cycle-sets', cycleId],
    queryFn: async () => {
      if (!cycleId) return [];
      const { data, error } = await supabase
        .from('test_cycle_sets')
        .select(`
          id, set_id,
          test_set:test_sets(id, key, name)
        `)
        .eq('cycle_id', cycleId);

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!cycleId,
  });

  // Fetch available test cases for adding
  const { data: availableCases } = useQuery({
    queryKey: ['available-cases-for-cycle', cycleId, scopeType, scopeId],
    queryFn: async () => {
      if (!cycleId) return [];
      
      let query = supabase
        .from('test_cases')
        .select('id, title, priority')
        .is('deleted_at', null)
        .order('title');

      if (scopeType === 'program' && scopeId) {
        query = query.eq('program_id', scopeId);
      } else if (scopeType === 'project' && scopeId) {
        query = query.eq('project_id', scopeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter out already added cases
      const existingIds = new Set(
        cycle?.test_cycle_executions?.map((e: any) => e.test_case?.id) || []
      );
      return (data || []).filter((c: any) => !existingIds.has(c.id));
    },
    enabled: open && !!cycleId && activeTab === 'scope',
  });

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [editEnvironment, setEditEnvironment] = useState('');
  const [editBuildVersion, setEditBuildVersion] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  React.useEffect(() => {
    if (cycle) {
      setEditName(cycle.name || '');
      setEditObjective(cycle.objective || '');
      setEditEnvironment(cycle.environment || '');
      setEditBuildVersion(cycle.build_version || '');
      setEditStatus(cycle.status || 'planned');
      setHasChanges(false);
    }
  }, [cycle]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !cycleId) throw new Error('Invalid state');

      const context = createPipelineContext(user.id, scopeType, scopeId);

      return runMutationWithAudit(
        { name: editName, objective: editObjective, environment: editEnvironment, build_version: editBuildVersion, status: editStatus },
        {
          context,
          action: 'edit',
          entityType: 'test_cycles',
          mutationFn: async (input) => {
            const { error } = await supabase
              .from('test_cycles')
              .update({
                name: input.name.trim(),
                objective: input.objective.trim() || null,
                environment: input.environment.trim() || null,
                build_version: input.build_version.trim() || null,
                status: input.status,
                updated_at: new Date().toISOString(),
              })
              .eq('id', cycleId);

            if (error) throw error;
            return { id: cycleId };
          },
          getAuditInfo: (input) => ({
            entityId: cycleId,
            entityTitle: input.name,
            description: `Updated test cycle "${input.name}"`,
          }),
          activityType: 'updated',
          queryClient,
          invalidateKeys: [
            ['test-cycle-detail', cycleId],
            ['global-test-cycles'],
          ],
          successMessage: 'Test cycle updated',
        }
      );
    },
    onSuccess: () => setHasChanges(false),
  });

  // Add case to cycle mutation
  const addCaseMutation = useMutation({
    mutationFn: async (caseId: string) => {
      if (!user || !cycleId) throw new Error('Invalid state');

      const { error } = await supabase.from('test_cycle_executions').insert({
        cycle_id: cycleId,
        case_id: caseId,
        status: 'not_executed',
        assigned_to: user.id,
      });

      if (error) throw error;

      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: 'cases_added',
        entity_type: 'test_cycles',
        entity_id: cycleId,
        description: 'Added test case to cycle',
      });

      return caseId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycle-detail', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['available-cases-for-cycle'] });
      toast.success('Test case added to cycle');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Remove execution mutation
  const removeExecutionMutation = useMutation({
    mutationFn: async (executionId: string) => {
      if (!user || !cycleId) throw new Error('Invalid state');

      const { error } = await supabase
        .from('test_cycle_executions')
        .delete()
        .eq('id', executionId);

      if (error) throw error;

      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: 'cases_removed',
        entity_type: 'test_cycles',
        entity_id: cycleId,
        description: 'Removed test case from cycle',
      });

      return executionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycle-detail', cycleId] });
      toast.success('Test case removed from cycle');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Assign execution mutation
  const assignMutation = useMutation({
    mutationFn: async ({ executionId, userId }: { executionId: string; userId: string | null }) => {
      const { error } = await supabase
        .from('test_cycle_executions')
        .update({ assigned_to: userId })
        .eq('id', executionId);

      if (error) throw error;
      return executionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycle-detail', cycleId] });
      toast.success('Assignment updated');
    },
  });

  // Calculate stats
  const executions = cycle?.test_cycle_executions || [];
  const total = executions.length;
  const passed = executions.filter((e: any) => e.status === 'passed').length;
  const failed = executions.filter((e: any) => e.status === 'failed').length;
  const blocked = executions.filter((e: any) => e.status === 'blocked').length;
  const notRun = total - passed - failed - blocked;
  const progress = total > 0 ? Math.round(((passed + failed + blocked) / total) * 100) : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle2 className="h-4 w-4 text-status-success" />;
      case 'failed': return <XCircle className="h-4 w-4 text-status-error" />;
      case 'blocked': return <AlertTriangle className="h-4 w-4 text-status-warning" />;
      default: return <Clock className="h-4 w-4 text-text-tertiary" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-status-success bg-status-success/10';
      case 'failed': return 'text-status-error bg-status-error/10';
      case 'blocked': return 'text-status-warning bg-status-warning/10';
      default: return 'text-text-tertiary bg-surface-3';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl bg-surface-1 border-border-default p-0 flex flex-col">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !cycle ? (
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
            <p className="text-text-secondary">Test cycle not found</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <SheetHeader className="p-4 border-b border-border-default">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-accent-subtle rounded-lg shrink-0">
                  <RefreshCcw className="h-5 w-5 text-accent-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {cycle.key}
                    </Badge>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {cycle.status}
                    </Badge>
                    {cycle.environment && (
                      <Badge variant="outline" className="text-xs">
                        {cycle.environment}
                      </Badge>
                    )}
                  </div>
                  <SheetTitle className="text-lg text-text-primary text-left truncate">
                    {cycle.name}
                  </SheetTitle>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                    {cycle.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(cycle.start_date), 'MMM d')}
                        {cycle.end_date && ` - ${format(new Date(cycle.end_date), 'MMM d')}`}
                      </span>
                    )}
                    <span>{total} runs</span>
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full justify-start rounded-none border-b border-border-default bg-transparent px-4">
                <TabsTrigger value="scope" className="data-[state=active]:bg-surface-2 gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> Scope
                </TabsTrigger>
                <TabsTrigger value="runs" className="data-[state=active]:bg-surface-2 gap-1.5">
                  <Play className="h-3.5 w-3.5" /> Runs ({total})
                </TabsTrigger>
                <TabsTrigger value="assignments" className="data-[state=active]:bg-surface-2 gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Assignments
                </TabsTrigger>
                <TabsTrigger value="progress" className="data-[state=active]:bg-surface-2 gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" /> Progress
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                {/* Scope Tab */}
                <TabsContent value="scope" className="p-4 space-y-4 m-0">
                  {/* Edit form */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-text-primary">Name</Label>
                      <Input
                        value={editName}
                        onChange={(e) => { setEditName(e.target.value); setHasChanges(true); }}
                        className="bg-surface-2 border-border-default"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-text-primary">Status</Label>
                        <Select value={editStatus} onValueChange={(v) => { setEditStatus(v); setHasChanges(true); }}>
                          <SelectTrigger className="bg-surface-2 border-border-default">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-surface-1 border-border-default">
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-text-primary">Environment</Label>
                        <Input
                          value={editEnvironment}
                          onChange={(e) => { setEditEnvironment(e.target.value); setHasChanges(true); }}
                          className="bg-surface-2 border-border-default"
                          placeholder="QA, Staging, UAT..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-text-primary">Build Version</Label>
                      <Input
                        value={editBuildVersion}
                        onChange={(e) => { setEditBuildVersion(e.target.value); setHasChanges(true); }}
                        className="bg-surface-2 border-border-default"
                        placeholder="v2.3.1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-text-primary">Objective</Label>
                      <Textarea
                        value={editObjective}
                        onChange={(e) => { setEditObjective(e.target.value); setHasChanges(true); }}
                        className="bg-surface-2 border-border-default min-h-[80px]"
                        placeholder="Cycle objective..."
                      />
                    </div>

                    {hasChanges && (
                      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    )}
                  </div>

                  {/* Linked Sets */}
                  <div className="pt-4 border-t border-border-default">
                    <h4 className="text-sm font-medium text-text-secondary mb-2">Linked Test Sets</h4>
                    {(linkedSets?.length || 0) === 0 ? (
                      <p className="text-text-tertiary text-sm py-2">No sets linked to this cycle</p>
                    ) : (
                      <div className="space-y-1">
                        {linkedSets?.map((link: any) => (
                          <div key={link.id} className="flex items-center gap-2 p-2 rounded bg-surface-2">
                            <Package className="h-4 w-4 text-accent-primary" />
                            <span className="text-sm text-text-primary flex-1">{link.test_set?.name}</span>
                            <Badge variant="outline" className="text-xs">{link.test_set?.key}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Cases */}
                  <div className="pt-4 border-t border-border-default">
                    <h4 className="text-sm font-medium text-text-secondary mb-2">Add Test Cases</h4>
                    <div className="space-y-1 max-h-[200px] overflow-auto">
                      {(availableCases?.length || 0) === 0 ? (
                        <p className="text-text-tertiary text-sm py-2">All cases already added or none available</p>
                      ) : (
                        availableCases?.slice(0, 15).map((c: any) => (
                          <div
                            key={c.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-surface-hover cursor-pointer"
                            onClick={() => addCaseMutation.mutate(c.id)}
                          >
                            <Plus className="h-4 w-4 text-text-tertiary" />
                            <span className="text-sm text-text-primary flex-1 truncate">{c.title}</span>
                            <Badge variant="outline" className="text-xs">{c.priority}</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Runs Tab */}
                <TabsContent value="runs" className="p-4 m-0">
                  {executions.length === 0 ? (
                    <p className="text-text-tertiary text-sm text-center py-8">No test runs in this cycle</p>
                  ) : (
                    <div className="space-y-2">
                      {executions.map((exec: any) => (
                        <div
                          key={exec.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 hover:bg-surface-hover cursor-pointer transition-colors"
                          onClick={() => onExecute?.(exec.id)}
                        >
                          {getStatusIcon(exec.status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text-primary truncate">{exec.test_case?.title}</p>
                            {exec.assigned_user && (
                              <p className="text-xs text-text-tertiary">{exec.assigned_user.full_name}</p>
                            )}
                          </div>
                          <Badge className={cn('text-xs capitalize', getStatusColor(exec.status || 'not_executed'))}>
                            {(exec.status || 'not_executed').replace('_', ' ')}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); removeExecutionMutation.mutate(exec.id); }}
                          >
                            <Trash2 className="h-3 w-3 text-status-error" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Assignments Tab */}
                <TabsContent value="assignments" className="p-4 m-0">
                  {executions.length === 0 ? (
                    <p className="text-text-tertiary text-sm text-center py-8">No runs to assign</p>
                  ) : (
                    <div className="space-y-2">
                      {executions.map((exec: any) => (
                        <div key={exec.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text-primary truncate">{exec.test_case?.title}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {exec.assigned_user ? (
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-accent-subtle flex items-center justify-center text-xs font-medium text-accent-primary">
                                  {exec.assigned_user.full_name?.charAt(0)}
                                </div>
                                <span className="text-sm text-text-secondary">{exec.assigned_user.full_name}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-text-tertiary">Unassigned</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Progress Tab */}
                <TabsContent value="progress" className="p-4 m-0">
                  <div className="space-y-6">
                    {/* Overall progress */}
                    <Card className="bg-surface-2 border-border-default">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-text-primary">Overall Progress</span>
                          <span className="text-lg font-semibold text-text-primary">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-text-tertiary mt-2">
                          {passed + failed + blocked} of {total} executed
                        </p>
                      </CardContent>
                    </Card>

                    {/* Status breakdown */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-status-success/10 border-status-success/20">
                        <CardContent className="p-4 text-center">
                          <CheckCircle2 className="h-8 w-8 mx-auto text-status-success mb-2" />
                          <p className="text-2xl font-semibold text-status-success">{passed}</p>
                          <p className="text-xs text-text-secondary">Passed</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-status-error/10 border-status-error/20">
                        <CardContent className="p-4 text-center">
                          <XCircle className="h-8 w-8 mx-auto text-status-error mb-2" />
                          <p className="text-2xl font-semibold text-status-error">{failed}</p>
                          <p className="text-xs text-text-secondary">Failed</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-status-warning/10 border-status-warning/20">
                        <CardContent className="p-4 text-center">
                          <AlertTriangle className="h-8 w-8 mx-auto text-status-warning mb-2" />
                          <p className="text-2xl font-semibold text-status-warning">{blocked}</p>
                          <p className="text-xs text-text-secondary">Blocked</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-surface-3 border-border-default">
                        <CardContent className="p-4 text-center">
                          <Clock className="h-8 w-8 mx-auto text-text-tertiary mb-2" />
                          <p className="text-2xl font-semibold text-text-tertiary">{notRun}</p>
                          <p className="text-xs text-text-secondary">Not Run</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Cycle info */}
                    <div className="pt-4 border-t border-border-default">
                      <p className="text-xs text-text-tertiary">
                        Created {format(new Date(cycle.created_at), 'MMM d, yyyy')}
                        {cycle.created_by_user && ` by ${(cycle.created_by_user as any).full_name}`}
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
