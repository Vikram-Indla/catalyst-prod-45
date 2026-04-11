/**
 * G26 Plan Detail / Editor Page
 * Route: /testhub/test-plans/:planId
 * Tabbed editor: Overview, Scope, Team, Schedule, Approvals
 * DEF-S11-02: Total Tests from folder scope
 * DEF-S11-03: Linked Cycles section with cycle-driven status
 * DEF-S11-04: Release FK stored & clickable chip
 */
import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, ClipboardList, SendHorizontal, Loader2,
  FileText, Target, Users, Calendar, ShieldCheck, BookCopy, MoreVertical, Trash2,
  Link2, Plus, PlayCircle, X, ExternalLink, Bug
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PlanStatusBadge } from '@/components/test-plans/PlanStatusBadge';
import { OverviewTab } from '@/components/test-plans/OverviewTab';
import { ScopeTab } from '@/components/test-plans/ScopeTab';
import { TeamTab } from '@/components/test-plans/TeamTab';
import { ScheduleTab } from '@/components/test-plans/ScheduleTab';
import { ApprovalsTab } from '@/components/test-plans/ApprovalsTab';
import { SaveAsTemplateModal } from '@/components/test-plans/SaveAsTemplateModal';
import { AddToCycleModal } from '@/components/test-sets/AddToCycleModal';
import { CreateTestCycleModal } from '@/components/testhub/CreateTestCycleModal';
import {
  useTestPlan, useUpdateTestPlan, useDeleteTestPlan,
  usePlanLinkedCycles, useLinkCycleToPlan, useUnlinkCycleFromPlan,
  useScopeSummary,
} from '@/hooks/useTestPlansG26';
import { TestPlan, PlanStatus } from '@/types/testPlans';
import { toast } from 'sonner';
import { useDefectsByPlanId } from '@/hooks/useDefectsG25';
import { formatDistanceToNow } from 'date-fns';

const defectStatusColors: Record<string, { bg: string; color: string }> = {
  open:        { bg: '#DFE1E6', color: '#253858' },
  new:         { bg: '#DFE1E6', color: '#253858' },
  deferred:    { bg: '#DFE1E6', color: '#253858' },
  in_progress: { bg: '#DEEBFF', color: '#0747A6' },
  reopened:    { bg: '#DEEBFF', color: '#0747A6' },
  fixed:       { bg: '#E3FCEF', color: '#006644' },
  resolved:    { bg: '#E3FCEF', color: '#006644' },
  verified:    { bg: '#E3FCEF', color: '#006644' },
  closed:      { bg: '#E3FCEF', color: '#006644' },
};

