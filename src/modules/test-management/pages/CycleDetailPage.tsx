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
import { Badge } from '@/components/ui/badge';
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
import { useTestCycle, useUpdateTestCycle, useDuplicateCycle, useCompleteCycle, useAddCasesToCycle, useRemoveCasesFromCycle, useAssignTester } from '../hooks/useCycles';
import { useTestRuns, useRerunFailed } from '../hooks/useExecution';
import { useTestCases } from '../hooks/useCases';
import { 
  CycleScopeTable, 
  CycleRunsTable, 
  CycleDefectsTable, 
  CycleReportsTab,
  CreateCycleModal,
  AddCasesToScopeModal,
  AssignTestersModal
} from '../components/cycles';
import { ExecutionModal } from '../components/execution';
import type { CycleStatus } from '../api/types';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<CycleStatus, { label: string; class: string; icon: React.ElementType }> = {
  planned: { label: 'Planned', class: 'bg-muted text-muted-foreground', icon: Clock },
  active: { label: 'In Progress', class: 'bg-info/10 text-info border-info/20', icon: Play },
  completed: { label: 'Completed', class: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', class: 'bg-danger/10 text-danger border-danger/20', icon: XCircle },
};

// Mock team members - would come from API in production
const MOCK_TEAM_MEMBERS = [
  { id: '1', full_name: 'Ahmed Al-Rashid', current_case_count: 12 },
  { id: '2', full_name: 'Fatima Hassan', current_case_count: 8 },
  { id: '3', full_name: 'Mohammed Khan', current_case_count: 15 },
];

// Default project ID - in production this would come from context
const DEFAULT_PROJECT_ID = 'test-project-1';

export function CycleDetailPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('scope');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addCasesModalOpen, setAddCasesModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedScopeIds, setSelectedScopeIds] = useState<string[]>([]);
  const [executionScopeId, setExecutionScopeId] = useState<string | null>(null);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);

  // Fetch cycle data
  const { data: cycle, isLoading: cycleLoading } = useTestCycle(cycleId || null);
  
  // Fetch runs for this cycle
  const { data: runsData } = useTestRuns({ cycle_id: cycleId });
  
  // Fetch test cases for adding to scope
  const { data: casesData } = useTestCases({ project_id: DEFAULT_PROJECT_ID });

  // Mutations
  const updateCycle = useUpdateTestCycle();
  const duplicateCycle = useDuplicateCycle();
  const completeCycle = useCompleteCycle();
  const addCases = useAddCasesToCycle();
  const removeCases = useRemoveCasesFromCycle();
  const assignTester = useAssignTester();
  const rerunFailed = useRerunFailed();

  // Calculate stats
  const stats = useMemo(() => {
    if (!cycle?.statistics) {
      return { total: 0, passed: 0, failed: 0, blocked: 0, notRun: 0, progress: 0, passRate: 0 };
    }
    const s = cycle.statistics;
    const executed = s.total_cases - s.not_run_count;
    return {
      total: s.total_cases,
      passed: s.passed_count,
      failed: s.failed_count,
      blocked: s.blocked_count,
      notRun: s.not_run_count,
      progress: s.total_cases > 0 ? Math.round((executed / s.total_cases) * 100) : 0,
      passRate: executed > 0 ? Math.round((s.passed_count / executed) * 100) : 0,
    };
  }, [cycle]);

  const runs = runsData?.data || [];
  const cases = casesData?.data || [];

  // Handlers
  const handleBack = () => navigate('/tests/cycles');

  const handleStatusChange = async (status: CycleStatus) => {
    if (!cycle) return;
    if (status === 'completed') {
      setCompleteConfirmOpen(true);
      return;
    }
    try {
      await updateCycle.mutateAsync({ id: cycle.id, status });
    } catch (error) {
      // Handled by mutation
    }
  };

  const handleComplete = async () => {
    if (!cycle) return;
    try {
      await completeCycle.mutateAsync(cycle.id);
      setCompleteConfirmOpen(false);
    } catch (error) {
      // Handled by mutation
    }
  };

  const handleClone = async () => {
    if (!cycle) return;
    try {
      const newCycle = await duplicateCycle.mutateAsync({ id: cycle.id });
      navigate(`/tests/cycles/${newCycle.id}`);
    } catch (error) {
      // Handled by mutation
    }
  };

  const handleRerunFailed = async () => {
    if (!cycle) return;
    try {
      await rerunFailed.mutateAsync({ cycleId: cycle.id });
    } catch (error) {
      // Handled by mutation
    }
  };

  const handleAddCases = async (caseIds: string[]) => {
    if (!cycle) return;
    try {
      await addCases.mutateAsync({ cycleId: cycle.id, caseIds });
      setAddCasesModalOpen(false);
    } catch (error) {
      // Handled by mutation
    }
  };

  const handleRemoveFromScope = async (scopeIds: string[]) => {
    if (!cycle) return;
    try {
      await removeCases.mutateAsync({ cycleId: cycle.id, scopeIds });
    } catch (error) {
      // Handled by mutation
    }
  };

  const handleAssign = async (data: { mode: 'single' | 'round-robin'; userId?: string; userIds?: string[] }) => {
    if (!cycle || selectedScopeIds.length === 0) return;
    
    try {
      if (data.mode === 'single' && data.userId) {
        // Assign all selected to single user
        for (const scopeId of selectedScopeIds) {
          await assignTester.mutateAsync({ cycleId: cycle.id, scopeId, userId: data.userId });
        }
      } else if (data.mode === 'round-robin' && data.userIds && data.userIds.length >= 2) {
        // Round-robin assignment
        const userIds = data.userIds;
        for (let i = 0; i < selectedScopeIds.length; i++) {
          const userId = userIds[i % userIds.length];
          await assignTester.mutateAsync({ cycleId: cycle.id, scopeId: selectedScopeIds[i], userId });
        }
      }
      setAssignModalOpen(false);
      setSelectedScopeIds([]);
      toast.success('Cases assigned successfully');
    } catch (error) {
      // Handled by mutation
    }
  };

  const handleExecute = (scopeId: string) => {
    setExecutionScopeId(scopeId);
  };

  const handleViewRuns = (scopeId: string) => {
    setActiveTab('runs');
    // Could add additional filtering logic
  };

  const handleUpdate = async (data: any) => {
    if (!cycle) return;
    try {
      await updateCycle.mutateAsync({ id: cycle.id, ...data });
      setEditModalOpen(false);
    } catch (error) {
      // Handled by mutation
    }
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

  const statusInfo = STATUS_CONFIG[cycle.status];
  const StatusIcon = statusInfo.icon;
  const isReadOnly = cycle.status === 'completed' || cycle.status === 'cancelled';

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
                {cycle.cycle_key}: {cycle.title}
              </h2>
              <Select value={cycle.status} onValueChange={(v) => handleStatusChange(v as CycleStatus)}>
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
              {cycle.environment?.name && `${cycle.environment.name} • `}
              {cycle.planned_start && cycle.planned_end && (
                `${format(new Date(cycle.planned_start), 'MMM d')} - ${format(new Date(cycle.planned_end), 'MMM d, yyyy')}`
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            {cycle.status === 'active' && (
              <Button size="sm" onClick={() => setCompleteConfirmOpen(true)}>
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
            Defects (0)
          </TabsTrigger>
          <TabsTrigger value="reports">
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scope" className="mt-4">
          <CycleScopeTable
            scope={cycle.scope || []}
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
            runs={runs}
            onViewRun={(runId) => {
              // Could open a run detail modal
              toast.info('Run details coming soon');
            }}
          />
        </TabsContent>

        <TabsContent value="defects" className="mt-4">
          <CycleDefectsTable
            defects={[]}
            onViewDefect={(defectId) => {
              navigate(`/tests/defects?defectId=${defectId}`);
            }}
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <CycleReportsTab
            statistics={cycle.statistics || {
              total_cases: 0,
              not_run_count: 0,
              passed_count: 0,
              failed_count: 0,
              blocked_count: 0,
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateCycleModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        cycle={cycle}
        onSubmit={handleUpdate}
        isLoading={updateCycle.isPending}
      />

      <AddCasesToScopeModal
        open={addCasesModalOpen}
        onOpenChange={setAddCasesModalOpen}
        cases={cases}
        existingScope={cycle.scope || []}
        onSubmit={handleAddCases}
        isLoading={addCases.isPending}
      />

      <AssignTestersModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        selectedCount={selectedScopeIds.length}
        teamMembers={MOCK_TEAM_MEMBERS}
        onSubmit={handleAssign}
        isLoading={assignTester.isPending}
      />

      {/* Execution Modal */}
      {executionScopeId && (
        <ExecutionModal
          scopeId={executionScopeId}
          onClose={() => setExecutionScopeId(null)}
        />
      )}

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
