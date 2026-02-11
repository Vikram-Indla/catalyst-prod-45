/**
 * G26 Test Plans List Page
 * Route: /testhub/test-plans
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, Search, X, ChevronDown, Trash2, Loader2, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TestPlanCard } from '@/components/test-plans/TestPlanCard';
import { useTestPlans, useCreateTestPlan, useDeleteTestPlan, useTemplates } from '@/hooks/useTestPlansG26';
import { PlanStatus, PlanFilters } from '@/types/testPlans';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TemplateSelector } from '@/components/test-plans/TemplateSelector';
import { AIGeneratorModal } from '@/components/test-plans/AIGeneratorModal';
import { toast } from 'sonner';

export default function TestPlansListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [releaseFilter, setReleaseFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showFromTemplate, setShowFromTemplate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters: PlanFilters = {
    search: search || undefined,
    status: statusFilter !== 'all' ? [statusFilter as PlanStatus] : undefined,
    releaseId: releaseFilter !== 'all' ? releaseFilter : undefined,
  };

  const { data: plans, isLoading } = useTestPlans(filters);
  const { data: templates } = useTemplates();
  const createPlan = useCreateTestPlan();
  const deletePlan = useDeleteTestPlan();

  const { data: releases } = useQuery({
    queryKey: ['releases-for-plan-filter'],
    queryFn: async () => {
      const { data } = await supabase.from('releases').select('id, name').order('name');
      return data || [];
    },
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    await deletePlan.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (!template) return;
    const result = await createPlan.mutateAsync({
      name: template.name + ' (Copy)',
      description: template.description,
      objectives: template.objectives,
      entry_criteria: template.entry_criteria,
      exit_criteria: template.exit_criteria,
      risks_assumptions: template.risks_assumptions,
      project_id: template.project_id,
      template_id: templateId,
    });
    if (result?.id) navigate(`/testhub/test-plans/${result.id}`);
    setShowFromTemplate(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Test Plans</h1>
            <p className="text-sm text-muted-foreground">Organize and track testing efforts across releases</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {templates && templates.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline"><ChevronDown className="h-4 w-4 mr-2" />From Template</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {templates.map(t => (
                  <DropdownMenuItem key={t.id} onClick={() => handleCreateFromTemplate(t.id)}>
                    {t.template_name || t.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />New Plan</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search plans..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={releaseFilter} onValueChange={setReleaseFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Release" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Releases</SelectItem>
            {releases?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || statusFilter !== 'all' || releaseFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setReleaseFilter('all'); }}>
            <X className="h-4 w-4 mr-1" />Clear
          </Button>
        )}
      </div>

      {/* Results */}
      <p className="text-sm text-muted-foreground">Showing {plans?.length || 0} plan{plans?.length !== 1 ? 's' : ''}</p>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : plans?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-card">
          <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No test plans found</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Create a plan to organize your testing efforts</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans?.map(plan => (
            <TestPlanCard key={plan.id} plan={plan} onDelete={() => setDeleteId(plan.id)} />
          ))}
        </div>
      )}

      {/* Create Plan Dialog */}
      <CreatePlanDialog open={showCreate} onClose={() => setShowCreate(false)} onCreate={async (data) => {
        const result = await createPlan.mutateAsync(data);
        if (result?.id) navigate(`/testhub/test-plans/${result.id}`);
        setShowCreate(false);
      }} />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Test Plan?</DialogTitle>
            <DialogDescription>This action cannot be undone. All scope, team, and approval data will be removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletePlan.isPending}>
              {deletePlan.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Inline Create Dialog ────────────────────────────────────────
function CreatePlanDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (data: any) => Promise<void> }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('');
  const [entryCriteria, setEntryCriteria] = useState('');
  const [exitCriteria, setExitCriteria] = useState('');
  const [risksAssumptions, setRisksAssumptions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const resetForm = () => {
    setName(''); setDescription(''); setObjectives('');
    setEntryCriteria(''); setExitCriteria(''); setRisksAssumptions('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || null,
        objectives: objectives.trim() || null,
        entry_criteria: entryCriteria.trim() || null,
        exit_criteria: exitCriteria.trim() || null,
        risks_assumptions: risksAssumptions.trim() || null,
        status: 'draft',
      });
      resetForm();
    } finally { setIsSubmitting(false); }
  };

  const handleTemplateSelect = (template: any) => {
    setName((template.template_name || template.name) + ' (Copy)');
    setDescription(template.description || '');
    setObjectives(template.objectives || '');
    setEntryCriteria(template.entry_criteria || '');
    setExitCriteria(template.exit_criteria || '');
    setRisksAssumptions(template.risks_assumptions || '');
    toast.success('Template loaded! Customize as needed.');
  };

  const handleAIGenerate = (generated: any) => {
    setName(generated.name || '');
    setDescription(generated.description || '');
    setObjectives(generated.objectives || '');
    setEntryCriteria(generated.entry_criteria || '');
    setExitCriteria(generated.exit_criteria || '');
    setRisksAssumptions(generated.risks_assumptions || '');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={o => { if (!o) { onClose(); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Create Test Plan</DialogTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAIGenerator(true)}>
                  <Sparkles className="h-4 w-4 mr-1" />Create with AI
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowTemplateSelector(true)}>
                  <FileText className="h-4 w-4 mr-1" />From Template
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plan Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Release 3.0 Test Plan" maxLength={100} />
              <span className="text-xs text-muted-foreground text-right block">{name.length}/100</span>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of this test plan..." rows={3} maxLength={500} />
              <span className="text-xs text-muted-foreground text-right block">{description.length}/500</span>
            </div>
            {objectives && (
              <div className="space-y-2">
                <Label>Objectives</Label>
                <Textarea value={objectives} onChange={e => setObjectives(e.target.value)} rows={4} />
              </div>
            )}
            {entryCriteria && (
              <div className="space-y-2">
                <Label>Entry Criteria</Label>
                <Textarea value={entryCriteria} onChange={e => setEntryCriteria(e.target.value)} rows={3} />
              </div>
            )}
            {exitCriteria && (
              <div className="space-y-2">
                <Label>Exit Criteria</Label>
                <Textarea value={exitCriteria} onChange={e => setExitCriteria(e.target.value)} rows={3} />
              </div>
            )}
            {risksAssumptions && (
              <div className="space-y-2">
                <Label>Risks & Assumptions</Label>
                <Textarea value={risksAssumptions} onChange={e => setRisksAssumptions(e.target.value)} rows={4} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}Create Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TemplateSelector
        open={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleTemplateSelect}
      />

      <AIGeneratorModal
        open={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onGenerate={handleAIGenerate}
      />
    </>
  );
}
