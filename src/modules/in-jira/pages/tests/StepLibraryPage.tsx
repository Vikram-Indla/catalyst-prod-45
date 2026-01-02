/**
 * Shared Step Library Page
 * CRUD for shared_test_steps with usage count display
 * Route: /project/:projectKey/tests/step-library
 */

import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  MoreHorizontal,
  Library,
  Link2,
  Loader2,
  Download,
  Copy,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSharedSteps, SharedStep } from '../../hooks/useTestSteps';
import { usePermission } from '@/hooks/usePermission';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export function StepLibraryPage() {
  const { projectKey } = useParams();
  const [searchParams] = useSearchParams();
  const programId = searchParams.get('programId');
  
  const {
    sharedSteps,
    isLoading,
    createSharedStep,
    updateSharedStep,
    deleteSharedStep,
    isCreating,
    isUpdating,
  } = useSharedSteps();

  const { hasPermission: canCreatePerm } = usePermission('test_cases', 'create', 'program', programId || undefined);
  const { hasPermission: canEditPerm } = usePermission('test_cases', 'edit', 'program', programId || undefined);
  const { hasPermission: canDeletePerm } = usePermission('test_cases', 'delete', 'program', programId || undefined);
  
  const canCreate = canCreatePerm;
  const canEdit = canEditPerm;
  const canDelete = canDeletePerm;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<SharedStep | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<SharedStep | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formExpectedResult, setFormExpectedResult] = useState('');

  // Filter steps by search
  const filteredSteps = useMemo(() => {
    if (!searchQuery.trim()) return sharedSteps;
    const q = searchQuery.toLowerCase();
    return sharedSteps.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [sharedSteps, searchQuery]);

  // Handle create
  const handleCreate = async () => {
    if (!formTitle.trim() || !formDescription.trim()) {
      toast.error('Title and description are required');
      return;
    }

    try {
      await createSharedStep({
        title: formTitle.trim(),
        description: formDescription.trim(),
        expected_result: formExpectedResult.trim() || undefined,
      });
      setCreateModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Failed to create shared step:', err);
    }
  };

  // Handle update
  const handleUpdate = async () => {
    if (!editingStep || !formTitle.trim() || !formDescription.trim()) return;

    try {
      await updateSharedStep({
        id: editingStep.id,
        title: formTitle.trim(),
        description: formDescription.trim(),
        expected_result: formExpectedResult.trim() || undefined,
      });
      setEditingStep(null);
      resetForm();
    } catch (err) {
      console.error('Failed to update shared step:', err);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteSharedStep(id);
    } catch (err) {
      console.error('Failed to delete shared step:', err);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await deleteSharedStep(id);
    }
    setSelectedIds(new Set());
  };

  // Reset form
  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormExpectedResult('');
  };

  // Open edit modal
  const openEditModal = (step: SharedStep) => {
    setEditingStep(step);
    setFormTitle(step.title);
    setFormDescription(step.description);
    setFormExpectedResult(step.expected_result || '');
  };

  // Open drawer
  const openDrawer = (step: SharedStep) => {
    setSelectedStep(step);
    setDrawerOpen(true);
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Toggle all
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSteps.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSteps.map(s => s.id)));
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const rows = filteredSteps.map(s => ({
      title: s.title,
      description: s.description,
      expected_result: s.expected_result || '',
      usage_count: s.usage_count || 0,
      created_at: s.created_at || '',
    }));
    
    const headers = ['title', 'description', 'expected_result', 'usage_count', 'created_at'];
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shared-steps-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  // Note: Table rendered directly below, no columns variable needed

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-default bg-surface-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Step Library</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Reusable test steps shared across test cases
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Shared Step
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-border-default bg-surface-2">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search shared steps..."
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-sm text-text-secondary">
                  {selectedIds.size} selected
                </span>
                {canDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            )}

            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="h-3.5 w-3.5 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filteredSteps.length === 0 ? (
          <div className="text-center py-16">
            <Library className="h-12 w-12 mx-auto mb-3 text-text-quaternary" />
            <p className="text-text-secondary">No shared steps</p>
            <p className="text-sm text-text-tertiary mt-1">Create reusable test steps</p>
            {canCreate && (
              <Button className="mt-4" onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Step
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-surface-1 z-10">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.size === filteredSteps.length && filteredSteps.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Expected Result</TableHead>
                <TableHead className="w-24">Usage</TableHead>
                <TableHead className="w-28">Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSteps.map(row => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-surface-2" onClick={() => openDrawer(row)}>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => toggleSelect(row.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Library className="h-4 w-4 text-accent-primary shrink-0" />
                      <span className="font-medium text-text-primary">{row.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-text-secondary text-sm">{row.description}</TableCell>
                  <TableCell className="max-w-xs truncate text-text-tertiary text-sm">{row.expected_result || '-'}</TableCell>
                  <TableCell><Badge variant="outline"><Link2 className="h-3 w-3 mr-1" />{row.usage_count || 0}</Badge></TableCell>
                  <TableCell className="text-xs text-text-quaternary">{row.created_at ? format(new Date(row.created_at), 'MMM d, yyyy') : '-'}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDrawer(row)}><Library className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                        {canEdit && <DropdownMenuItem onClick={() => openEditModal(row)}><Edit2 className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}
                        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(row.description); toast.success('Copied'); }}><Copy className="h-4 w-4 mr-2" />Copy</DropdownMenuItem>
                        {canDelete && <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => handleDelete(row.id)} className="text-status-error"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Shared Step</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                Title *
              </label>
              <Input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="e.g., Login with valid credentials"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                Description *
              </label>
              <Textarea
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Step action description..."
                className="min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                Expected Result
              </label>
              <Textarea
                value={formExpectedResult}
                onChange={e => setFormExpectedResult(e.target.value)}
                placeholder="What should happen..."
                className="min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formTitle.trim() || !formDescription.trim() || isCreating}
            >
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingStep} onOpenChange={() => { setEditingStep(null); resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shared Step</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                Title *
              </label>
              <Input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="e.g., Login with valid credentials"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                Description *
              </label>
              <Textarea
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Step action description..."
                className="min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                Expected Result
              </label>
              <Textarea
                value={formExpectedResult}
                onChange={e => setFormExpectedResult(e.target.value)}
                placeholder="What should happen..."
                className="min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingStep(null); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formTitle.trim() || !formDescription.trim() || isUpdating}
            >
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Drawer */}
      <SharedStepDrawer
        step={selectedStep}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onEdit={s => { setDrawerOpen(false); openEditModal(s); }}
        canEdit={canEdit}
      />
    </div>
  );
}

