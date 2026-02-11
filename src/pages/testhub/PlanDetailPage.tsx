/**
 * G26 Plan Detail / Editor Page
 * Route: /testhub/test-plans/:planId
 * Tabbed editor: Overview, Scope, Team, Schedule, Approvals
 */
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, ClipboardList, SendHorizontal, Loader2,
  FileText, Target, Users, Calendar, ShieldCheck, BookCopy, MoreVertical, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlanStatusBadge } from '@/components/test-plans/PlanStatusBadge';
import { OverviewTab } from '@/components/test-plans/OverviewTab';
import { ScopeTab } from '@/components/test-plans/ScopeTab';
import { TeamTab } from '@/components/test-plans/TeamTab';
import { ScheduleTab } from '@/components/test-plans/ScheduleTab';
import { ApprovalsTab } from '@/components/test-plans/ApprovalsTab';
import { SaveAsTemplateModal } from '@/components/test-plans/SaveAsTemplateModal';
import { useTestPlan, useUpdateTestPlan, useDeleteTestPlan } from '@/hooks/useTestPlansG26';
import { TestPlan, PlanStatus } from '@/types/testPlans';
import { toast } from 'sonner';

export default function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { data: plan, isLoading, isError } = useTestPlan(planId);
  const updatePlan = useUpdateTestPlan();
  const deletePlan = useDeleteTestPlan();
  const [showTemplate, setShowTemplate] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Partial<TestPlan>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = useCallback((updates: Partial<TestPlan>) => {
    setPendingUpdates(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSave = async () => {
    if (!plan || Object.keys(pendingUpdates).length === 0) return;
    setIsSaving(true);
    try {
      await updatePlan.mutateAsync({ id: plan.id, ...pendingUpdates } as any);
      setPendingUpdates({});
    } finally { setIsSaving(false); }
  };

  const handleStatusChange = async (newStatus: PlanStatus) => {
    if (!plan) return;
    await updatePlan.mutateAsync({ id: plan.id, status: newStatus } as any);
  };

  const handleDelete = async () => {
    if (!plan) return;
    if (!confirm(`Delete ${plan.plan_key}? This action cannot be undone.`)) return;
    await deletePlan.mutateAsync(plan.id);
    navigate('/testhub/test-plans');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (isError || !plan) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-lg font-medium">Plan not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/testhub/test-plans')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Plans
        </Button>
      </div>
    );
  }

  // Merge pending with live data for display
  const displayPlan: TestPlan = { ...plan, ...pendingUpdates };
  const hasPendingChanges = Object.keys(pendingUpdates).length > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Back + Header */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/testhub/test-plans')}>
        <ArrowLeft className="h-4 w-4 mr-2" />Back to Plans
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-sm text-primary bg-primary/10 px-3 py-1 rounded-md">{plan.plan_key}</span>
            <PlanStatusBadge status={plan.status} />
            {plan.release && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{plan.release.name}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold">{displayPlan.name}</h1>
          {plan.creator && (
            <p className="text-sm text-muted-foreground mt-1">Created by {plan.creator.full_name}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Save */}
          <Button onClick={handleSave} disabled={!hasPendingChanges || isSaving} variant={hasPendingChanges ? 'default' : 'outline'}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>

          {/* Submit for Approval */}
          {plan.status === 'draft' && (
            <Button variant="outline" onClick={() => handleStatusChange('pending_approval')}>
              <SendHorizontal className="h-4 w-4 mr-2" />Submit for Approval
            </Button>
          )}

          {/* Status Transitions */}
          {plan.status === 'approved' && (
            <Button onClick={() => handleStatusChange('in_progress')}>Start Execution</Button>
          )}
          {plan.status === 'in_progress' && (
            <Button onClick={() => handleStatusChange('completed')}>Mark Complete</Button>
          )}

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowTemplate(true)}>
                <BookCopy className="h-4 w-4 mr-2" />Save as Template
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />Delete Plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabbed Editor */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2"><FileText className="h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="scope" className="gap-2"><Target className="h-4 w-4" />Scope</TabsTrigger>
          <TabsTrigger value="team" className="gap-2"><Users className="h-4 w-4" />Team</TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2"><Calendar className="h-4 w-4" />Schedule</TabsTrigger>
          <TabsTrigger value="approvals" className="gap-2"><ShieldCheck className="h-4 w-4" />Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab plan={displayPlan} onUpdate={handleUpdate} />
        </TabsContent>

        <TabsContent value="scope" className="mt-6">
          <ScopeTab planId={plan.id} />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamTab planId={plan.id} />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <ScheduleTab plan={displayPlan} onUpdate={handleUpdate} />
        </TabsContent>

        <TabsContent value="approvals" className="mt-6">
          <ApprovalsTab planId={plan.id} planStatus={plan.status} />
        </TabsContent>
      </Tabs>

      {/* Save as Template */}
      <SaveAsTemplateModal open={showTemplate} onClose={() => setShowTemplate(false)} planId={plan.id} planName={plan.name} />
    </div>
  );
}
