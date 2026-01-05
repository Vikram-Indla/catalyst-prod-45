/**
 * Cycle Detail Page
 * Shows cycle details with Scope, Runs, Defects, and Reports tabs
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Edit, 
  Copy, 
  RotateCcw, 
  CheckCircle, 
  MoreHorizontal,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Ban
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { 
  useTestCycle, 
  useCycleScope, 
  useTestRuns,
  useDefectsByCycle,
  useAddCasesToScope, 
  useRemoveFromScope, 
  useAssignTester,
  useStartCycle,
  useCompleteCycle,
  useCloneCycle,
  useUpdateCycle,
  useTeamMembers,
  useTestCases,
  useRerunFailed,
} from '@/hooks/test-management';
import { useProjectStore } from '../stores/projectStore';
import { 
  CycleScopeTable, 
  CycleRunsTable, 
  CycleDefectsTable, 
  CycleReportsTab,
  CreateCycleModal,
  AddCasesToScopeModal,
  AssignTestersModal
} from '../components/cycles';
// ExecutionModal removed - now using full-page runner
import type { CycleStatus } from '../api/types';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<CycleStatus, { label: string; class: string; icon: React.ElementType }> = {
  planned: { label: 'Planned', class: 'bg-muted text-muted-foreground', icon: Clock },
  active: { label: 'In Progress', class: 'bg-info/10 text-info border-info/20', icon: Play },
  completed: { label: 'Completed', class: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', class: 'bg-danger/10 text-danger border-danger/20', icon: XCircle },
};

// Map hook status to component status
const mapCycleStatus = (status: string): CycleStatus => {
  const map: Record<string, CycleStatus> = {
    'PLANNED': 'planned',
    'IN_PROGRESS': 'active',
    'COMPLETED': 'completed',
    'CANCELLED': 'cancelled',
  };
  return map[status] || 'planned';
};

const mapStatusToHook = (status: CycleStatus): 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' => {
  const map: Record<CycleStatus, 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'> = {
    'planned': 'PLANNED',
    'active': 'IN_PROGRESS',
    'completed': 'COMPLETED',
    'cancelled': 'CANCELLED',
  };
  return map[status];
};

export function CycleDetailPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  
  // Get project ID from store
  const selectedProjectId = useProjectStore(s => s.selectedProjectId);
  const projectId = selectedProjectId || undefined;
  
  const [activeTab, setActiveTab] = useState('scope');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addCasesModalOpen, setAddCasesModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedScopeIds, setSelectedScopeIds] = useState<string[]>([]);
  // executionScopeId state removed - now using full-page runner
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);

  // Fetch cycle data using new hooks
  const { data: cycle, isLoading: cycleLoading } = useTestCycle(cycleId);
  
  // Fetch scope for this cycle
  const { data: scopeData = [] } = useCycleScope(cycleId);
  
  // Fetch runs for this cycle
  const { data: runsData = [] } = useTestRuns(cycleId);
  
  // Fetch defects for this cycle
  const { data: defectsData = [] } = useDefectsByCycle(cycleId);
  
  // Fetch test cases for adding to scope
  const { data: casesData } = useTestCases(projectId);
  
  // Fetch team members for assignment
  const { data: teamMembers = [] } = useTeamMembers(projectId || null);

  // Mutations
  const updateCycleMutation = useUpdateCycle();
  const cloneCycleMutation = useCloneCycle();
  const completeCycleMutation = useCompleteCycle();
  const startCycleMutation = useStartCycle();
  const addCasesMutation = useAddCasesToScope();
  const removeCasesMutation = useRemoveFromScope();
  const assignTesterMutation = useAssignTester();
  const rerunFailedMutation = useRerunFailed();

  // Calculate stats from cycle data
  const stats = useMemo(() => {
    if (!cycle) {
      return { total: 0, passed: 0, failed: 0, blocked: 0, notRun: 0, progress: 0, passRate: 0 };
    }
    const total = cycle.total_cases || 0;
    const passed = cycle.passed_count || 0;
    const failed = cycle.failed_count || 0;
    const blocked = cycle.blocked_count || 0;
    const notRun = cycle.not_run_count || 0;
    const executed = total - notRun;
    return {
      total,
      passed,
      failed,
      blocked,
      notRun,
      progress: total > 0 ? Math.round((executed / total) * 100) : 0,
      passRate: executed > 0 ? Math.round((passed / executed) * 100) : 0,
    };
  }, [cycle]);

  // Map scope data to component format
  const scope = useMemo(() => scopeData.map(s => ({
    id: s.id,
    cycle_id: s.cycle_id,
    case_id: s.case_id,
    assigned_to: s.assigned_to,
    current_status: s.status?.toLowerCase() || 'not_run',
    latest_run_id: s.last_run_id,
    created_at: s.created_at,
    updated_at: s.created_at,
    test_case: s.test_case ? {
      id: s.test_case.id,
      case_key: s.test_case.key,
      title: s.test_case.title,
      priority: s.test_case.priority,
    } : undefined,
    assignee: s.assignee,
  })), [scopeData]);

  // Map runs to component format
  const runs = useMemo(() => runsData.map(r => ({
    id: r.id,
    cycle_id: r.cycle_id,
    scope_id: r.scope_id,
    case_id: r.case_id,
    run_number: r.run_number,
    status: r.status?.toLowerCase() || 'not_run',
    executed_by: r.executed_by,
    started_at: r.started_at,
    completed_at: r.completed_at,
    duration_seconds: r.duration_seconds,
    test_case: r.test_case ? {
      id: r.test_case.id,
      case_key: r.test_case.key,
      title: r.test_case.title,
    } : undefined,
    executor: r.executor,
  })), [runsData]);

  // Map cases for adding to scope
  const cases = casesData?.cases || [];

  // Handlers
  const handleBack = () => navigate('/tests/cycles');

  const handleStatusChange = async (status: CycleStatus) => {
    if (!cycle || !projectId) return;
    if (status === 'completed') {
      setCompleteConfirmOpen(true);
      return;
    }
    updateCycleMutation.mutate({ 
      id: cycle.id, 
      status: mapStatusToHook(status),
      project_id: projectId 
    });
  };

  const handleComplete = async () => {
    if (!cycle || !projectId) return;
    completeCycleMutation.mutate({ id: cycle.id, project_id: projectId }, {
      onSuccess: () => setCompleteConfirmOpen(false),
    });
  };

  const handleClone = async () => {
    if (!cycle || !projectId) return;
    cloneCycleMutation.mutate({ id: cycle.id, project_id: projectId }, {
      onSuccess: (newCycle) => {
        if (newCycle?.id) navigate(`/tests/cycles/${newCycle.id}`);
      },
    });
  };

  const handleRerunFailed = async () => {
    if (!cycle || !projectId) return;
    rerunFailedMutation.mutate({ cycle_id: cycle.id });
  };

  const handleAddCases = async (caseIds: string[]) => {
    if (!cycle || !projectId) return;
    addCasesMutation.mutate({ cycle_id: cycle.id, case_ids: caseIds }, {
      onSuccess: () => setAddCasesModalOpen(false),
    });
  };

  const handleRemoveFromScope = async (scopeIds: string[]) => {
    if (!cycle || !projectId) return;
    removeCasesMutation.mutate({ cycle_id: cycle.id, scope_ids: scopeIds });
  };

  const handleAssign = async (data: { mode: 'single' | 'round-robin'; userId?: string; userIds?: string[] }) => {
    if (!cycle || selectedScopeIds.length === 0 || !projectId) return;
    
    if (data.mode === 'single' && data.userId) {
      // Assign all selected to single user
      assignTesterMutation.mutate({ cycle_id: cycle.id, scope_ids: selectedScopeIds, assigned_to: data.userId });
    } else if (data.mode === 'round-robin' && data.userIds && data.userIds.length >= 2) {
      // For round-robin, split into groups and assign
      const userIds = data.userIds;
      for (let i = 0; i < userIds.length; i++) {
        const scopeSubset = selectedScopeIds.filter((_, idx) => idx % userIds.length === i);
        if (scopeSubset.length > 0) {
          assignTesterMutation.mutate({ cycle_id: cycle.id, scope_ids: scopeSubset, assigned_to: userIds[i] });
        }
      }
    }
    setAssignModalOpen(false);
    setSelectedScopeIds([]);
    toast.success('Cases assigned successfully');
  };

  const handleExecute = (scopeId: string) => {
    // Navigate to full-page execution runner
    navigate(`/tests/execution/${cycleId}/${scopeId}`);
  };

  const handleStartExecution = () => {
    // Start from first unexecuted case
    const firstUnexecuted = scope.find(s => 
      s.current_status === 'not_run' || s.current_status === 'in_progress'
    ) || scope[0];
    if (firstUnexecuted) {
      navigate(`/tests/execution/${cycleId}/${firstUnexecuted.id}`);
    } else {
      navigate(`/tests/execution/${cycleId}`);
    }
  };

  const handleViewRuns = (scopeId: string) => {
    setActiveTab('runs');
  };

  const handleUpdate = async (data: any) => {
    if (!cycle || !projectId) return;
    updateCycleMutation.mutate({ 
      id: cycle.id, 
      name: data.title || data.name,
      description: data.description,
      environment: data.environment_id,
      planned_start_date: data.planned_start,
      planned_end_date: data.planned_end,
      project_id: projectId 
    }, {
      onSuccess: () => setEditModalOpen(false),
    });
  };

  if (cycleLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-xl font-medium mb-2">Cycle not found</h2>
        <p className="text-muted-foreground mb-4">The test cycle you're looking for doesn't exist.</p>
        <Button onClick={handleBack}>Back to Cycles</Button>
      </div>
    );
  }

  // Map cycle status for display
  const displayStatus = mapCycleStatus(cycle.status);
  const statusInfo = STATUS_CONFIG[displayStatus];
  const StatusIcon = statusInfo.icon;
  const isReadOnly = displayStatus === 'completed' || displayStatus === 'cancelled';

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1 -ml-2"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cycles
        </Button>

        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold">
                {cycle.key}: {cycle.name}
              </h2>
              <Select value={displayStatus} onValueChange={(v) => handleStatusChange(v as CycleStatus)}>
                <SelectTrigger className={cn('w-[140px] h-8', statusInfo.class)}>
                  <StatusIcon className="h-3.5 w-3.5 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-3.5 w-3.5" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              {cycle.environment && `${cycle.environment} • `}
              {cycle.planned_start_date && cycle.planned_end_date && (
                `${format(new Date(cycle.planned_start_date), 'MMM d')} - ${format(new Date(cycle.planned_end_date), 'MMM d, yyyy')}`
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {displayStatus === 'active' && stats.total > 0 && (
              <Button size="sm" onClick={handleStartExecution} className="bg-teal-600 hover:bg-teal-700">
                <Play className="h-4 w-4 mr-1" />
                Start Execution
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={handleClone}>
              <Copy className="h-4 w-4 mr-1" />
              Clone
            </Button>
            {stats.failed > 0 && (
              <Button variant="outline" size="sm" onClick={handleRerunFailed}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Re-run Failed
              </Button>
            )}
            {displayStatus === 'active' && (
              <Button variant="outline" size="sm" onClick={() => setCompleteConfirmOpen(true)}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete Cycle
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleStatusChange('cancelled')}>
                  <Ban className="h-4 w-4 mr-2" />
                  Cancel Cycle
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Cycle
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full flex">
              {stats.passed > 0 && (
                <div 
                  className="bg-success h-full" 
                  style={{ width: `${(stats.passed / (stats.total || 1)) * 100}%` }} 
                />
              )}
              {stats.failed > 0 && (
                <div 
                  className="bg-danger h-full" 
                  style={{ width: `${(stats.failed / (stats.total || 1)) * 100}%` }} 
                />
              )}
              {stats.blocked > 0 && (
                <div 
                  className="bg-warning h-full" 
                  style={{ width: `${(stats.blocked / (stats.total || 1)) * 100}%` }} 
                />
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{stats.progress}% Complete</span>
            {stats.total > 0 && (
              <span className={cn(
                'font-medium',
                stats.passRate >= 80 ? 'text-success' : stats.passRate >= 60 ? 'text-warning' : 'text-danger'
              )}>
                Pass Rate: {stats.passRate}%
              </span>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 py-3 border-y border-border-subtle">
          <div className="flex-1 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-2xl font-bold text-success">{stats.passed}</div>
            <div className="text-xs text-muted-foreground">
              Passed • {stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0}%
            </div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-2xl font-bold text-danger">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">
              Failed • {stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0}%
            </div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-2xl font-bold text-warning">{stats.blocked}</div>
            <div className="text-xs text-muted-foreground">
              Blocked • {stats.total > 0 ? Math.round((stats.blocked / stats.total) * 100) : 0}%
            </div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{stats.notRun}</div>
            <div className="text-xs text-muted-foreground">
              Not Run • {stats.total > 0 ? Math.round((stats.notRun / stats.total) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="scope">
            Scope ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="runs">
            Runs ({runs.length})
          </TabsTrigger>
          <TabsTrigger value="defects">
            Defects ({defectsData.length})
          </TabsTrigger>
          <TabsTrigger value="reports">
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scope" className="mt-4">
          <CycleScopeTable
            scope={scope as any}
            onExecute={handleExecute}
            onAddCases={() => setAddCasesModalOpen(true)}
            onAssign={(ids) => {
              setSelectedScopeIds(ids);
              setAssignModalOpen(true);
            }}
            onRemove={handleRemoveFromScope}
            onViewRuns={handleViewRuns}
            isReadOnly={isReadOnly}
          />
        </TabsContent>

        <TabsContent value="runs" className="mt-4">
          <CycleRunsTable
            runs={runs as any}
            onViewRun={(runId) => {
              // Could open a run detail modal
              toast.info('Run details coming soon');
            }}
          />
        </TabsContent>

        <TabsContent value="defects" className="mt-4">
          <CycleDefectsTable
            defects={defectsData as any}
            onViewDefect={(defectId) => {
              navigate(`/tests/defects?defectId=${defectId}`);
            }}
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <CycleReportsTab
            statistics={{
              total_cases: stats.total,
              not_run_count: stats.notRun,
              passed_count: stats.passed,
              failed_count: stats.failed,
              blocked_count: stats.blocked,
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateCycleModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        cycle={{
          id: cycle.id,
          project_id: cycle.project_id,
          cycle_key: cycle.key,
          title: cycle.name,
          description: cycle.description,
          status: displayStatus,
          planned_start: cycle.planned_start_date,
          planned_end: cycle.planned_end_date,
          environment_id: cycle.environment || undefined,
          created_at: cycle.created_at,
          updated_at: cycle.updated_at,
        } as any}
        onSubmit={handleUpdate}
        isLoading={updateCycleMutation.isPending}
      />

      <AddCasesToScopeModal
        open={addCasesModalOpen}
        onOpenChange={setAddCasesModalOpen}
        cases={cases.map(c => ({ ...c, case_key: c.key, is_template: false })) as any}
        existingScope={scope as any}
        onSubmit={handleAddCases}
        isLoading={addCasesMutation.isPending}
      />

      <AssignTestersModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        selectedCount={selectedScopeIds.length}
        teamMembers={teamMembers.map(m => ({ id: m.id, full_name: m.full_name, current_case_count: 0 }))}
        onSubmit={handleAssign}
        isLoading={assignTesterMutation.isPending}
      />

      {/* Execution Modal removed - now using full-page runner at /tests/execution/:cycleId/:scopeId */}

      {/* Complete Confirmation */}
      <AlertDialog open={completeConfirmOpen} onOpenChange={setCompleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Test Cycle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to complete this cycle? This will mark the cycle as completed
              and lock it from further changes.
              {stats.notRun > 0 && (
                <span className="block mt-2 text-warning">
                  Warning: {stats.notRun} test case(s) have not been executed.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete}>
              Complete Cycle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default CycleDetailPage;