// Shared Step Drawer
interface SharedStepDrawerProps {
  step: SharedStep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (step: SharedStep) => void;
  canEdit: boolean;
}

function SharedStepDrawer({ step, open, onOpenChange, onEdit, canEdit }: SharedStepDrawerProps) {
  // Fetch linked test cases
  const { data: linkedCases, isLoading: isLoadingLinked } = useQuery({
    queryKey: ['shared-step-links', step?.id],
    queryFn: async () => {
      if (!step) return [];
      const { data, error } = await supabase
        .from('test_case_shared_steps')
        .select(`
          id,
          test_case_id,
          test_case:test_cases(id, title, status)
        `)
        .eq('shared_step_id', step.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!step?.id && open,
  });

  if (!step) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px]">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-lg">{step.title}</SheetTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">
                  <Link2 className="h-3 w-3 mr-1" />
                  {step.usage_count || 0} uses
                </Badge>
              </div>
            </div>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(step)}>
                <Edit2 className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Description */}
          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">Description</h4>
            <p className="text-sm text-text-primary bg-surface-2 p-3 rounded-lg">
              {step.description}
            </p>
          </div>

          {/* Expected Result */}
          {step.expected_result && (
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-2">Expected Result</h4>
              <p className="text-sm text-text-primary bg-surface-2 p-3 rounded-lg">
                {step.expected_result}
              </p>
            </div>
          )}

          {/* Linked Test Cases */}
          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">
              Linked Test Cases ({linkedCases?.length || 0})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {isLoadingLinked ? (
                <div className="text-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-text-tertiary" />
                </div>
              ) : linkedCases?.length === 0 ? (
                <p className="text-sm text-text-tertiary py-4 text-center">
                  Not linked to any test cases
                </p>
              ) : (
                linkedCases?.map((link: any) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-2 bg-surface-2 rounded-lg"
                  >
                    <span className="text-sm text-text-primary truncate">
                      {link.test_case?.title || 'Unknown'}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {link.test_case?.status || 'draft'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="text-xs text-text-quaternary pt-4 border-t border-border-default">
            Created {step.created_at ? format(new Date(step.created_at), 'MMM d, yyyy') : '-'}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default StepLibraryPage;
