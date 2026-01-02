/**
 * CYCLE DRAWER
 * Drawer with Overview, Scope, Progress tabs and lock/unlock functionality.
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
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  RefreshCcw,
  Calendar,
  Lock,
  Unlock,
  Package,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Building2,
  Tag,
  Trash2,
  Archive,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CycleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string | null;
  projectId: string;
}

interface CycleExecution {
  id: string;
  status: string;
  test_case?: {
    id: string;
    title: string;
    priority?: string;
    test_type?: string;
  };
}

interface CycleSet {
  id: string;
  set_id: string;
  test_set?: {
    id: string;
    key: string;
    name: string;
  };
}

export function CycleDrawer({ open, onOpenChange, cycleId, projectId }: CycleDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch cycle details
  const { data: cycle, isLoading } = useQuery({
    queryKey: ['test-cycle-detail', cycleId],
    queryFn: async () => {
      if (!cycleId) return null;
      const { data, error } = await supabase
        .from('test_cycles')
        .select(`
          *,
          owner:profiles!test_cycles_owner_id_fkey(id, full_name, email),
          created_by_user:profiles!test_cycles_created_by_fkey(id, full_name),
          test_cycle_executions(
            id, status,
            test_case:test_cases(id, title, priority, test_type)
          ),
          test_cycle_sets(
            id, set_id,
            test_set:test_sets(id, key, name)
          )
        `)
        .eq('id', cycleId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!cycleId,
  });

  // Lock/Unlock mutation
  const lockMutation = useMutation({
    mutationFn: async (lock: boolean) => {
      if (!user || !cycleId) throw new Error('Invalid state');

      const { error } = await supabase
        .from('test_cycles')
        .update({
          scope_locked: lock,
          scope_locked_at: lock ? new Date().toISOString() : null,
          scope_locked_by: lock ? user.id : null,
        })
        .eq('id', cycleId);

      if (error) throw error;

      // Log audit
      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: lock ? 'scope_locked' : 'scope_unlocked',
        entity_type: 'test_cycle',
        entity_id: cycleId,
        entity_title: cycle?.name,
        description: `${lock ? 'Locked' : 'Unlocked'} scope for cycle "${cycle?.name}"`,
      });

      return lock;
    },
    onSuccess: (locked) => {
      queryClient.invalidateQueries({ queryKey: ['test-cycle-detail', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['project-test-cycles', projectId] });
      toast.success(`Scope ${locked ? 'locked' : 'unlocked'}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!user || !cycleId) throw new Error('Invalid state');

      const { error } = await supabase
        .from('test_cycles')
        .update({ status })
        .eq('id', cycleId);

      if (error) throw error;

      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: 'status_changed',
        entity_type: 'test_cycle',
        entity_id: cycleId,
        entity_title: cycle?.name,
        description: `Changed status to "${status}"`,
      });

      return status;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycle-detail', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['project-test-cycles', projectId] });
      toast.success('Status updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !cycleId) throw new Error('Invalid state');

      const { error } = await supabase
        .from('test_cycles')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: user.id,
        })
        .eq('id', cycleId);

      if (error) throw error;

      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: 'archived',
        entity_type: 'test_cycle',
        entity_id: cycleId,
        entity_title: cycle?.name,
        description: `Archived cycle "${cycle?.name}"`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-test-cycles', projectId] });
      toast.success('Cycle archived');
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Calculate execution stats
  const getExecutionStats = () => {
    const execs: CycleExecution[] = cycle?.test_cycle_executions || [];
    const total = execs.length;
    const passed = execs.filter(e => e.status === 'passed').length;
    const failed = execs.filter(e => e.status === 'failed').length;
    const blocked = execs.filter(e => e.status === 'blocked').length;
    const notRun = execs.filter(e => e.status === 'not_executed' || !e.status).length;
    const executed = total - notRun;
    const progress = total > 0 ? Math.round((executed / total) * 100) : 0;
    const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;

    return { total, passed, failed, blocked, notRun, executed, progress, passRate };
  };

  const stats = getExecutionStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-status-success bg-status-success/10';
      case 'completed': return 'text-accent-primary bg-accent-subtle';
      case 'not_started': return 'text-text-tertiary bg-surface-3';
      case 'blocked': return 'text-status-error bg-status-error/10';
      default: return 'text-text-tertiary bg-surface-3';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl bg-surface-1 border-border-default p-0 flex flex-col">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !cycle ? (
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
            <p className="text-text-secondary">Cycle not found</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <SheetHeader className="p-4 pb-0 border-b border-border-default">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-accent-subtle rounded-lg shrink-0">
                  <RefreshCcw className="h-5 w-5 text-accent-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {cycle.key}
                    </Badge>
                    <Badge className={cn('text-xs', getStatusColor(cycle.status))}>
                      {cycle.status?.replace('_', ' ')}
                    </Badge>
                    {cycle.scope_locked && (
                      <Badge variant="outline" className="text-xs bg-status-warning/10 text-status-warning border-status-warning/20">
                        <Lock className="h-3 w-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                  </div>
                  <SheetTitle className="text-lg text-text-primary text-left truncate">
                    {cycle.name}
                  </SheetTitle>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 py-3">
                <Button
                  size="sm"
                  variant={cycle.scope_locked ? 'default' : 'outline'}
                  onClick={() => lockMutation.mutate(!cycle.scope_locked)}
                  disabled={lockMutation.isPending}
                >
                  {cycle.scope_locked ? (
                    <>
                      <Unlock className="h-4 w-4 mr-1.5" />
                      Unlock Scope
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-1.5" />
                      Lock Scope
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-status-error hover:bg-status-error/10"
                  onClick={() => archiveMutation.mutate()}
                  disabled={archiveMutation.isPending}
                >
                  <Archive className="h-4 w-4 mr-1.5" />
                  Archive
                </Button>
              </div>
            </SheetHeader>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full justify-start rounded-none border-b border-border-default bg-transparent px-4">
                <TabsTrigger value="overview" className="data-[state=active]:bg-surface-2">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="scope" className="data-[state=active]:bg-surface-2">
                  Scope ({stats.total})
                </TabsTrigger>
                <TabsTrigger value="progress" className="data-[state=active]:bg-surface-2">
                  Progress
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                {/* Overview Tab */}
                <TabsContent value="overview" className="p-4 space-y-4 m-0">
                  {cycle.objective && (
                    <div>
                      <h4 className="text-sm font-medium text-text-secondary mb-1">Objective</h4>
                      <p className="text-text-primary">{cycle.objective}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-2 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-text-tertiary text-sm mb-1">
                        <Calendar className="h-4 w-4" />
                        Dates
                      </div>
                      <p className="text-text-primary">
                        {cycle.start_date ? format(new Date(cycle.start_date), 'MMM d') : 'Not set'}
                        {' - '}
                        {cycle.end_date ? format(new Date(cycle.end_date), 'MMM d, yyyy') : 'Ongoing'}
                      </p>
                    </div>

                    <div className="bg-surface-2 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-text-tertiary text-sm mb-1">
                        <Building2 className="h-4 w-4" />
                        Environment
                      </div>
                      <p className="text-text-primary">{cycle.environment || 'Not specified'}</p>
                    </div>

                    <div className="bg-surface-2 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-text-tertiary text-sm mb-1">
                        <Tag className="h-4 w-4" />
                        Build Version
                      </div>
                      <p className="text-text-primary">{cycle.build_version || 'Not specified'}</p>
                    </div>

                    <div className="bg-surface-2 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-text-tertiary text-sm mb-1">
                        <User className="h-4 w-4" />
                        Owner
                      </div>
                      <p className="text-text-primary">{(cycle.owner as any)?.full_name || 'Unassigned'}</p>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <Card className="bg-surface-2 border-border-default p-4">
                    <h4 className="text-sm font-medium text-text-secondary mb-3">Execution Summary</h4>
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div>
                        <p className="text-2xl font-bold text-status-success">{stats.passed}</p>
                        <p className="text-xs text-text-tertiary">Passed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-status-error">{stats.failed}</p>
                        <p className="text-xs text-text-tertiary">Failed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-status-warning">{stats.blocked}</p>
                        <p className="text-xs text-text-tertiary">Blocked</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-text-tertiary">{stats.notRun}</p>
                        <p className="text-xs text-text-tertiary">Not Run</p>
                      </div>
                    </div>
                  </Card>

                  {/* Status Actions */}
                  <div>
                    <h4 className="text-sm font-medium text-text-secondary mb-2">Change Status</h4>
                    <div className="flex flex-wrap gap-2">
                      {['not_started', 'active', 'completed', 'blocked'].map(status => (
                        <Button
                          key={status}
                          size="sm"
                          variant={cycle.status === status ? 'default' : 'outline'}
                          onClick={() => updateStatusMutation.mutate(status)}
                          disabled={updateStatusMutation.isPending || cycle.status === status}
                          className="capitalize"
                        >
                          {status.replace('_', ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Scope Tab */}
                <TabsContent value="scope" className="p-4 space-y-4 m-0">
                  {/* Linked Sets */}
                  <div>
                    <h4 className="text-sm font-medium text-text-secondary mb-2">
                      Included Test Sets
                    </h4>
                    {(cycle.test_cycle_sets?.length || 0) === 0 ? (
                      <p className="text-text-tertiary text-sm">No sets linked to this cycle.</p>
                    ) : (
                      <div className="space-y-2">
                        {cycle.test_cycle_sets?.map((cs: CycleSet) => (
                          <div
                            key={cs.id}
                            className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg"
                          >
                            <Package className="h-4 w-4 text-accent-primary" />
                            <div className="flex-1">
                              <p className="text-text-primary font-medium">
                                {cs.test_set?.name || 'Unknown Set'}
                              </p>
                              <p className="text-xs text-text-tertiary">{cs.test_set?.key}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator className="bg-border-default" />

                  {/* Test Cases in Scope */}
                  <div>
                    <h4 className="text-sm font-medium text-text-secondary mb-2">
                      Test Cases ({stats.total})
                    </h4>
                    {stats.total === 0 ? (
                      <p className="text-text-tertiary text-sm">No test cases in this cycle.</p>
                    ) : (
                      <div className="space-y-1 max-h-[300px] overflow-auto">
                        {cycle.test_cycle_executions?.map((exec: CycleExecution) => (
                          <div
                            key={exec.id}
                            className="flex items-center gap-3 p-2 rounded hover:bg-surface-hover"
                          >
                            {exec.status === 'passed' && (
                              <CheckCircle2 className="h-4 w-4 text-status-success shrink-0" />
                            )}
                            {exec.status === 'failed' && (
                              <XCircle className="h-4 w-4 text-status-error shrink-0" />
                            )}
                            {exec.status === 'blocked' && (
                              <AlertCircle className="h-4 w-4 text-status-warning shrink-0" />
                            )}
                            {(!exec.status || exec.status === 'not_executed') && (
                              <Clock className="h-4 w-4 text-text-tertiary shrink-0" />
                            )}
                            <span className="text-text-primary text-sm truncate flex-1">
                              {exec.test_case?.title || 'Unknown Case'}
                            </span>
                            {exec.test_case?.priority && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {exec.test_case.priority}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Progress Tab */}
                <TabsContent value="progress" className="p-4 space-y-4 m-0">
                  {/* Overall Progress */}
                  <Card className="bg-surface-2 border-border-default p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-text-secondary">Overall Progress</h4>
                      <span className="text-lg font-bold text-text-primary">{stats.progress}%</span>
                    </div>
                    <Progress value={stats.progress} className="h-3" />
                    <p className="text-xs text-text-tertiary mt-2">
                      {stats.executed} of {stats.total} test cases executed
                    </p>
                  </Card>

                  {/* Pass Rate */}
                  <Card className="bg-surface-2 border-border-default p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-text-secondary">Pass Rate</h4>
                      <span className={cn(
                        'text-lg font-bold',
                        stats.passRate >= 80 ? 'text-status-success' :
                          stats.passRate >= 50 ? 'text-status-warning' : 'text-status-error'
                      )}>
                        {stats.passRate}%
                      </span>
                    </div>
                    <Progress
                      value={stats.passRate}
                      className={cn(
                        'h-3',
                        stats.passRate >= 80 ? '[&>div]:bg-status-success' :
                          stats.passRate >= 50 ? '[&>div]:bg-status-warning' : '[&>div]:bg-status-error'
                      )}
                    />
                    <p className="text-xs text-text-tertiary mt-2">
                      {stats.passed} passed out of {stats.executed} executed
                    </p>
                  </Card>

                  {/* Breakdown Chart */}
                  <div>
                    <h4 className="text-sm font-medium text-text-secondary mb-3">Status Breakdown</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-status-success" />
                        <span className="text-text-primary flex-1">Passed</span>
                        <span className="text-text-secondary font-medium">{stats.passed}</span>
                        <span className="text-text-tertiary text-sm w-12 text-right">
                          {stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-status-error" />
                        <span className="text-text-primary flex-1">Failed</span>
                        <span className="text-text-secondary font-medium">{stats.failed}</span>
                        <span className="text-text-tertiary text-sm w-12 text-right">
                          {stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-status-warning" />
                        <span className="text-text-primary flex-1">Blocked</span>
                        <span className="text-text-secondary font-medium">{stats.blocked}</span>
                        <span className="text-text-tertiary text-sm w-12 text-right">
                          {stats.total > 0 ? Math.round((stats.blocked / stats.total) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-surface-3" />
                        <span className="text-text-primary flex-1">Not Run</span>
                        <span className="text-text-secondary font-medium">{stats.notRun}</span>
                        <span className="text-text-tertiary text-sm w-12 text-right">
                          {stats.total > 0 ? Math.round((stats.notRun / stats.total) * 100) : 0}%
                        </span>
                      </div>
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
