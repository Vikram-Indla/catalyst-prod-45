/**
 * PROJECT TESTS VIEW
 * Fully functional test management within project context
 * Uses real Supabase data, proper routing, and working CRUD
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { 
  FlaskConical, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ListChecks,
  FileText,
  Play,
  Plus,
  Search,
  Filter,
  ChevronDown,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// Hooks
import { useProjectContext } from '@/hooks/useProjectContext';
import {
  useProjectTestSummary,
  useProjectRecentFailures,
  useProjectCoverageByFeature,
  useProjectCycleProgress,
  useProjectTestCases,
  useProjectTestCycles,
  useProjectExecutions,
} from '@/hooks/useProjectTestMetrics';

// Reuse existing components from in-jira module
import { CreateTestCaseModal } from '@/modules/in-jira/components/tests/CreateTestCaseModal';
import { TestCaseDrawer } from '@/modules/in-jira/components/tests/TestCaseDrawer';

// ═══════════════════════════════════════════════════════════════════
// METRIC CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  isLoading?: boolean;
}

function MetricCard({ title, value, icon, trend, trendUp, isLoading }: MetricCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-surface-2 border-border-default">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-surface-2 border-border-default">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-text-tertiary">{title}</p>
            <p className="text-2xl font-semibold text-text-primary mt-1">{value}</p>
            {trend && (
              <p className={cn('text-xs mt-1', trendUp ? 'text-status-success' : 'text-status-error')}>
                {trend}
              </p>
            )}
          </div>
          <div className="p-2 bg-surface-3 rounded-lg">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════

function OverviewTab({ projectId }: { projectId: string }) {
  const { data: cycleProgress, isLoading: cyclesLoading } = useProjectCycleProgress(projectId);
  const { data: recentFailures, isLoading: failuresLoading } = useProjectRecentFailures(projectId);
  const { data: coverage, isLoading: coverageLoading } = useProjectCoverageByFeature(projectId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Cycle Progress */}
        <Card className="bg-surface-2 border-border-default">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-text-primary">
              Current Cycle Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cyclesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : cycleProgress?.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active cycles</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cycleProgress?.map(cycle => (
                  <div key={cycle.id}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-text-secondary">{cycle.name}</span>
                      <span className="text-text-primary font-medium">{cycle.progress}%</span>
                    </div>
                    <Progress value={cycle.progress} className="h-2" />
                    <div className="grid grid-cols-4 gap-2 text-center text-xs mt-2">
                      <div>
                        <p className="text-status-success font-medium">{cycle.passed}</p>
                        <p className="text-text-quaternary">Passed</p>
                      </div>
                      <div>
                        <p className="text-status-error font-medium">{cycle.failed}</p>
                        <p className="text-text-quaternary">Failed</p>
                      </div>
                      <div>
                        <p className="text-status-warning font-medium">{cycle.blocked}</p>
                        <p className="text-text-quaternary">Blocked</p>
                      </div>
                      <div>
                        <p className="text-text-tertiary font-medium">{cycle.notRun}</p>
                        <p className="text-text-quaternary">Not Run</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Failures */}
        <Card className="bg-surface-2 border-border-default">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-text-primary">
              Recent Failures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {failuresLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentFailures?.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-status-success opacity-50" />
                <p className="text-sm">No recent failures</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentFailures?.map(failure => (
                  <div
                    key={failure.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-3 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <XCircle className="h-4 w-4 text-status-error" />
                      <div>
                        <p className="text-sm font-medium text-text-primary truncate max-w-[200px]">
                          {failure.testCaseTitle}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {failure.cycleKey} • {failure.executedAt ? format(new Date(failure.executedAt), 'MMM d') : '—'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-status-error border-status-error/30">
                      Failed
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coverage by Feature */}
      <Card className="bg-surface-2 border-border-default">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-text-primary">
            Test Coverage by Feature
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coverageLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : coverage?.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No features with test coverage yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {coverage?.map(feature => (
                <div key={feature.featureId} className="p-3 bg-surface-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary truncate max-w-[150px]">
                      {feature.featureName}
                    </span>
                    <span className="text-xs text-text-secondary">{feature.totalCases} cases</span>
                  </div>
                  <Progress value={feature.coverage} className="h-1.5" />
                  <p className="text-xs text-text-tertiary mt-1">{feature.coverage}% covered</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TEST CASES TAB
// ═══════════════════════════════════════════════════════════════════

function TestCasesTab({ projectId, programId }: { projectId: string; programId: string | null }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<any>(null);

  const {
    testCases,
    isLoading,
    error,
    createTestCase,
    updateTestCase,
    deleteTestCase,
    isCreating,
    isUpdating,
  } = useProjectTestCases(projectId);

  const filteredCases = useMemo(() => {
    if (!searchQuery) return testCases;
    const q = searchQuery.toLowerCase();
    return testCases.filter(tc =>
      tc.title?.toLowerCase().includes(q) ||
      tc.description?.toLowerCase().includes(q) ||
      tc.component?.toLowerCase().includes(q)
    );
  }, [testCases, searchQuery]);

  const handleRowClick = (tc: any) => {
    setSelectedTestCase(tc);
    setDrawerOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-status-error bg-status-error/10';
      case 'high': return 'text-status-warning bg-status-warning/10';
      case 'medium': return 'text-accent-primary bg-accent-subtle';
      case 'low': return 'text-text-tertiary bg-surface-3';
      default: return 'text-text-tertiary bg-surface-3';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-status-success bg-status-success/10';
      case 'approved': return 'text-accent-primary bg-accent-subtle';
      case 'under_review': return 'text-status-warning bg-status-warning/10';
      case 'draft': return 'text-text-tertiary bg-surface-3';
      case 'deprecated': return 'text-status-error bg-status-error/10';
      default: return 'text-text-tertiary bg-surface-3';
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load test cases: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              placeholder="Search test cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-surface-2 border-border-default"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Test Case
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : filteredCases.length === 0 ? (
        <Card className="bg-surface-2 border-border-default p-8 text-center">
          <ListChecks className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No Test Cases</h3>
          <p className="text-text-secondary mb-4">
            {searchQuery ? 'No test cases match your search.' : 'Create your first test case to get started.'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Test Case
            </Button>
          )}
        </Card>
      ) : (
        <div className="border border-border-default rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-2 border-b border-border-default">
              <tr className="text-left text-xs text-text-tertiary uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium w-24">Priority</th>
                <th className="px-4 py-3 font-medium w-28">Status</th>
                <th className="px-4 py-3 font-medium w-24">Type</th>
                <th className="px-4 py-3 font-medium w-32">Component</th>
                <th className="px-4 py-3 font-medium w-28">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {filteredCases.map(tc => (
                <tr
                  key={tc.id}
                  onClick={() => handleRowClick(tc)}
                  className="hover:bg-surface-hover cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-text-primary truncate max-w-[300px]">
                      {tc.title}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn('capitalize text-xs', getPriorityColor(tc.priority))}>
                      {tc.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn('text-xs', getStatusColor(tc.status))}>
                      {tc.status?.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary capitalize">
                    {tc.test_type}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary truncate max-w-[120px]">
                    {tc.component || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-tertiary">
                    {tc.created_at ? format(new Date(tc.created_at), 'MMM d, yyyy') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <CreateTestCaseModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        projectId={projectId}
        programId={programId || ''}
        onSubmit={async (data) => {
          await createTestCase({
            title: data.title,
            description: data.description,
            preconditions: data.preconditions,
            test_type: data.test_type,
            priority: data.priority,
            status: data.status,
            linked_work_item_id: data.linked_work_item_id,
            component: data.component,
            objective: data.objective,
          });
        }}
        isSubmitting={isCreating}
      />

      {/* Drawer */}
      <TestCaseDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        testCase={selectedTestCase}
        onUpdate={async (input) => {
          await updateTestCase(input);
          setSelectedTestCase((prev: any) => prev ? { ...prev, ...input } : null);
        }}
        onDelete={async (id) => {
          await deleteTestCase(id);
          setDrawerOpen(false);
        }}
        isUpdating={isUpdating}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TEST CYCLES TAB
// ═══════════════════════════════════════════════════════════════════

function TestCyclesTab({ projectId }: { projectId: string }) {
  const { cycles, isLoading, error, createCycle, isCreating } = useProjectTestCycles(projectId);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCycleName, setNewCycleName] = useState('');

  const handleCreate = async () => {
    if (!newCycleName.trim()) {
      toast.error('Cycle name is required');
      return;
    }
    await createCycle({ name: newCycleName });
    setNewCycleName('');
    setShowCreateForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'in_progress': return 'text-status-success bg-status-success/10';
      case 'completed': return 'text-accent-primary bg-accent-subtle';
      case 'planned': return 'text-text-tertiary bg-surface-3';
      default: return 'text-text-tertiary bg-surface-3';
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load cycles: {error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-text-primary">Test Cycles</h3>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Cycle
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="bg-surface-2 border-border-default p-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Cycle name..."
              value={newCycleName}
              onChange={(e) => setNewCycleName(e.target.value)}
              className="flex-1 bg-surface-1 border-border-default"
              autoFocus
            />
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Create
            </Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Cycles List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : cycles.length === 0 ? (
        <Card className="bg-surface-2 border-border-default p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No Test Cycles</h3>
          <p className="text-text-secondary mb-4">Create a test cycle to start executing tests.</p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create Cycle
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cycles.map((cycle: any) => {
            const execs = cycle.test_cycle_executions || [];
            const total = execs.length;
            const passed = execs.filter((e: any) => e.status === 'passed').length;
            const progress = total > 0 ? Math.round((passed / total) * 100) : 0;

            return (
              <Card key={cycle.id} className="bg-surface-2 border-border-default hover:border-accent-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono text-xs text-accent-primary">{cycle.key}</p>
                      <h4 className="font-medium text-text-primary mt-0.5">{cycle.name}</h4>
                    </div>
                    <Badge className={cn('text-xs', getStatusColor(cycle.status))}>
                      {cycle.status}
                    </Badge>
                  </div>
                  <Progress value={progress} className="h-1.5 mb-2" />
                  <div className="flex items-center justify-between text-xs text-text-tertiary">
                    <span>{total} executions</span>
                    <span>{progress}% passed</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXECUTIONS TAB
// ═══════════════════════════════════════════════════════════════════

function ExecutionsTab({ projectId }: { projectId: string }) {
  const { executions, isLoading, error, updateExecution, isUpdating } = useProjectExecutions(projectId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-status-success bg-status-success/10';
      case 'failed': return 'text-status-error bg-status-error/10';
      case 'blocked': return 'text-status-warning bg-status-warning/10';
      default: return 'text-text-tertiary bg-surface-3';
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateExecution({ id, status });
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load executions: {error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-text-primary">Test Executions</h3>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : executions.length === 0 ? (
        <Card className="bg-surface-2 border-border-default p-8 text-center">
          <Play className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No Executions</h3>
          <p className="text-text-secondary">Add test cases to a cycle and start executing.</p>
        </Card>
      ) : (
        <div className="border border-border-default rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-2 border-b border-border-default">
              <tr className="text-left text-xs text-text-tertiary uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Test Case</th>
                <th className="px-4 py-3 font-medium w-32">Cycle</th>
                <th className="px-4 py-3 font-medium w-28">Status</th>
                <th className="px-4 py-3 font-medium w-32">Executed</th>
                <th className="px-4 py-3 font-medium w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {executions.map((exec: any) => (
                <tr key={exec.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-text-primary">
                      {exec.test_case?.title || 'Unknown'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-accent-primary">
                      {exec.test_cycle?.key}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn('text-xs capitalize', getStatusColor(exec.status))}>
                      {exec.status || 'not_run'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-tertiary">
                    {exec.executed_at ? format(new Date(exec.executed_at), 'MMM d, HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-status-success"
                        onClick={() => handleStatusChange(exec.id, 'passed')}
                        disabled={isUpdating}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-status-error"
                        onClick={() => handleStatusChange(exec.id, 'failed')}
                        disabled={isUpdating}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-status-warning"
                        onClick={() => handleStatusChange(exec.id, 'blocked')}
                        disabled={isUpdating}
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function ProjectTestsView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const { projectName, programId, isLoading: contextLoading, error: contextError } = useProjectContext();
  const { data: summary, isLoading: summaryLoading, refetch } = useProjectTestSummary(projectId || null);

  // Determine active tab from URL
  const pathParts = location.pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  const activeTab = ['cases', 'cycles', 'executions'].includes(lastPart) ? lastPart : 'overview';

  const handleTabChange = (tab: string) => {
    if (tab === 'overview') {
      navigate(`/projects/${projectId}/tests${location.search}`);
    } else {
      navigate(`/projects/${projectId}/tests/${tab}${location.search}`);
    }
  };

  if (contextError) {
    return (
      <div className="h-full overflow-auto bg-surface-1 p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load project: {contextError.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-surface-1 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-accent-primary" />
              Test Management
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {projectName || 'Loading...'} • Manage test cases, cycles, and executions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Reports
            </Button>
            <Button size="sm" className="bg-accent-primary text-white hover:bg-accent-primary/90">
              <Play className="w-4 h-4 mr-2" />
              Run Tests
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Total Test Cases"
            value={summary?.totalCases ?? 0}
            icon={<ListChecks className="w-5 h-5 text-accent-primary" />}
            isLoading={summaryLoading}
          />
          <MetricCard
            title="Pass Rate"
            value={`${summary?.passRate ?? 0}%`}
            icon={<TrendingUp className="w-5 h-5 text-status-success" />}
            isLoading={summaryLoading}
          />
          <MetricCard
            title="Failed"
            value={summary?.failed ?? 0}
            icon={<XCircle className="w-5 h-5 text-status-error" />}
            isLoading={summaryLoading}
          />
          <MetricCard
            title="Blocked"
            value={summary?.blocked ?? 0}
            icon={<AlertTriangle className="w-5 h-5 text-status-warning" />}
            isLoading={summaryLoading}
          />
          <MetricCard
            title="Not Run"
            value={summary?.notRun ?? 0}
            icon={<Clock className="w-5 h-5 text-text-tertiary" />}
            isLoading={summaryLoading}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="bg-surface-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cases">Test Cases</TabsTrigger>
            <TabsTrigger value="cycles">Test Cycles</TabsTrigger>
            <TabsTrigger value="executions">Executions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            {projectId && <OverviewTab projectId={projectId} />}
          </TabsContent>

          <TabsContent value="cases" className="mt-0">
            {projectId && <TestCasesTab projectId={projectId} programId={programId} />}
          </TabsContent>

          <TabsContent value="cycles" className="mt-0">
            {projectId && <TestCyclesTab projectId={projectId} />}
          </TabsContent>

          <TabsContent value="executions" className="mt-0">
            {projectId && <ExecutionsTab projectId={projectId} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
