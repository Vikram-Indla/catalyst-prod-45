/**
 * G26 Test Plans List Page
 * Route: /testhub/test-plans
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, Search, X, ChevronDown, Trash2, Loader2 } from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreate({ name: name.trim(), description: description.trim() || null, status: 'draft' });
      setName(''); setDescription('');
    } finally { setIsSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { onClose(); setName(''); setDescription(''); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create Test Plan</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Plan Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Release 3.0 Test Plan" /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of this test plan..." rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}Create Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
