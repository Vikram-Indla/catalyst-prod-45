/**
 * TestPlanDetailTabs - Tabbed content for test plan detail page
 * Tabs: Overview, Test Cases, Executions, Defects
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, ExternalLink, Bug, Play, Calendar, Target, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { TestPlan, PlanTestCase } from '../../types/testPlans';
import { usePlanTestCases, usePlanDefects, useRemoveTestCaseFromPlan } from '../../hooks/useTestPlans';

interface TestPlanDetailTabsProps {
  plan: TestPlan;
  onAddTestCases: () => void;
  onStartExecution?: () => void;
}

export function TestPlanDetailTabs({ plan, onAddTestCases, onStartExecution }: TestPlanDetailTabsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: testCases = [], isLoading: casesLoading } = usePlanTestCases(plan.id);
  const { data: defects = [], isLoading: defectsLoading } = usePlanDefects(plan.id);
  const removeCaseMutation = useRemoveTestCaseFromPlan();

  const handleRemoveCase = async (testCaseId: string) => {
    if (!confirm('Remove this test case from the plan?')) return;
    await removeCaseMutation.mutateAsync({ planId: plan.id, testCaseId });
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="border-b border-border bg-transparent w-full justify-start h-auto p-0 rounded-none">
        <TabsTrigger
          value="overview"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
        >
          <FileText className="w-4 h-4 mr-2" />
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="test-cases"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
        >
          <Target className="w-4 h-4 mr-2" />
          Test Cases
          <Badge variant="secondary" className="ml-2 text-xs">
            {plan.total_tests}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="executions"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
        >
          <Play className="w-4 h-4 mr-2" />
          Executions
        </TabsTrigger>
        <TabsTrigger
          value="defects"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
        >
          <Bug className="w-4 h-4 mr-2" />
          Defects
          {defects.length > 0 && (
            <Badge variant="destructive" className="ml-2 text-xs">
              {defects.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Details Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Details</h3>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-muted-foreground">Release</dt>
                <dd className="text-sm font-medium text-foreground mt-1">
                  {plan.release?.name || '—'}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Start Date</dt>
                  <dd className="text-sm font-medium text-foreground mt-1">
                    {plan.start_date ? format(new Date(plan.start_date), 'MMM d, yyyy') : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">End Date</dt>
                  <dd className="text-sm font-medium text-foreground mt-1">
                    {plan.end_date ? format(new Date(plan.end_date), 'MMM d, yyyy') : '—'}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Owner</dt>
                <dd className="text-sm font-medium text-foreground mt-1">
                  {plan.owner?.full_name || '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Objectives Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Objectives</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {plan.objectives || 'No objectives defined.'}
            </p>
          </div>

          {/* In Scope Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">In Scope</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {plan.in_scope || 'No scope defined.'}
            </p>
          </div>

          {/* Out of Scope Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Out of Scope</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {plan.out_of_scope || 'No out-of-scope items defined.'}
            </p>
          </div>
        </div>
      </TabsContent>

      {/* Test Cases Tab */}
      <TabsContent value="test-cases" className="mt-6">
        <div className="bg-card rounded-xl border border-border">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Linked Test Cases
              <span className="ml-2 text-muted-foreground font-normal">({testCases.length})</span>
            </h3>
            <Button size="sm" onClick={onAddTestCases}>
              <Plus className="w-4 h-4 mr-1" />
              Add Test Cases
            </Button>
          </div>

          {/* List */}
          <div className="divide-y divide-border">
            {casesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              ))
            ) : testCases.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No test cases linked yet. Click "Add Test Cases" to get started.
              </div>
            ) : (
              testCases.map((link) => (
                <div key={link.id} className="p-4 flex items-center gap-4 hover:bg-muted/50">
                  <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    TC
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-muted-foreground">
                      {link.test_case?.case_key}
                    </div>
                    <div className="text-sm text-foreground truncate">
                      {link.test_case?.title}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveCase(link.test_case_id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </TabsContent>

      {/* Executions Tab */}
      <TabsContent value="executions" className="mt-6">
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <Play className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Test Executions</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start executing test cases to track progress and results.
          </p>
          {onStartExecution && (
            <Button onClick={onStartExecution}>
              <Play className="w-4 h-4 mr-2" />
              Start Execution
            </Button>
          )}
        </div>
      </TabsContent>

      {/* Defects Tab */}
      <TabsContent value="defects" className="mt-6">
        <div className="bg-card rounded-xl border border-border">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Related Defects
              <span className="ml-2 text-muted-foreground font-normal">({defects.length})</span>
            </h3>
          </div>

          <div className="divide-y divide-border">
            {defectsLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              ))
            ) : defects.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No defects linked to this test plan.
              </div>
            ) : (
              defects.map((defect: any) => (
                <div key={defect.id} className="p-4 flex items-center gap-4 hover:bg-muted/50">
                  <div className="w-8 h-8 rounded bg-danger/10 text-danger flex items-center justify-center shrink-0">
                    <Bug className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-muted-foreground">
                      {defect.defect_key}
                    </div>
                    <div className="text-sm text-foreground truncate">
                      {defect.title}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'capitalize',
                      defect.status === 'open' && 'border-danger text-danger',
                      defect.status === 'in_progress' && 'border-warning text-warning',
                      defect.status === 'resolved' && 'border-success text-success'
                    )}
                  >
                    {defect.status?.replace('_', ' ')}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export default TestPlanDetailTabs;
