/**
 * CYCLE EXECUTION PAGE
 * Full-screen execution workspace with expandable run rows, step tracking,
 * effort timer, reset functionality, and status percolation.
 * Route: /projects/:projectId/tests/cycles/:cycleId/execution
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
  ChevronDown,
  Filter,
  RefreshCw,
  RotateCcw,
  Timer,
  TimerOff,
  Bug,
  MessageSquare,
  Paperclip,
  MoreVertical,
  Square,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { TestsEmptyState } from '../components/TestsEmptyState';

type StepStatus = 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped';

interface StepResult {
  id: string;
  step_order: number;
  step_description: string;
  expected_result: string | null;
  actual_result: string | null;
  status: string;
  comments: string | null;
  executed_at: string | null;
}

interface Execution {
  id: string;
  cycle_id: string;
  case_id: string;
  status: string;
  assigned_to: string | null;
  executed_by: string | null;
  executed_at: string | null;
  comments: string | null;
  effort_minutes: number | null;
  timer_start_at: string | null;
  timer_accumulated_seconds: number | null;
  timer_paused_at: string | null;
  test_case: {
    id: string;
    title: string;
    description: string | null;
    preconditions: string | null;
    priority: string;
    test_type: string;
    component: string | null;
  };
}

// Status priority for percolation: Failed > Blocked > In Progress > Passed > Not Run
const STATUS_PRIORITY: Record<string, number> = {
  failed: 5,
  blocked: 4,
  in_progress: 3,
  passed: 2,
  skipped: 1,
  not_run: 0,
};

function deriveRunStatusFromSteps(statuses: string[]): string {
  if (statuses.length === 0) return 'not_run';
  
  // Apply priority rules
  if (statuses.includes('failed')) return 'failed';
  if (statuses.includes('blocked')) return 'blocked';
  if (statuses.some(s => s === 'in_progress' || s === 'passed') && statuses.some(s => s === 'not_run')) {
    return 'in_progress';
  }
  if (statuses.every(s => s === 'passed')) return 'passed';
  if (statuses.every(s => s === 'skipped')) return 'skipped';
  if (statuses.every(s => s === 'not_run')) return 'not_run';
  
  return 'in_progress';
}

export function CycleExecutionPage() {
  const { projectId, cycleId } = useParams<{ projectId: string; cycleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const [activeTimerExecId, setActiveTimerExecId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  
  // Modal states
  const [defectModalOpen, setDefectModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [selectedExecForModal, setSelectedExecForModal] = useState<string | null>(null);
  const [selectedStepForModal, setSelectedStepForModal] = useState<number | null>(null);
  
  // Form states
  const [defectTitle, setDefectTitle] = useState('');
  const [defectDescription, setDefectDescription] = useState('');
  const [commentText, setCommentText] = useState('');
  const [manualEffort, setManualEffort] = useState('');

  // Fetch cycle details
  const { data: cycle, isLoading: cycleLoading } = useQuery({
    queryKey: ['test-cycle-detail', cycleId],
    queryFn: async () => {
      if (!cycleId) return null;
      const { data, error } = await supabase
        .from('test_cycles')
        .select('*')
        .eq('id', cycleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!cycleId,
  });

  // Fetch executions with test case info
  const { data: executions, isLoading: executionsLoading, refetch: refetchExecutions } = useQuery({
    queryKey: ['cycle-executions-full', cycleId],
    queryFn: async () => {
      if (!cycleId) return [];
      const { data, error } = await supabase
        .from('test_cycle_executions')
        .select(`
          *,
          test_case:test_cases(id, title, description, preconditions, priority, test_type, component)
        `)
        .eq('cycle_id', cycleId)
        .order('created_at');
      if (error) throw error;
      return (data || []) as Execution[];
    },
    enabled: !!cycleId,
  });

  // Fetch all step results for the cycle
  const { data: allStepResults, refetch: refetchSteps } = useQuery({
    queryKey: ['cycle-step-results', cycleId],
    queryFn: async () => {
      if (!cycleId || !executions?.length) return {};
      
      const execIds = executions.map(e => e.id);
      const { data, error } = await supabase
        .from('test_execution_step_results')
        .select('*')
        .in('execution_id', execIds)
        .order('step_order');
      
      if (error) throw error;
      
      // Group by execution_id
      const grouped: Record<string, StepResult[]> = {};
      (data || []).forEach((step: any) => {
        if (!grouped[step.execution_id]) grouped[step.execution_id] = [];
        grouped[step.execution_id].push(step);
      });
      return grouped;
    },
    enabled: !!cycleId && !!executions?.length,
  });

  // Fetch defect links
  const { data: defectLinks } = useQuery({
    queryKey: ['cycle-defect-links', cycleId],
    queryFn: async () => {
      if (!cycleId || !executions?.length) return {};
      
      const execIds = executions.map(e => e.id);
      const { data, error } = await supabase
        .from('test_execution_defects')
        .select('execution_id, defect_work_item_id')
        .in('execution_id', execIds);
      
      if (error) throw error;
      
      const grouped: Record<string, string[]> = {};
      (data || []).forEach((link: any) => {
        if (!grouped[link.execution_id]) grouped[link.execution_id] = [];
        grouped[link.execution_id].push(link.defect_work_item_id);
      });
      return grouped;
    },
    enabled: !!cycleId && !!executions?.length,
  });

  // Timer effect
  useEffect(() => {
    if (!activeTimerExecId) return;
    
    const exec = executions?.find(e => e.id === activeTimerExecId);
    if (!exec?.timer_start_at) return;
    
    const startTime = new Date(exec.timer_start_at).getTime();
    const accumulated = exec.timer_accumulated_seconds || 0;
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setTimerSeconds(accumulated + elapsed);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeTimerExecId, executions]);

  // Initialize active timer from data
  useEffect(() => {
    if (executions) {
      const running = executions.find(e => e.timer_start_at && !e.timer_paused_at);
      if (running) {
        setActiveTimerExecId(running.id);
      }
    }
  }, [executions]);

  const refetchAll = useCallback(() => {
    refetchExecutions();
    refetchSteps();
  }, [refetchExecutions, refetchSteps]);

  // Update step status mutation
  const updateStepMutation = useMutation({
    mutationFn: async ({ execId, stepOrder, status, actualResult }: { 
      execId: string; 
      stepOrder: number; 
      status: string; 
      actualResult?: string;
    }) => {
      const { error } = await supabase
        .from('test_execution_step_results')
        .update({
          status,
          actual_result: actualResult || null,
          executed_at: new Date().toISOString(),
        })
        .eq('execution_id', execId)
        .eq('step_order', stepOrder);
      
      if (error) throw error;
      
      // Fetch all steps for this execution to derive run status
      const { data: steps } = await supabase
        .from('test_execution_step_results')
        .select('status')
        .eq('execution_id', execId);
      
      const stepStatuses = (steps || []).map(s => s.status || 'not_run');
      const newRunStatus = deriveRunStatusFromSteps(stepStatuses);
      
      // Update execution status
      await supabase
        .from('test_cycle_executions')
        .update({
          status: newRunStatus,
          executed_at: newRunStatus !== 'not_run' ? new Date().toISOString() : null,
          executed_by: newRunStatus !== 'not_run' ? user?.id : null,
        })
        .eq('id', execId);
      
      return { execId, newStatus: newRunStatus };
    },
    onSuccess: () => {
      refetchAll();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Start timer mutation
  const startTimerMutation = useMutation({
    mutationFn: async (execId: string) => {
      // Pause any existing timer first
      if (activeTimerExecId && activeTimerExecId !== execId) {
        await pauseTimerMutation.mutateAsync(activeTimerExecId);
      }
      
      const { error } = await supabase
        .from('test_cycle_executions')
        .update({
          timer_start_at: new Date().toISOString(),
          timer_paused_at: null,
        })
        .eq('id', execId);
      
      if (error) throw error;
      return execId;
    },
    onSuccess: (execId) => {
      setActiveTimerExecId(execId);
      refetchExecutions();
      toast.success('Timer started');
    },
  });

  // Pause timer mutation
  const pauseTimerMutation = useMutation({
    mutationFn: async (execId: string) => {
      const exec = executions?.find(e => e.id === execId);
      if (!exec?.timer_start_at) return;
      
      const elapsed = Math.floor((Date.now() - new Date(exec.timer_start_at).getTime()) / 1000);
      const accumulated = (exec.timer_accumulated_seconds || 0) + elapsed;
      
      const { error } = await supabase
        .from('test_cycle_executions')
        .update({
          timer_start_at: null,
          timer_accumulated_seconds: accumulated,
          timer_paused_at: new Date().toISOString(),
        })
        .eq('id', execId);
      
      if (error) throw error;
      return execId;
    },
    onSuccess: () => {
      setActiveTimerExecId(null);
      setTimerSeconds(0);
      refetchExecutions();
      toast.success('Timer paused');
    },
  });

  // Update manual effort mutation
  const updateEffortMutation = useMutation({
    mutationFn: async ({ execId, minutes }: { execId: string; minutes: number }) => {
      const { error } = await supabase
        .from('test_cycle_executions')
        .update({ effort_minutes: minutes })
        .eq('id', execId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      refetchExecutions();
      toast.success('Effort updated');
    },
  });

  // Reset execution mutation
  const resetExecutionMutation = useMutation({
    mutationFn: async (execId: string) => {
      // Reset all steps
      await supabase
        .from('test_execution_step_results')
        .update({
          status: 'not_run',
          actual_result: null,
          comments: null,
          executed_at: null,
        })
        .eq('execution_id', execId);
      
      // Reset execution
      const { error } = await supabase
        .from('test_cycle_executions')
        .update({
          status: 'not_run',
          executed_at: null,
          executed_by: null,
          comments: null,
          effort_minutes: null,
          timer_start_at: null,
          timer_accumulated_seconds: null,
          timer_paused_at: null,
        })
        .eq('id', execId);
      
      if (error) throw error;
      
      // Remove defect links
      await supabase
        .from('test_execution_defects')
        .delete()
        .eq('execution_id', execId);
      
      return execId;
    },
    onSuccess: () => {
      refetchAll();
      setResetConfirmOpen(false);
      setSelectedExecForModal(null);
      toast.success('Execution reset');
    },
  });

  // Create defect mutation
  const createDefectMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedExecForModal || !defectTitle.trim()) {
        throw new Error('Missing required fields');
      }
      
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from('defects')
        .select('id', { count: 'exact', head: true });
      
      const defectId = `DEF-${year}-${((count || 0) + 1).toString().padStart(4, '0')}`;
      
      const { data: defect, error } = await supabase
        .from('defects')
        .insert({
          defect_id: defectId,
          title: defectTitle.trim(),
          description: defectDescription.trim() || null,
          severity: 'major',
          priority: 'medium',
          workflow_status: 'open',
          reporter_id: user.id,
          project_id: projectId,
          actual_result: '',
          expected_result: '',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Link to execution
      await supabase.from('test_execution_defects').insert({
        execution_id: selectedExecForModal,
        defect_work_item_id: defect.id,
        linked_by: user.id,
      });
      
      return defect;
    },
    onSuccess: (defect) => {
      refetchAll();
      setDefectModalOpen(false);
      setDefectTitle('');
      setDefectDescription('');
      setSelectedExecForModal(null);
      setSelectedStepForModal(null);
      toast.success(`Defect ${defect.defect_id} created`);
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExecForModal || !commentText.trim()) return;
      
      const { error } = await supabase
        .from('test_cycle_executions')
        .update({ comments: commentText.trim() })
        .eq('id', selectedExecForModal);
      
      if (error) throw error;
    },
    onSuccess: () => {
      refetchExecutions();
      setCommentModalOpen(false);
      setCommentText('');
      setSelectedExecForModal(null);
      toast.success('Comment added');
    },
  });

  const filteredExecutions = useMemo(() => {
    if (!executions) return [];
    if (statusFilter === 'all') return executions;
    
    return executions.filter((exec) => {
      if (statusFilter === 'not_run') {
        return exec.status === 'not_run' || !exec.status;
      }
      return exec.status === statusFilter;
    });
  }, [executions, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = executions?.length || 0;
    const passed = executions?.filter(e => e.status === 'passed').length || 0;
    const failed = executions?.filter(e => e.status === 'failed').length || 0;
    const blocked = executions?.filter(e => e.status === 'blocked').length || 0;
    const inProgress = executions?.filter(e => e.status === 'in_progress').length || 0;
    const notRun = total - passed - failed - blocked - inProgress;
    const executed = total - notRun;
    const progress = total > 0 ? Math.round((executed / total) * 100) : 0;
    const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;
    return { total, passed, failed, blocked, inProgress, notRun, progress, passRate };
  }, [executions]);

  const toggleRunExpanded = (execId: string) => {
    setExpandedRuns(prev => {
      const next = new Set(prev);
      if (next.has(execId)) {
        next.delete(execId);
      } else {
        next.add(execId);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string, size = 'h-4 w-4') => {
    switch (status) {
      case 'passed': return <CheckCircle2 className={cn(size, 'text-status-success')} />;
      case 'failed': return <XCircle className={cn(size, 'text-status-error')} />;
      case 'blocked': return <AlertTriangle className={cn(size, 'text-status-warning')} />;
      case 'in_progress': return <Play className={cn(size, 'text-accent-primary')} />;
      case 'skipped': return <Square className={cn(size, 'text-text-tertiary')} />;
      default: return <Circle className={cn(size, 'text-text-tertiary')} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-status-success bg-status-success/10';
      case 'failed': return 'text-status-error bg-status-error/10';
      case 'blocked': return 'text-status-warning bg-status-warning/10';
      case 'in_progress': return 'text-accent-primary bg-accent-subtle';
      default: return 'text-text-tertiary bg-surface-3';
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLoading = cycleLoading || executionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  if (!cycle) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Cycle not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Floating Timer (when active) */}
      {activeTimerExecId && (
        <div className="fixed top-4 right-4 z-50 bg-surface-1 border border-accent-primary rounded-lg shadow-lg p-3 flex items-center gap-3">
          <Timer className="h-5 w-5 text-accent-primary animate-pulse" />
          <span className="font-mono text-lg font-semibold text-accent-primary">
            {formatTime(timerSeconds)}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => pauseTimerMutation.mutate(activeTimerExecId)}
          >
            <TimerOff className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/projects/${projectId}/tests/cycles`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cycles
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">{cycle.key}</Badge>
            <h1 className="text-xl font-semibold text-text-primary">{cycle.name}</h1>
          </div>
          <p className="text-text-tertiary text-sm">
            {cycle.environment || 'No environment'} • {cycle.build_version || 'No build'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchAll()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Progress Summary */}
      <Card className="bg-surface-2 border-border-default p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-text-secondary">{stats.total} test cases</span>
          <span className="text-text-primary font-semibold">{stats.progress}% complete</span>
        </div>
        <Progress value={stats.progress} className="h-3 mb-3" />
        <div className="grid grid-cols-5 gap-4 text-center">
          <div 
            className="cursor-pointer hover:bg-surface-3 rounded-lg p-2 transition-colors"
            onClick={() => setStatusFilter('passed')}
          >
            <p className="text-2xl font-bold text-status-success">{stats.passed}</p>
            <p className="text-xs text-text-tertiary">Passed</p>
          </div>
          <div 
            className="cursor-pointer hover:bg-surface-3 rounded-lg p-2 transition-colors"
            onClick={() => setStatusFilter('failed')}
          >
            <p className="text-2xl font-bold text-status-error">{stats.failed}</p>
            <p className="text-xs text-text-tertiary">Failed</p>
          </div>
          <div 
            className="cursor-pointer hover:bg-surface-3 rounded-lg p-2 transition-colors"
            onClick={() => setStatusFilter('blocked')}
          >
            <p className="text-2xl font-bold text-status-warning">{stats.blocked}</p>
            <p className="text-xs text-text-tertiary">Blocked</p>
          </div>
          <div 
            className="cursor-pointer hover:bg-surface-3 rounded-lg p-2 transition-colors"
            onClick={() => setStatusFilter('in_progress')}
          >
            <p className="text-2xl font-bold text-accent-primary">{stats.inProgress}</p>
            <p className="text-xs text-text-tertiary">In Progress</p>
          </div>
          <div 
            className="cursor-pointer hover:bg-surface-3 rounded-lg p-2 transition-colors"
            onClick={() => setStatusFilter('not_run')}
          >
            <p className="text-2xl font-bold text-text-tertiary">{stats.notRun}</p>
            <p className="text-xs text-text-tertiary">Not Run</p>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-surface-2 border-border-default">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="bg-surface-1 border-border-default">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="not_run">Not Run</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="passed">Passed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-text-tertiary">
          {filteredExecutions.length} of {stats.total} tests
        </span>
      </div>

      {/* Execution List with Expandable Rows */}
      {filteredExecutions.length === 0 ? (
        <TestsEmptyState type="executions" />
      ) : (
        <div className="space-y-2">
          {filteredExecutions.map((exec) => {
            const isExpanded = expandedRuns.has(exec.id);
            const steps = allStepResults?.[exec.id] || [];
            const defects = defectLinks?.[exec.id] || [];
            const hasTimer = exec.timer_start_at || exec.timer_accumulated_seconds;
            const isTimerRunning = exec.id === activeTimerExecId;
            
            return (
              <Card
                key={exec.id}
                className="bg-surface-2 border-border-default overflow-hidden"
              >
                {/* Run Row Header */}
                <Collapsible open={isExpanded} onOpenChange={() => toggleRunExpanded(exec.id)}>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-text-tertiary" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-text-tertiary" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      {getStatusIcon(exec.status || 'not_run', 'h-5 w-5')}
                      <div>
                        <p className="font-medium text-text-primary">
                          {exec.test_case?.title || 'Unknown Test'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs">
                            {exec.test_case?.test_type || 'manual'}
                          </Badge>
                          {exec.test_case?.priority && (
                            <Badge variant="outline" className="text-xs">
                              {exec.test_case.priority}
                            </Badge>
                          )}
                          {steps.length > 0 && (
                            <span className="text-xs text-text-tertiary">
                              {steps.filter(s => s.status !== 'not_run').length}/{steps.length} steps
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Timer display */}
                      {hasTimer && (
                        <span className={cn(
                          "font-mono text-sm px-2 py-1 rounded",
                          isTimerRunning ? "bg-accent-subtle text-accent-primary" : "bg-surface-3 text-text-secondary"
                        )}>
                          {isTimerRunning 
                            ? formatTime(timerSeconds)
                            : formatTime(exec.timer_accumulated_seconds || 0)
                          }
                        </span>
                      )}
                      
                      {/* Effort display */}
                      {exec.effort_minutes && (
                        <span className="text-xs text-text-tertiary">
                          {exec.effort_minutes}m
                        </span>
                      )}
                      
                      {/* Defect count */}
                      {defects.length > 0 && (
                        <Badge variant="outline" className="text-status-error border-status-error/30 gap-1">
                          <Bug className="h-3 w-3" />
                          {defects.length}
                        </Badge>
                      )}
                      
                      <Badge className={cn('text-xs capitalize', getStatusColor(exec.status || 'not_run'))}>
                        {(exec.status || 'not_run').replace('_', ' ')}
                      </Badge>
                      
                      {/* Actions dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-surface-1 border-border-default">
                          {!isTimerRunning ? (
                            <DropdownMenuItem onClick={() => startTimerMutation.mutate(exec.id)}>
                              <Timer className="h-4 w-4 mr-2" />
                              Start Timer
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => pauseTimerMutation.mutate(exec.id)}>
                              <TimerOff className="h-4 w-4 mr-2" />
                              Pause Timer
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => {
                            setSelectedExecForModal(exec.id);
                            setManualEffort(exec.effort_minutes?.toString() || '');
                            const mins = prompt('Enter effort in minutes:', exec.effort_minutes?.toString() || '0');
                            if (mins !== null) {
                              updateEffortMutation.mutate({ execId: exec.id, minutes: parseInt(mins) || 0 });
                            }
                          }}>
                            <Clock className="h-4 w-4 mr-2" />
                            Set Manual Effort
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setSelectedExecForModal(exec.id);
                            setDefectTitle(`[${cycle.key}] ${exec.test_case?.title}`);
                            setDefectModalOpen(true);
                          }}>
                            <Bug className="h-4 w-4 mr-2" />
                            Create Defect
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedExecForModal(exec.id);
                            setCommentText(exec.comments || '');
                            setCommentModalOpen(true);
                          }}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Add Comment
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-status-error"
                            onClick={() => {
                              setSelectedExecForModal(exec.id);
                              setResetConfirmOpen(true);
                            }}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset Run
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <CollapsibleContent>
                    <Separator />
                    <div className="p-4 bg-surface-1 space-y-4">
                      {/* Preconditions */}
                      {exec.test_case?.preconditions && (
                        <div>
                          <Label className="text-xs text-text-tertiary">Preconditions</Label>
                          <p className="text-sm text-text-secondary mt-1 p-2 bg-surface-2 rounded">
                            {exec.test_case.preconditions}
                          </p>
                        </div>
                      )}
                      
                      {/* Steps */}
                      {steps.length > 0 ? (
                        <div className="space-y-2">
                          <Label className="text-xs text-text-tertiary">Test Steps</Label>
                          {steps.map((step) => (
                            <div
                              key={step.id}
                              className="border border-border-default rounded-lg p-3 bg-surface-2"
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-xs font-mono text-text-tertiary bg-surface-3 px-2 py-1 rounded">
                                  #{step.step_order}
                                </span>
                                <div className="flex-1 space-y-2">
                                  <p className="text-sm text-text-primary">{step.step_description}</p>
                                  {step.expected_result && (
                                    <p className="text-xs text-text-tertiary">
                                      <span className="font-medium">Expected:</span> {step.expected_result}
                                    </p>
                                  )}
                                  
                                  {/* Actual Result Input */}
                                  <Textarea
                                    placeholder="Add actual results..."
                                    value={step.actual_result || ''}
                                    onChange={(e) => {
                                      // Local update for UX, persisted on status change
                                      const stepEl = e.target;
                                      stepEl.dataset.pendingResult = e.target.value;
                                    }}
                                    className="text-sm h-16 bg-surface-1"
                                  />
                                  
                                  {/* Step Actions */}
                                  <div className="flex items-center gap-2">
                                    {(['passed', 'failed', 'blocked', 'skipped', 'not_run'] as const).map((status) => (
                                      <Button
                                        key={status}
                                        size="sm"
                                        variant={step.status === status ? 'default' : 'outline'}
                                        className={cn(
                                          'text-xs gap-1',
                                          step.status === status && status === 'passed' && 'bg-status-success hover:bg-status-success/90',
                                          step.status === status && status === 'failed' && 'bg-status-error hover:bg-status-error/90',
                                          step.status === status && status === 'blocked' && 'bg-status-warning hover:bg-status-warning/90',
                                        )}
                                        onClick={() => {
                                          const textarea = document.querySelector(`textarea[data-pending-result]`) as HTMLTextAreaElement | null;
                                          updateStepMutation.mutate({
                                            execId: exec.id,
                                            stepOrder: step.step_order,
                                            status,
                                            actualResult: textarea?.dataset.pendingResult || step.actual_result || undefined,
                                          });
                                        }}
                                      >
                                        {getStatusIcon(status, 'h-3 w-3')}
                                        <span className="capitalize">{status.replace('_', ' ')}</span>
                                      </Button>
                                    ))}
                                    
                                    {/* Step-level actions */}
                                    <div className="ml-auto flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedExecForModal(exec.id);
                                          setSelectedStepForModal(step.step_order);
                                          setDefectTitle(`Step ${step.step_order} - ${exec.test_case?.title}`);
                                          setDefectModalOpen(true);
                                        }}
                                      >
                                        <Bug className="h-4 w-4 text-text-tertiary" />
                                      </Button>
                                      <Button variant="ghost" size="sm">
                                        <MessageSquare className="h-4 w-4 text-text-tertiary" />
                                      </Button>
                                      <Button variant="ghost" size="sm">
                                        <Paperclip className="h-4 w-4 text-text-tertiary" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-text-tertiary italic">No steps defined for this test case</p>
                      )}
                      
                      {/* Run Comments */}
                      {exec.comments && (
                        <div>
                          <Label className="text-xs text-text-tertiary">Comments</Label>
                          <p className="text-sm text-text-secondary mt-1 p-2 bg-surface-2 rounded">
                            {exec.comments}
                          </p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Defect Modal */}
      <Dialog open={defectModalOpen} onOpenChange={setDefectModalOpen}>
        <DialogContent className="bg-surface-1 border-border-default">
          <DialogHeader>
            <DialogTitle>Create Defect</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={defectTitle}
                onChange={(e) => setDefectTitle(e.target.value)}
                placeholder="Defect title"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={defectDescription}
                onChange={(e) => setDefectDescription(e.target.value)}
                placeholder="Describe the issue..."
                className="mt-1 h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDefectModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createDefectMutation.mutate()}
              disabled={!defectTitle.trim() || createDefectMutation.isPending}
            >
              Create Defect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Comment Modal */}
      <Dialog open={commentModalOpen} onOpenChange={setCommentModalOpen}>
        <DialogContent className="bg-surface-1 border-border-default">
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          <div>
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment... Use @username to mention"
              className="h-32"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => addCommentMutation.mutate()}
              disabled={!commentText.trim() || addCommentMutation.isPending}
            >
              Save Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="bg-surface-1 border-border-default">
          <DialogHeader>
            <DialogTitle>Reset Execution</DialogTitle>
          </DialogHeader>
          <p className="text-text-secondary">
            This will clear all step results, comments, defect links, and effort data for this test run. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedExecForModal && resetExecutionMutation.mutate(selectedExecForModal)}
              disabled={resetExecutionMutation.isPending}
            >
              Reset Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CycleExecutionPage;
