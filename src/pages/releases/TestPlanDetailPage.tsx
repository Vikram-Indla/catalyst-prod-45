/**
 * TestPlanDetailPage — Detailed view for a single test plan
 * 
 * Features:
 * - Plan overview and health metrics
 * - Test cases list with execution status
 * - Add/remove test cases
 * - Inline editing of plan details
 * - Activity timeline
 */

import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  MoreHorizontal,
  Plus,
  Trash2,
  Copy,
  Calendar,
  Users,
  Target,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Play,
  Pause,
  Archive,
  RefreshCcw,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useTestPlan,
  useTestPlanCases,
  useTestPlanHealth,
  useUpdateTestPlan,
  useDeleteTestPlan,
  useCloneTestPlan,
  useRemoveCasesFromPlan,
} from '@/hooks/test-management';
import { TestPlanStatus } from '@/types/test-management';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<TestPlanStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: FileText },
  active: { label: 'Active', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Play },
  completed: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle2 },
  archived: { label: 'Archived', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: Archive },
};

export default function TestPlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  // Fetch data
  const { data: plan, isLoading: planLoading } = useTestPlan(planId);
  const { data: planCases, isLoading: casesLoading } = useTestPlanCases(planId);
  const health = useTestPlanHealth(plan || undefined);

  // Mutations
  const updatePlanMutation = useUpdateTestPlan();
  const deletePlanMutation = useDeleteTestPlan();
  const clonePlanMutation = useCloneTestPlan();
  const removeCasesMutation = useRemoveCasesFromPlan();

  // Selection
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());

  // Active tab
  const [activeTab, setActiveTab] = useState('overview');

  // Handlers
  const handleBack = () => navigate('/releases/test-plans');

  const handleStatusChange = useCallback(async (newStatus: TestPlanStatus) => {
    if (!planId) return;
    try {
      await updatePlanMutation.mutateAsync({ id: planId, status: newStatus });
      toast.success(`Plan status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  }, [planId, updatePlanMutation]);

  const handleClone = useCallback(async () => {
    if (!planId) return;
    try {
      const cloned = await clonePlanMutation.mutateAsync(planId);
      toast.success('Test plan cloned');
      navigate(`/releases/test-plans/${cloned.id}`);
    } catch (error) {
      toast.error('Failed to clone test plan');
    }
  }, [planId, clonePlanMutation, navigate]);

  const handleDelete = useCallback(async () => {
    if (!planId) return;
    try {
      await deletePlanMutation.mutateAsync(planId);
      toast.success('Test plan deleted');
      navigate('/releases/test-plans');
    } catch (error) {
      toast.error('Failed to delete test plan');
    }
  }, [planId, deletePlanMutation, navigate]);

  const handleRemoveSelectedCases = useCallback(async () => {
    if (!planId || selectedCaseIds.size === 0) return;
    try {
      await removeCasesMutation.mutateAsync({
        planId,
        caseIds: Array.from(selectedCaseIds),
      });
      setSelectedCaseIds(new Set());
      toast.success(`Removed ${selectedCaseIds.size} test case(s)`);
    } catch (error) {
      toast.error('Failed to remove test cases');
    }
  }, [planId, selectedCaseIds, removeCasesMutation]);

  if (planLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Test Plan Not Found</h3>
          <p className="text-muted-foreground mb-6">
            The test plan you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Test Plans
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[plan.status];
  const StatusIcon = statusConfig.icon;

  // Calculate stats
  const executed = plan.passed_count + plan.failed_count + plan.blocked_count + plan.skipped_count;
  const progress = plan.total_tests > 0 ? Math.round((executed / plan.total_tests) * 100) : 0;
  const passRate = executed > 0 ? Math.round((plan.passed_count / executed) * 100) : 0;

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground">{plan.plan_key}</span>
              <Badge variant="outline" className={cn(statusConfig.bgColor, statusConfig.color, 'border-0 gap-1')}>
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </Badge>
              {health && health.isOverdue && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Overdue
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground">{plan.name}</h1>
            {plan.description && (
              <p className="text-muted-foreground max-w-2xl">{plan.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background">
              {plan.status === 'draft' && (
                <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                  <Play className="w-4 h-4 mr-2" />
                  Activate Plan
                </DropdownMenuItem>
              )}
              {plan.status === 'active' && (
                <>
                  <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Complete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('draft')}>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause (Draft)
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => handleStatusChange('archived')}>
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleClone}>
                <Copy className="w-4 h-4 mr-2" />
                Clone Plan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tests</p>
                <p className="text-2xl font-bold">{plan.total_tests}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Execution Progress</p>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">{executed} of {plan.total_tests} executed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className={cn(
                  "text-2xl font-bold",
                  passRate >= 80 ? "text-green-600" : passRate >= 50 ? "text-amber-600" : "text-red-600"
                )}>
                  {passRate}%
                </p>
              </div>
              <CheckCircle2 className={cn(
                "w-8 h-8",
                passRate >= 80 ? "text-green-200" : passRate >= 50 ? "text-amber-200" : "text-red-200"
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-600">Passed</span>
                  <span className="font-medium">{plan.passed_count}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-600">Failed</span>
                  <span className="font-medium">{plan.failed_count}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-600">Blocked</span>
                  <span className="font-medium">{plan.blocked_count}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Not Run</span>
                  <span className="font-medium">{plan.not_run_count}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Days Remaining</p>
                <p className={cn(
                  "text-2xl font-bold",
                  health?.isOverdue ? "text-red-600" : health?.daysRemaining !== null && health.daysRemaining <= 3 ? "text-amber-600" : "text-foreground"
                )}>
                  {health?.daysRemaining !== null ? (health.isOverdue ? '0' : health.daysRemaining) : '—'}
                </p>
              </div>
              <Clock className={cn(
                "w-8 h-8",
                health?.isOverdue ? "text-red-200" : "text-muted-foreground/30"
              )} />
            </div>
            {plan.end_date && (
              <p className="text-xs text-muted-foreground mt-1">
                Due: {format(new Date(plan.end_date), 'MMM d, yyyy')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="test-cases">
            Test Cases
            {plan.total_tests > 0 && (
              <Badge variant="secondary" className="ml-2">{plan.total_tests}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plan Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Plan Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {plan.objectives && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Objectives
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.objectives}</p>
                  </div>
                )}

                {plan.in_scope && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">In Scope</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.in_scope}</p>
                  </div>
                )}

                {plan.out_of_scope && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Out of Scope</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.out_of_scope}</p>
                  </div>
                )}

                {plan.test_strategy && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Test Strategy</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.test_strategy}</p>
                  </div>
                )}

                {plan.environment_requirements && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Environment Requirements</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.environment_requirements}</p>
                  </div>
                )}

                {!plan.objectives && !plan.in_scope && !plan.test_strategy && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No plan details added yet.</p>
                    <Button variant="outline" size="sm" className="mt-3">
                      <Edit2 className="w-4 h-4 mr-2" />
                      Add Details
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Meta Info */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Owner</span>
                    {plan.owner ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={plan.owner.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {(plan.owner.full_name || 'U').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{plan.owner.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Start Date</span>
                    <span className="text-sm font-medium">
                      {plan.start_date ? format(new Date(plan.start_date), 'MMM d, yyyy') : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">End Date</span>
                    <span className="text-sm font-medium">
                      {plan.end_date ? format(new Date(plan.end_date), 'MMM d, yyyy') : '—'}
                    </span>
                  </div>

                  <Separator />

                  {plan.release && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Release</span>
                      <Badge variant="outline">{plan.release.name}</Badge>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm">{format(new Date(plan.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </CardContent>
              </Card>

              {plan.team_members && plan.team_members.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Team Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {plan.team_members.length} member(s)
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="test-cases" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Test Cases</CardTitle>
                <CardDescription>
                  {planCases?.length || 0} test cases in this plan
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {selectedCaseIds.size > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleRemoveSelectedCases}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Selected ({selectedCaseIds.size})
                  </Button>
                )}
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Test Cases
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {casesLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : !planCases || planCases.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <h4 className="font-medium mb-1">No Test Cases</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add test cases to this plan to start tracking execution.
                  </p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Test Cases
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={selectedCaseIds.size === planCases.length && planCases.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCaseIds(new Set(planCases.map(c => c.test_case_id)));
                            } else {
                              setSelectedCaseIds(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Test Case</TableHead>
                      <TableHead className="w-[100px]">Priority</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[120px]">Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planCases.map(pc => (
                      <TableRow key={pc.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCaseIds.has(pc.test_case_id)}
                            onCheckedChange={(checked) => {
                              setSelectedCaseIds(prev => {
                                const next = new Set(prev);
                                if (checked) next.add(pc.test_case_id);
                                else next.delete(pc.test_case_id);
                                return next;
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {pc.test_case?.title || 'Unknown Test Case'}
                            </p>
                            {pc.test_case?.case_key && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {pc.test_case.case_key}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {pc.test_case?.priority || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {pc.test_case?.status || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(pc.added_at), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Recent changes and updates to this test plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto opacity-30 mb-3" />
                <p>Activity timeline coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
