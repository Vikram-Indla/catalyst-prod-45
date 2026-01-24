import { useState, useEffect, useRef } from 'react';
import { useResourceAssignments, type ResourceAssignment, type AssignmentStatus, type PaymentStatus } from '@/modules/capacity-planner/hooks/useResourceAssignments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical, Briefcase, AlertTriangle, Calendar, DollarSign } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { LicenseAllocationSection } from '@/modules/budget';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_CONFIG: Record<AssignmentStatus, { label: string; color: string }> = {
  yet_to_start: { label: 'Yet to Start', color: 'bg-muted text-muted-foreground' },
  on_hold: { label: 'On Hold', color: 'bg-amber-500/15 text-amber-600' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/15 text-blue-600' },
  completed: { label: 'Completed', color: 'bg-emerald-500/15 text-emerald-600' },
};

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string }> = {
  not_applicable: { label: 'N/A', color: 'bg-muted text-muted-foreground' },
  unpaid: { label: 'Unpaid', color: 'bg-red-500/15 text-red-600' },
  paid: { label: 'Paid', color: 'bg-emerald-500/15 text-emerald-600' },
  closed: { label: 'Closed', color: 'bg-gray-500/15 text-gray-600' },
};

interface LinkedRecord {
  resource_name: string;
  table_source: 'allocation' | 'inventory';
}

interface Vendor {
  id: string;
  name: string;
  is_active: boolean;
}

