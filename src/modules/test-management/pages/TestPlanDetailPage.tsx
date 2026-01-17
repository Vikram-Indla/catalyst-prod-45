/**
 * TestPlanDetailPage - Detail view for a single test plan
 * Catalyst V5 design tokens
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit2, 
  Copy, 
  Play, 
  Archive, 
  MoreHorizontal,
  Calendar,
  Target,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  useTestPlan, 
  useTestPlanStats, 
  useTransitionPlanStatus,
  useCloneTestPlan,
  useArchiveTestPlan
} from '../hooks/useTestPlans';
import { TestPlanStatsCards } from '../components/plans/TestPlanStatsCards';
import { TestPlanDetailTabs } from '../components/plans/TestPlanDetailTabs';
import { TestPlanStatusBadge } from '../components/plans/TestPlanStatusBadge';
import { AddTestCasesToPlanDialog } from '../components/plans/AddTestCasesToPlanDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

export function TestPlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const [addCasesOpen, setAddCasesOpen] = useState(false);

  const { data: plan, isLoading, error } = useTestPlan(planId);
  const { data: stats, isLoading: statsLoading } = useTestPlanStats(planId);
  const transitionMutation = useTransitionPlanStatus();
  const cloneMutation = useCloneTestPlan();
  const archiveMutation = useArchiveTestPlan();

  const handleBack = () => {
    navigate('/tests/plans');
  };

  const handleStartExecution = async () => {
    if (!plan) return;
    try {
      await transitionMutation.mutateAsync({ planId: plan.id, newStatus: 'executing' });
      toast.success('Execution started');
    } catch {
      // Error handled by mutation
    }
  };

  const handleArchive = async () => {
    if (!plan) return;
    if (!confirm('Archive this test plan?')) return;
    try {
      await archiveMutation.mutateAsync(plan.id);
    } catch {
      // Error handled by mutation
    }
  };

  const handleClone = async () => {
    if (!plan) return;
    const newName = prompt('Enter name for cloned plan:', `${plan.name} (Copy)`);
    if (!newName) return;
    try {
      const newPlan = await cloneMutation.mutateAsync({ planId: plan.id, newName });
      navigate(`/tests/plans/${newPlan.id}`);
    } catch {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-8 text-center">
          <h2 className="text-lg font-semibold text-destructive">Test Plan Not Found</h2>
          <Button variant="outline" className="mt-4" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Plans
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack} className="mt-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-sm text-primary font-medium">{plan.key}</span>
              <TestPlanStatusBadge status={plan.status} />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">{plan.name}</h1>
            {plan.description && (
              <p className="text-muted-foreground mt-1 max-w-2xl">{plan.description}</p>
            )}
            <div className="flex items-center gap-6 mt-3 text-sm text-muted-foreground">
              {plan.release && (
                <div className="flex items-center gap-1.5">
                  <Target className="w-4 h-4" />
                  <span>{plan.release.name}</span>
                </div>
              )}
              {(plan.start_date || plan.end_date) && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {plan.start_date ? format(new Date(plan.start_date), 'MMM d') : '—'}
                    {' – '}
                    {plan.end_date ? format(new Date(plan.end_date), 'MMM d, yyyy') : '—'}
                  </span>
                </div>
              )}
              {plan.owner && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={plan.owner.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {plan.owner.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span>{plan.owner.full_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setAddCasesOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Test Cases
          </Button>
          {plan.status === 'active' && (
            <Button onClick={handleStartExecution}>
              <Play className="w-4 h-4 mr-2" />
              Start Execution
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/tests/plans/${plan.id}?edit=true`)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Plan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleClone}>
                <Copy className="w-4 h-4 mr-2" />
                Clone Plan
              </DropdownMenuItem>
              {plan.status !== 'archived' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleArchive}>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Plan
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mb-6">
        <TestPlanStatsCards stats={stats} isLoading={statsLoading} />
      </div>

      <TestPlanDetailTabs 
        plan={plan} 
        onAddTestCases={() => setAddCasesOpen(true)}
        onStartExecution={handleStartExecution}
      />

      <AddTestCasesToPlanDialog
        open={addCasesOpen}
        onOpenChange={setAddCasesOpen}
        planId={plan.id}
        planKey={plan.key}
        projectId=""
      />
    </div>
  );
}

export default TestPlanDetailPage;