const PlanDefectsPanel = ({ planId }: { planId?: string }) => {
  const { data: defects = [], isLoading } = useDefectsByPlanId(planId);
  const navigate = useNavigate();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-6">Loading defects...</p>;
  }

  if (defects.length === 0) {
    return (
      <div className="text-center py-12">
        <Bug className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No defects linked to this plan.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="border-b">
              {['Defect Key', 'Title', 'Status', 'Severity', 'Source'].map(h => (
                <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {defects.map((d: any) => {
              const sc = defectStatusColors[d.status] ?? { bg: '#DFE1E6', color: '#253858' };
              return (
                <tr key={d.id} className="border-b last:border-b-0" style={{ height: 36, maxHeight: 36 }}>
                  <td className="px-4 py-0">
                    <span
                      onClick={() => navigate(`/testhub/defects/${d.id}`)}
                      style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 500, color: '#2563EB', cursor: 'pointer' }}
                    >
                      {d.defect_key}
                    </span>
                  </td>
                  <td className="px-4 py-0 text-sm">{d.title}</td>
                  <td className="px-4 py-0">
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', padding: '2px 8px', borderRadius: 3, backgroundColor: sc.bg, color: sc.color }}>
                      {d.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-0 text-sm text-muted-foreground capitalize">{d.severity ?? '—'}</td>
                  <td className="px-4 py-0">
                    {d.link_source === 'auto_execution' && (
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Auto</span>
                    )}
                    {d.link_source === 'auto_jira' && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 3, backgroundColor: '#DEEBFF', color: '#0747A6' }}>Jira</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { data: plan, isLoading, isError } = useTestPlan(planId);
  const updatePlan = useUpdateTestPlan();
  const deletePlan = useDeleteTestPlan();
  const { data: linkedCycles } = usePlanLinkedCycles(planId || '');
  const { data: scopeSummary } = useScopeSummary(planId || '');
  const linkCycle = useLinkCycleToPlan();
  const unlinkCycle = useUnlinkCycleFromPlan();

  const [showTemplate, setShowTemplate] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Partial<TestPlan>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showCyclePicker, setShowCyclePicker] = useState(false);
  const [showCreateCycle, setShowCreateCycle] = useState(false);

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

  // DEF-S11-03: Derive plan execution state from linked cycles
  const cycleStats = useMemo(() => {
    if (!linkedCycles?.length) return { hasActive: false, allCompleted: false, count: 0, overallPassRate: 0 };
    const cycles = linkedCycles.filter(lc => lc.cycle);
    const hasActive = cycles.some(lc => lc.cycle?.status === 'active' || lc.cycle?.status === 'in_progress');
    const allCompleted = cycles.length > 0 && cycles.every(lc => lc.cycle?.status === 'completed');
    
    let totalPassed = 0, totalCases = 0;
    cycles.forEach(lc => {
      if (lc.cycle) {
        totalPassed += lc.cycle.passed_count || 0;
        totalCases += lc.cycle.total_cases || 0;
      }
    });
    const overallPassRate = totalCases > 0 ? Math.round((totalPassed / totalCases) * 100) : 0;
    
    return { hasActive, allCompleted, count: cycles.length, overallPassRate };
  }, [linkedCycles]);

  const handleLinkCycle = async (cycleId: string) => {
    if (!planId) return;
    await linkCycle.mutateAsync({ planId, cycleId });
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

  // DEF-S11-03: Determine if Mark Complete should be enabled
  const canMarkComplete = cycleStats.allCompleted && cycleStats.count > 0;
  const isAutoExecuting = cycleStats.hasActive;

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
            <PlanStatusBadge status={isAutoExecuting && plan.status === 'active' ? 'executing' : plan.status} />
            {/* DEF-S11-04: Clickable release chip */}
            {plan.release && (
              <button
                onClick={() => navigate(`/release-hub/${plan.release_id}`)}
                className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded flex items-center gap-1 hover:bg-muted/80 transition-colors"
              >
                {plan.release.name}
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
          <h1 className="text-2xl font-bold">{displayPlan.name}</h1>
          <div className="flex items-center gap-4 mt-1">
            {plan.creator && (
              <p className="text-sm text-muted-foreground">Created by {plan.creator.full_name}</p>
            )}
            {/* DEF-S11-03 Step 4: Execution summary */}
            {cycleStats.count > 0 && (
              <p className="text-sm text-muted-foreground">
                {cycleStats.count} cycle{cycleStats.count !== 1 ? 's' : ''} linked | {cycleStats.overallPassRate}% overall pass rate
              </p>
            )}
          </div>
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
          {plan.status === 'pending_approval' && (
            <Button onClick={() => handleStatusChange('active')}>Approve & Activate</Button>
          )}

          {/* DEF-S11-03: Mark Complete only when all linked cycles completed */}
          {(plan.status === 'active' || plan.status === 'executing') && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={() => handleStatusChange('completed')}
                      disabled={!canMarkComplete}
                    >
                      Mark Complete
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canMarkComplete && (
                  <TooltipContent>
                    <p>Link and complete at least one test cycle first</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
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
          <TabsTrigger value="cycles" className="gap-2"><PlayCircle className="h-4 w-4" />Cycles</TabsTrigger>
          <TabsTrigger value="team" className="gap-2"><Users className="h-4 w-4" />Team</TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2"><Calendar className="h-4 w-4" />Schedule</TabsTrigger>
          <TabsTrigger value="approvals" className="gap-2"><ShieldCheck className="h-4 w-4" />Approvals</TabsTrigger>
          <TabsTrigger value="defects" className="gap-2"><Bug className="h-4 w-4" />Defects</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab plan={displayPlan} onUpdate={handleUpdate} />
        </TabsContent>

        <TabsContent value="scope" className="mt-6">
          <ScopeTab planId={plan.id} />
        </TabsContent>

        {/* DEF-S11-03: Linked Cycles Tab */}
        <TabsContent value="cycles" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Linked Test Cycles</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowCyclePicker(true)}>
                  <Link2 className="h-4 w-4 mr-2" />Link Existing Cycle
                </Button>
                <Button size="sm" onClick={() => setShowCreateCycle(true)}>
                  <Plus className="h-4 w-4 mr-2" />Create New Cycle
                </Button>
              </div>
            </div>

            {(!linkedCycles || linkedCycles.length === 0) ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <PlayCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No test cycles linked. Link an existing cycle or create a new one.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">CYCLE ID</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">NAME</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">STATUS</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">PROGRESS</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">LINKED</th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedCycles.map(lc => {
                        const c = lc.cycle;
                        if (!c) return null;
                        const total = c.total_cases || 0;
                        const executed = (c.passed_count || 0) + (c.failed_count || 0) + (c.blocked_count || 0);
                        const progressPct = total > 0 ? Math.round((executed / total) * 100) : 0;
                        const statusLabel = c.status === 'active' ? 'IN PROGRESS' : c.status?.toUpperCase().replace('_', ' ');
                        const statusColor = c.status === 'completed' ? 'bg-[#E3FCEF] text-[#006644]'
                          : (c.status === 'active' || c.status === 'in_progress') ? 'bg-[#DEEBFF] text-[#0747A6]'
                          : 'bg-[#DFE1E6] text-[#253858]';

                        return (
                          <tr key={lc.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors" style={{ height: 50, maxHeight: 50 }}>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => navigate(`/testhub/cycles/${c.id}?fromPlanId=${plan.id}`)}
                                className="font-mono text-xs text-primary hover:underline"
                              >
                                {c.cycle_key}
                              </button>
                            </td>
                            <td className="px-4 py-2 text-sm">{c.name}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-[0.03em] ${statusColor}`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground">{progressPct}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-xs text-muted-foreground">
                              {lc.linked_at ? formatDistanceToNow(new Date(lc.linked_at), { addSuffix: true }) : '—'}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => {
                                        unlinkCycle.mutate({ linkId: lc.id, planId: plan.id }, {
                                          onSuccess: () => toast.success('Cycle unlinked'),
                                        });
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Unlink cycle</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
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

        <TabsContent value="defects" className="mt-6">
          <PlanDefectsPanel planId={plan.id} />
        </TabsContent>
      </Tabs>

      {/* Save as Template */}
      <SaveAsTemplateModal open={showTemplate} onClose={() => setShowTemplate(false)} planId={plan.id} planName={plan.name} />

      {/* DEF-S11-03: Cycle Picker Modal (reusing AddToCycleModal pattern) */}
      {showCyclePicker && (
        <CyclePickerForPlan
          open={showCyclePicker}
          onClose={() => setShowCyclePicker(false)}
          onLink={handleLinkCycle}
          existingCycleIds={linkedCycles?.map(lc => lc.cycle_id) || []}
        />
      )}

      {/* DEF-S11-03: Create Cycle Modal */}
      <CreateTestCycleModal
        isOpen={showCreateCycle}
        onClose={() => setShowCreateCycle(false)}
        onSuccess={async () => {
          setShowCreateCycle(false);
          // After creating, fetch the latest cycle and auto-link it
          const { data: latestCycle } = await (await import('@/integrations/supabase/client')).supabase
            .from('tm_test_cycles' as any)
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (latestCycle && planId) {
            await linkCycle.mutateAsync({ planId, cycleId: (latestCycle as any).id });
          }
        }}
      />
    </div>
  );
}

// ─── Inline Cycle Picker (reuses same query pattern as AddToCycleModal) ──────
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

function CyclePickerForPlan({
  open, onClose, onLink, existingCycleIds,
}: {
  open: boolean;
  onClose: () => void;
  onLink: (cycleId: string) => Promise<void>;
  existingCycleIds: string[];
}) {
  const [selected, setSelected] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const { data: cycles, isLoading } = useQuery({
    queryKey: ['plan-cycle-picker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_test_cycles' as any)
        .select('id, cycle_key, name, status')
        .in('status', ['draft', 'active', 'in_progress'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data || []) as unknown) as Array<{ id: string; cycle_key: string; name: string; status: string }>;
    },
    enabled: open,
  });

  const available = cycles?.filter(c => !existingCycleIds.includes(c.id)) || [];

  const handleLink = async () => {
    if (!selected) return;
    setIsLinking(true);
    try {
      await onLink(selected);
      onClose();
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Existing Cycle</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : available.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No available cycles to link.</p>
        ) : (
          <RadioGroup value={selected} onValueChange={setSelected} className="max-h-64 overflow-y-auto space-y-2">
            {available.map(c => {
              const statusLabel = c.status === 'active' ? 'In Progress' : c.status.charAt(0).toUpperCase() + c.status.slice(1);
              return (
                <div key={c.id} className="flex items-center space-x-3 p-2 rounded border hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(c.id)}>
                  <RadioGroupItem value={c.id} id={c.id} />
                  <Label htmlFor={c.id} className="flex-1 cursor-pointer">
                    <span className="font-mono text-xs text-primary mr-2">{c.cycle_key}</span>
                    <span className="text-sm">{c.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({statusLabel})</span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleLink} disabled={!selected || isLinking}>
            {isLinking ? 'Linking...' : 'Link Cycle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