export default function ResourceAssignmentsPage() {
  const queryClient = useQueryClient();
  const { allAssignments, isLoadingAll, createAssignment, updateAssignment } = useResourceAssignments();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ResourceAssignment | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    assignment_type: '',
    project_id: '',
    vendor_id: '',
    budget: '',
    assignment_status: 'yet_to_start' as AssignmentStatus,
    end_date: '',
    payment_status: 'not_applicable' as PaymentStatus,
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<ResourceAssignment | null>(null);
  const [linkedRecords, setLinkedRecords] = useState<LinkedRecord[]>([]);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Budget inline edit state
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingBudgetValue, setEditingBudgetValue] = useState('');
  const budgetInputRef = useRef<HTMLInputElement>(null);

  // Fetch projects for dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch vendors for dropdown
  const { data: vendors = [] } = useQuery({
    queryKey: ['resource-vendors-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_vendors')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Vendor[];
    },
  });

  // Focus budget input when editing
  useEffect(() => {
    if (editingBudgetId && budgetInputRef.current) {
      budgetInputRef.current.focus();
      budgetInputRef.current.select();
    }
  }, [editingBudgetId]);

  const checkLinkedRecords = async (assignmentId: string) => {
    setIsCheckingLinks(true);
    const records: LinkedRecord[] = [];

    // Check resource_allocations
    const { data: allocations } = await supabase
      .from('resource_allocations')
      .select(`
        id,
        resource_inventory!inner(name)
      `)
      .eq('assignment_id', assignmentId);

    if (allocations && allocations.length > 0) {
      allocations.forEach((alloc: any) => {
        records.push({
          resource_name: alloc.resource_inventory?.name || 'Unknown Resource',
          table_source: 'allocation',
        });
      });
    }

    // Check resource_inventory
    const { data: inventory } = await supabase
      .from('resource_inventory')
      .select('id, name')
      .eq('assignment_id', assignmentId);

    if (inventory && inventory.length > 0) {
      inventory.forEach((inv: any) => {
        // Don't add duplicates
        if (!records.find(r => r.resource_name === inv.name && r.table_source === 'inventory')) {
          records.push({
            resource_name: inv.name || 'Unknown Resource',
            table_source: 'inventory',
          });
        }
      });
    }

    setLinkedRecords(records);
    setIsCheckingLinks(false);
    return records;
  };

  const resetFormData = () => {
    setFormData({ 
      name: '', 
      description: '', 
      assignment_type: '',
      project_id: '',
      vendor_id: '',
      budget: '',
      assignment_status: 'yet_to_start',
      end_date: '',
      payment_status: 'not_applicable',
    });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    await createAssignment.mutateAsync({
      name: formData.name,
      description: formData.description,
      assignment_type: formData.assignment_type || null,
    });
    resetFormData();
    setCreateModalOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingAssignment || !formData.name.trim()) return;
    await updateAssignment.mutateAsync({
      id: editingAssignment.id,
      updates: {
        name: formData.name,
        description: formData.description,
        assignment_type: formData.assignment_type || null,
        project_id: formData.project_id || null,
        vendor_id: formData.vendor_id || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        assignment_status: formData.assignment_status || 'yet_to_start',
      } as any,
    });
    setEditingAssignment(null);
    resetFormData();
  };

  const handleDeleteClick = async (assignment: ResourceAssignment) => {
    setAssignmentToDelete(assignment);
    await checkLinkedRecords(assignment.id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return;
    
    setIsDeleting(true);
    
    // Double-check there are no linked records
    const records = await checkLinkedRecords(assignmentToDelete.id);
    if (records.length > 0) {
      setLinkedRecords(records);
      setIsDeleting(false);
      return;
    }

    // Actually delete (hard delete)
    const { error } = await supabase
      .from('resource_assignments')
      .delete()
      .eq('id', assignmentToDelete.id);

    setIsDeleting(false);

    if (error) {
      toast.error(`Failed to delete: ${error.message}`);
    } else {
      toast.success('Assignment deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['resource-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['resource-assignments-all'] });
      setDeleteModalOpen(false);
      setAssignmentToDelete(null);
      setLinkedRecords([]);
    }
  };

  const handleToggleActive = async (assignment: ResourceAssignment) => {
    await updateAssignment.mutateAsync({
      id: assignment.id,
      updates: { is_active: !assignment.is_active },
    });
  };

  // Auto-save assignment type when changed - also update payment_status if not outsourced/cosourced
  const handleAssignmentTypeChange = async (assignment: ResourceAssignment, value: string) => {
    const newValue = value === '__none__' ? null : value;
    const isPaymentApplicable = newValue === 'Outsourced' || newValue === 'Cosourced';
    
    // If not outsourced/cosourced, reset payment status to not_applicable
    const updates: any = { assignment_type: newValue };
    if (!isPaymentApplicable && assignment.payment_status !== 'not_applicable') {
      updates.payment_status = 'not_applicable';
    }
    
    await updateAssignment.mutateAsync({
      id: assignment.id,
      updates,
    });
  };

  // Auto-save status when changed
  const handleStatusChange = async (assignment: ResourceAssignment, value: string) => {
    await updateAssignment.mutateAsync({
      id: assignment.id,
      updates: { assignment_status: value as AssignmentStatus },
    });
  };

  // Auto-save vendor when changed
  const handleVendorChange = async (assignment: ResourceAssignment, value: string) => {
    const newValue = value === '__none__' ? null : value;
    await updateAssignment.mutateAsync({
      id: assignment.id,
      updates: { vendor_id: newValue } as any,
    });
  };

  // Auto-save payment status when changed
  const handlePaymentStatusChange = async (assignment: ResourceAssignment, value: string) => {
    await updateAssignment.mutateAsync({
      id: assignment.id,
      updates: { payment_status: value as PaymentStatus } as any,
    });
  };

  // Auto-save end date when changed
  const handleEndDateChange = async (assignment: ResourceAssignment, value: string) => {
    await updateAssignment.mutateAsync({
      id: assignment.id,
      updates: { end_date: value || null } as any,
    });
  };

  // Inline budget editing handlers
  const handleBudgetDoubleClick = (assignment: ResourceAssignment) => {
    setEditingBudgetId(assignment.id);
    setEditingBudgetValue(assignment.budget?.toString() || '');
  };

  const handleBudgetBlur = async (assignment: ResourceAssignment) => {
    const newBudget = editingBudgetValue.trim() ? parseFloat(editingBudgetValue) : null;
    if (newBudget !== assignment.budget) {
      await updateAssignment.mutateAsync({
        id: assignment.id,
        updates: { budget: newBudget },
      });
    }
    setEditingBudgetId(null);
    setEditingBudgetValue('');
  };

  const handleBudgetKeyDown = (e: React.KeyboardEvent, assignment: ResourceAssignment) => {
    if (e.key === 'Enter') {
      handleBudgetBlur(assignment);
    } else if (e.key === 'Escape') {
      setEditingBudgetId(null);
      setEditingBudgetValue('');
    }
  };

  const openEdit = (assignment: ResourceAssignment) => {
    setEditingAssignment(assignment);
    setFormData({ 
      name: assignment.name, 
      description: assignment.description || '', 
      assignment_type: assignment.assignment_type || '',
      project_id: assignment.project_id || '',
      vendor_id: assignment.vendor_id || '',
      budget: assignment.budget?.toString() || '',
      assignment_status: assignment.assignment_status || 'yet_to_start',
      end_date: assignment.end_date || '',
      payment_status: assignment.payment_status || 'not_applicable',
    });
  };

  if (isLoadingAll) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Resource Assignments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure assignment values for capacity planning resources.
          </p>
        </div>
        <Button 
          className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8]"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Assignment
        </Button>
      </div>

      {/* Assignments List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
        <thead className="bg-muted/30">
            <tr>
              <th className="w-10 px-4 py-3"></th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Name</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase w-[130px]">Status</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase w-[110px]">Budget (SAR)</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase w-[110px]">End Date</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase w-[120px]">Vendor</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase w-[130px]">Assignment Type</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase w-[110px]">Payment</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Active</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allAssignments.map((assignment) => {
              const status = assignment.assignment_status || 'yet_to_start';
              const statusConfig = STATUS_CONFIG[status];
              return (
              <tr 
                key={assignment.id} 
                className={`border-t border-border hover:bg-muted/20 ${!assignment.is_active ? 'opacity-50' : ''}`}
              >
                <td className="px-4 py-3 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{assignment.name}</span>
                      {assignment.project?.name && (
                        <span className="text-xs text-muted-foreground">{assignment.project.name}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={status}
                    onValueChange={(value) => handleStatusChange(assignment, value)}
                  >
                    <SelectTrigger className="h-8 w-[130px] bg-background text-xs">
                      <Badge variant="secondary" className={`${statusConfig.color} text-xs`}>
                        {statusConfig.label}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-[400]">
                      <SelectItem value="yet_to_start">Yet to Start</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  {editingBudgetId === assignment.id ? (
                    <Input
                      ref={budgetInputRef}
                      type="number"
                      value={editingBudgetValue}
                      onChange={(e) => setEditingBudgetValue(e.target.value)}
                      onBlur={() => handleBudgetBlur(assignment)}
                      onKeyDown={(e) => handleBudgetKeyDown(e, assignment)}
                      className="h-8 w-[100px] text-sm"
                      placeholder="0"
                    />
                  ) : (
                    <div
                      className="flex items-center gap-1 cursor-text px-2 py-1 -mx-2 rounded hover:bg-muted min-w-[80px]"
                      onDoubleClick={() => handleBudgetDoubleClick(assignment)}
                      title="Double-click to edit"
                    >
                      {assignment.budget !== null && assignment.budget !== undefined ? (
                        <>
                          <span className="text-xs text-muted-foreground">﷼</span>
                          <span className="text-sm">{assignment.budget.toLocaleString()}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </div>
                  )}
                </td>
                {/* End Date */}
                <td className="px-4 py-3">
                  <Input
                    type="date"
                    value={assignment.end_date || ''}
                    onChange={(e) => handleEndDateChange(assignment, e.target.value)}
                    className="h-8 w-[100px] text-xs"
                  />
                </td>
                {/* Vendor */}
                <td className="px-4 py-3">
                  <Select
                    value={assignment.vendor_id || '__none__'}
                    onValueChange={(value) => handleVendorChange(assignment, value)}
                  >
                    <SelectTrigger className="h-8 w-[110px] bg-background text-xs">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-[400]">
                      <SelectItem value="__none__">Not specified</SelectItem>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                {/* Assignment Type */}
                <td className="px-4 py-3">
                  <Select
                    value={assignment.assignment_type || '__none__'}
                    onValueChange={(value) => handleAssignmentTypeChange(assignment, value)}
                  >
                    <SelectTrigger className="h-8 w-[120px] bg-background text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-[400]">
                      <SelectItem value="__none__">Not specified</SelectItem>
                      <SelectItem value="Project">Project</SelectItem>
                      <SelectItem value="BAU">BAU</SelectItem>
                      <SelectItem value="Outsourced">Outsourced</SelectItem>
                      <SelectItem value="Cosourced">Cosourced</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                {/* Payment Status - only editable for Outsourced/Cosourced */}
                <td className="px-4 py-3">
                  {(assignment.assignment_type === 'Outsourced' || assignment.assignment_type === 'Cosourced') ? (
                    <Select
                      value={assignment.payment_status || 'unpaid'}
                      onValueChange={(value) => handlePaymentStatusChange(assignment, value)}
                    >
                      <SelectTrigger className="h-8 w-[100px] bg-background text-xs">
                        <Badge variant="secondary" className={`${PAYMENT_STATUS_CONFIG[assignment.payment_status || 'unpaid'].color} text-xs`}>
                          {PAYMENT_STATUS_CONFIG[assignment.payment_status || 'unpaid'].label}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[400]">
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">N/A</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <Switch
                    checked={assignment.is_active}
                    onCheckedChange={() => handleToggleActive(assignment)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEdit(assignment)}
                      className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(assignment)}
                      className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:bg-[#dc2626]/10 hover:text-[#dc2626] transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
            {allAssignments.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No assignments configured. Click "Add Assignment" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Senaei BAU"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description..."
              />
            </div>
            <div className="space-y-2">
              <Label>Assignment Type</Label>
              <Select
                value={formData.assignment_type || '__none__'}
                onValueChange={(value) => setFormData(f => ({ ...f, assignment_type: value === '__none__' ? '' : value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not specified</SelectItem>
                  <SelectItem value="Project">Project</SelectItem>
                  <SelectItem value="BAU">BAU</SelectItem>
                  <SelectItem value="Outsourced">Outsourced</SelectItem>
                  <SelectItem value="Cosourced">Cosourced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreate}
              disabled={createAssignment.isPending}
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              {createAssignment.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editingAssignment !== null} onOpenChange={(open) => !open && setEditingAssignment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Senaei BAU"
              />
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={formData.project_id || '__none__'}
                onValueChange={(value) => setFormData(f => ({ ...f, project_id: value === '__none__' ? '' : value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No project</SelectItem>
                  {projects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assignment Status</Label>
              <Select
                value={formData.assignment_status}
                onValueChange={(value) => setFormData(f => ({ ...f, assignment_status: value as AssignmentStatus }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yet_to_start">Yet to Start</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Budget</Label>
              <Input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData(f => ({ ...f, budget: e.target.value }))}
                placeholder="e.g., 50000"
              />
            </div>
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select
                value={formData.vendor_id || '__none__'}
                onValueChange={(value) => setFormData(f => ({ ...f, vendor_id: value === '__none__' ? '' : value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not specified</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assignment Type</Label>
              <Select
                value={formData.assignment_type || '__none__'}
                onValueChange={(value) => setFormData(f => ({ ...f, assignment_type: value === '__none__' ? '' : value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not specified</SelectItem>
                  <SelectItem value="Project">Project</SelectItem>
                  <SelectItem value="BAU">BAU</SelectItem>
                  <SelectItem value="Outsourced">Outsourced</SelectItem>
                  <SelectItem value="Cosourced">Cosourced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* License Allocation Section */}
            {editingAssignment && (
              <LicenseAllocationSection assignmentId={editingAssignment.id} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAssignment(null)}>Cancel</Button>
            <Button 
              onClick={handleUpdate}
              disabled={updateAssignment.isPending}
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              {updateAssignment.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteModalOpen(false);
          setAssignmentToDelete(null);
          setLinkedRecords([]);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {linkedRecords.length > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Cannot Delete Assignment
                </>
              ) : (
                'Delete Assignment'
              )}
            </DialogTitle>
          </DialogHeader>
          
          {isCheckingLinks ? (
            <div className="py-8 text-center text-muted-foreground">
              Checking for linked records...
            </div>
          ) : linkedRecords.length > 0 ? (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                The assignment <strong>"{assignmentToDelete?.name}"</strong> cannot be deleted because it has {linkedRecords.length} linked resource{linkedRecords.length > 1 ? 's' : ''}:
              </p>
              <ScrollArea className="h-[200px] rounded-md border p-3">
                <div className="space-y-2">
                  {linkedRecords.map((record, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm py-1.5 px-2 bg-muted/50 rounded">
                      <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{record.resource_name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        ({record.table_source === 'allocation' ? 'Allocation' : 'Assigned'})
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Please reassign or remove these resources from this assignment before deleting.
              </p>
            </div>
          ) : (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <strong>"{assignmentToDelete?.name}"</strong>? This action cannot be undone.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteModalOpen(false);
              setAssignmentToDelete(null);
              setLinkedRecords([]);
            }}>
              {linkedRecords.length > 0 ? 'Close' : 'Cancel'}
            </Button>
            {linkedRecords.length === 0 && (
              <Button 
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}