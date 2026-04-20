import { useState, useEffect, useRef, useMemo } from 'react';
import { useResourceAssignments, type ResourceAssignment, type AssignmentStatus, type PaymentStatus } from '@/modules/capacity-planner/hooks/useResourceAssignments';
import { useAssignmentBudgets, type LinkedResource, type AssignmentBudgetData } from '@/modules/capacity-planner/hooks/useInsourcedBudget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical, Briefcase, AlertTriangle, ChevronDown, ChevronRight, CalendarIcon, Download, Users, User } from 'lucide-react';
import { exportAssignmentsToExcel } from '@/components/admin/assignments/exportAssignmentsToExcel';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { LicenseAllocationSection } from '@/modules/budget';
import { Lozenge, Tooltip, type LozengeAppearance } from '@/components/ads';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const STATUS_CONFIG: Record<AssignmentStatus, { label: string; appearance: LozengeAppearance }> = {
  yet_to_start: { label: 'Yet to Start', appearance: 'default' },
  on_hold: { label: 'On Hold', appearance: 'moved' },
  in_progress: { label: 'In Progress', appearance: 'inprogress' },
  completed: { label: 'Completed', appearance: 'success' },
};

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; appearance: LozengeAppearance }> = {
  not_applicable: { label: 'N/A', appearance: 'default' },
  unpaid: { label: 'Unpaid', appearance: 'removed' },
  on_track: { label: 'On Track', appearance: 'inprogress' },
  paid: { label: 'Paid', appearance: 'success' },
  closed: { label: 'Closed', appearance: 'default' },
};

const ASSIGNMENT_TYPE_ORDER = ['Outsourced', 'Cosourced', 'Insourced', 'Unspecified'];
const ASSIGNMENT_TYPE_APPEARANCES: Record<string, LozengeAppearance> = {
  Insourced: 'inprogress',
  Outsourced: 'moved',
  Cosourced: 'success',
  Unspecified: 'default',
};

// Normalize assignment types - BAU is permanently replaced by Insourced
const normalizeAssignmentType = (type: string | null | undefined): string => {
  if (!type) return 'Unspecified';
  if (type === 'BAU') return 'Insourced'; // Legacy mapping
  return type;
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

// Sortable Row Component
interface SortableRowProps {
  assignment: ResourceAssignment;
  status: AssignmentStatus;
  statusConfig: { label: string; appearance: LozengeAppearance };
  vendors: Vendor[];
  budgetData?: AssignmentBudgetData;
  onStatusChange: (assignment: ResourceAssignment, value: string) => void;
  onVendorChange: (assignment: ResourceAssignment, value: string) => void;
  onAssignmentTypeChange: (assignment: ResourceAssignment, value: string) => void;
  onPaymentStatusChange: (assignment: ResourceAssignment, value: string) => void;
  onStartDateChange: (assignment: ResourceAssignment, value: string) => void;
  onEndDateChange: (assignment: ResourceAssignment, value: string) => void;
  onBudgetChange: (assignment: ResourceAssignment, value: number | null) => void;
  onToggleActive: (assignment: ResourceAssignment) => void;
  onEdit: (assignment: ResourceAssignment) => void;
  onDelete: (assignment: ResourceAssignment) => void;
  onResourceCountClick: (assignment: ResourceAssignment, resources: LinkedResource[]) => void;
}

function SortableRow({
  assignment,
  status,
  statusConfig,
  vendors,
  budgetData,
  onStatusChange,
  onVendorChange,
  onAssignmentTypeChange,
  onPaymentStatusChange,
  onStartDateChange,
  onEndDateChange,
  onBudgetChange,
  onToggleActive,
  onEdit,
  onDelete,
  onResourceCountClick,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: assignment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  const resourceCount = budgetData?.resourceCount || 0;
  const totalBudget = budgetData?.totalBudget || 0;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-t border-border hover:bg-muted/20 ${!assignment.is_active ? 'opacity-50' : ''} ${isDragging ? 'bg-muted/40' : ''}`}
    >
      <td className="px-4 py-3 text-muted-foreground cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
          {assignment.assignment_id || '—'}
        </span>
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
      {/* Resource Count - Clickable */}
      <td className="px-4 py-3">
        {resourceCount > 0 ? (
          <button
            onClick={() => onResourceCountClick(assignment, budgetData?.linkedResources || [])}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors cursor-pointer"
          >
            <Users className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">{resourceCount}</span>
          </button>
        ) : (
          <span className="text-muted-foreground text-sm">0</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Select
          value={status}
          onValueChange={(value) => onStatusChange(assignment, value)}
        >
          <SelectTrigger className="h-8 w-[130px] bg-background text-xs">
            <Lozenge appearance={statusConfig.appearance}>
              {statusConfig.label}
            </Lozenge>
          </SelectTrigger>
          <SelectContent className="bg-popover z-[400]">
            <SelectItem value="yet_to_start">Yet to Start</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </td>
      {/* Budget - Read-only for Insourced (auto-calculated), Editable for Outsourced/Cosourced */}
      <td className="px-4 py-3">
        {normalizeAssignmentType(assignment.assignment_type) === 'Insourced' ? (
          <Tooltip content={<p>Sum of {resourceCount} linked resources' CTC (auto-calculated)</p>}>
            <div className="flex items-center gap-1 px-2 py-1 -mx-2 rounded bg-muted/50 min-w-[80px] cursor-help">
              <span className="text-xs text-muted-foreground">﷼</span>
              <span className="text-sm text-foreground">{totalBudget.toLocaleString()}</span>
            </div>
          </Tooltip>
        ) : (
          <Input
            type="number"
            className="h-8 w-[100px] text-sm"
            defaultValue={assignment.budget || ''}
            onBlur={(e) => {
              const val = e.target.value ? parseFloat(e.target.value) : null;
              if (val !== assignment.budget) {
                onBudgetChange(assignment, val);
              }
            }}
            placeholder="0"
          />
        )}
      </td>
      <td className="px-4 py-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-8 w-[130px] justify-start text-left font-normal text-xs",
                !assignment.start_date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {assignment.start_date ? format(parseISO(assignment.start_date), "dd/MM/yyyy") : <span>dd/mm/yyyy</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover z-[500]" align="start">
            <Calendar
              mode="single"
              selected={assignment.start_date ? parseISO(assignment.start_date) : undefined}
              onSelect={(date) => onStartDateChange(assignment, date ? format(date, 'yyyy-MM-dd') : '')}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </td>
      <td className="px-4 py-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-8 w-[130px] justify-start text-left font-normal text-xs",
                !assignment.end_date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {assignment.end_date ? format(parseISO(assignment.end_date), "dd/MM/yyyy") : <span>dd/mm/yyyy</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover z-[500]" align="start">
            <Calendar
              mode="single"
              selected={assignment.end_date ? parseISO(assignment.end_date) : undefined}
              onSelect={(date) => onEndDateChange(assignment, date ? format(date, 'yyyy-MM-dd') : '')}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </td>
      <td className="px-4 py-3">
        {(assignment.assignment_type === 'Outsourced' || assignment.assignment_type === 'Cosourced') ? (
          <Select
            value={assignment.vendor_id || '__none__'}
            onValueChange={(value) => onVendorChange(assignment, value)}
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
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Select
          value={normalizeAssignmentType(assignment.assignment_type) === 'Unspecified' ? '__none__' : normalizeAssignmentType(assignment.assignment_type)}
          onValueChange={(value) => onAssignmentTypeChange(assignment, value)}
        >
          <SelectTrigger className="h-8 w-[120px] bg-background text-xs">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-[400]">
            <SelectItem value="__none__">Not specified</SelectItem>
            <SelectItem value="Insourced">Insourced</SelectItem>
            <SelectItem value="Outsourced">Outsourced</SelectItem>
            <SelectItem value="Cosourced">Cosourced</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3">
        {normalizeAssignmentType(assignment.assignment_type) === 'Insourced' || assignment.assignment_type === 'BAU' ? (
          // Insourced: Always show "On Track" as read-only
          <Lozenge appearance={PAYMENT_STATUS_CONFIG['on_track'].appearance}>
            {PAYMENT_STATUS_CONFIG['on_track'].label}
          </Lozenge>
        ) : (assignment.assignment_type === 'Outsourced' || assignment.assignment_type === 'Cosourced') ? (
          <Select
            value={assignment.payment_status || 'unpaid'}
            onValueChange={(value) => onPaymentStatusChange(assignment, value)}
          >
            <SelectTrigger className="h-8 w-[100px] bg-background text-xs">
              <Lozenge appearance={PAYMENT_STATUS_CONFIG[assignment.payment_status || 'unpaid'].appearance}>
                {PAYMENT_STATUS_CONFIG[assignment.payment_status || 'unpaid'].label}
              </Lozenge>
            </SelectTrigger>
            <SelectContent className="bg-popover z-[400]">
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="on_track">On Track</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <Switch
          checked={assignment.is_active}
          onCheckedChange={() => onToggleActive(assignment)}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onEdit(assignment)}
            className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(assignment)}
            className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:bg-[#dc2626]/10 hover:text-[#dc2626] transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ResourceAssignmentsPage() {
  const queryClient = useQueryClient();
  const { allAssignments, isLoadingAll, createAssignment, updateAssignment } = useResourceAssignments();
  
  // Get IDs of ALL assignments to fetch their linked resources' budgets
  const allAssignmentIds = useMemo(() => allAssignments.map(a => a.id), [allAssignments]);
  
  const { data: assignmentBudgets = {} } = useAssignmentBudgets(allAssignmentIds);
  
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
    start_date: '',
    end_date: '',
    payment_status: 'not_applicable' as PaymentStatus,
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<ResourceAssignment | null>(null);
  const [linkedRecords, setLinkedRecords] = useState<LinkedRecord[]>([]);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Resource modal state
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [resourceModalAssignment, setResourceModalAssignment] = useState<ResourceAssignment | null>(null);
  const [resourceModalResources, setResourceModalResources] = useState<LinkedResource[]>([]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  // Group assignments by type (normalize BAU -> Insourced)
  const groupedAssignments = useMemo(() => {
    const groups: Record<string, ResourceAssignment[]> = {};
    
    allAssignments.forEach((assignment) => {
      const type = normalizeAssignmentType(assignment.assignment_type);
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(assignment);
    });

    // Sort each group by sort_order
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => a.sort_order - b.sort_order);
    });

    // Return in defined order
    const orderedGroups: { type: string; items: ResourceAssignment[] }[] = [];
    ASSIGNMENT_TYPE_ORDER.forEach((type) => {
      if (groups[type] && groups[type].length > 0) {
        orderedGroups.push({ type, items: groups[type] });
      }
    });

    return orderedGroups;
  }, [allAssignments]);


  const checkLinkedRecords = async (assignmentId: string) => {
    setIsCheckingLinks(true);
    const records: LinkedRecord[] = [];

    const { data: allocations } = await supabase
      .from('resource_allocations')
      .select(`id, resource_inventory!inner(name)`)
      .eq('assignment_id', assignmentId);

    if (allocations && allocations.length > 0) {
      allocations.forEach((alloc: any) => {
        records.push({
          resource_name: alloc.resource_inventory?.name || 'Unknown Resource',
          table_source: 'allocation',
        });
      });
    }

    const { data: inventory } = await supabase
      .from('resource_inventory')
      .select('id, name')
      .eq('assignment_id', assignmentId);

    if (inventory && inventory.length > 0) {
      inventory.forEach((inv: any) => {
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
      start_date: '',
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
    
    const records = await checkLinkedRecords(assignmentToDelete.id);
    if (records.length > 0) {
      setLinkedRecords(records);
      setIsDeleting(false);
      return;
    }

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

  const handleAssignmentTypeChange = async (assignment: ResourceAssignment, value: string) => {
    const newValue = value === '__none__' ? null : value;
    const isPaymentApplicable = newValue === 'Outsourced' || newValue === 'Cosourced';
    
    const updates: any = { assignment_type: newValue };
    if (!isPaymentApplicable && assignment.payment_status !== 'not_applicable') {
      updates.payment_status = 'not_applicable';
    }
    
    await updateAssignment.mutateAsync({
      id: assignment.id,
      updates,
    });
  };

  const handleStatusChange = async (assignment: ResourceAssignment, value: string) => {
    await updateAssignment.mutateAsync({
      id: assignment.id,
      updates: { assignment_status: value as AssignmentStatus },
    });
  };

  const handleVendorChange = async (assignment: ResourceAssignment, value: string) => {
    const newValue = value === '__none__' ? null : value;
    await updateAssignment.mutateAsync({
      id: assignment.id,
      updates: { vendor_id: newValue } as any,
    });
  };

  const handlePaymentStatusChange = async (assignment: ResourceAssignment, value: string) => {
    await updateAssignment.mutateAsync({
      id: assignment.id,
      updates: { payment_status: value as PaymentStatus } as any,
    });
  };

  const handleStartDateChange = async (assignment: ResourceAssignment, value: string) => {
    await updateAssignment.mutateAsync({
      id: assignment.id,
      updates: { start_date: value || null } as any,
    });
  };

  const handleEndDateChange = async (assignment: ResourceAssignment, value: string) => {
    await updateAssignment.mutateAsync({
      id: assignment.id,
      updates: { end_date: value || null } as any,
    });
  };

  const handleBudgetChange = async (assignment: ResourceAssignment, value: number | null) => {
    await updateAssignment.mutateAsync({
      id: assignment.id,
      updates: { budget: value } as any,
    });
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
      start_date: assignment.start_date || '',
      end_date: assignment.end_date || '',
      payment_status: assignment.payment_status || 'not_applicable',
    });
  };

  const toggleGroup = (type: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Handle drag end - reorder within group
  const handleDragEnd = async (event: DragEndEvent, groupType: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const group = groupedAssignments.find((g) => g.type === groupType);
    if (!group) return;

    const oldIndex = group.items.findIndex((item) => item.id === active.id);
    const newIndex = group.items.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedItems = arrayMove(group.items, oldIndex, newIndex);

    // Update sort_order for all items in the reordered group
    const updates = reorderedItems.map((item, index) => ({
      id: item.id,
      sort_order: index + 1,
    }));

    // Optimistically update UI via React Query cache
    queryClient.setQueryData(['resource-assignments-all'], (old: ResourceAssignment[] | undefined) => {
      if (!old) return old;
      return old.map((assignment) => {
        const update = updates.find((u) => u.id === assignment.id);
        if (update) {
          return { ...assignment, sort_order: update.sort_order };
        }
        return assignment;
      });
    });

    // Persist to database
    try {
      for (const update of updates) {
        await supabase
          .from('resource_assignments')
          .update({ sort_order: update.sort_order, updated_at: new Date().toISOString() })
          .eq('id', update.id);
      }
    } catch (error) {
      console.error('Failed to persist sort order:', error);
      toast.error('Failed to save order');
      queryClient.invalidateQueries({ queryKey: ['resource-assignments-all'] });
    }
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
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            className="gap-2"
            onClick={() => {
              try {
                exportAssignmentsToExcel(allAssignments);
                toast.success('Excel file downloaded');
              } catch (error) {
                toast.error('No data to export');
              }
            }}
          >
            <Download className="h-4 w-4" />
            Download Excel
          </Button>
          <Button 
            className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8]"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Assignment
          </Button>
        </div>
      </div>

      {/* Grouped Assignments List */}
      <div className="space-y-4">
        {groupedAssignments.map((group) => {
          const isCollapsed = collapsedGroups.has(group.type);
          const typeAppearance = ASSIGNMENT_TYPE_APPEARANCES[group.type] || ASSIGNMENT_TYPE_APPEARANCES.Unspecified;

          return (
            <div key={group.type} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.type)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
                <Lozenge appearance={typeAppearance}>
                  {group.type}
                </Lozenge>
                <span className="text-xs text-muted-foreground">
                  {group.items.length} assignment{group.items.length !== 1 ? 's' : ''}
                </span>
              </button>

              {/* Group Content */}
              {!isCollapsed && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, group.type)}
                >
                  <table className="w-full">
                    <thead className="bg-muted/20">
                      <tr>
                        <th className="w-10 px-4 py-2"></th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase w-[60px]">AID</th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase">Name</th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase w-[80px]">Resources</th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase w-[130px]">Status</th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase w-[110px]">Budget (SAR)</th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase w-[130px]">Assignment Start Date</th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase w-[130px]">Assignment End Date</th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase w-[120px]">Vendor</th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase w-[130px]">Assignment Type</th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase w-[120px]">Payment Status</th>
                        <th className="text-center px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase">Active</th>
                        <th className="text-center px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <SortableContext items={group.items.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                        {group.items.map((assignment) => {
                          const status = assignment.assignment_status || 'yet_to_start';
                          const statusConfig = STATUS_CONFIG[status];
                          return (
                            <SortableRow
                              key={assignment.id}
                              assignment={assignment}
                              status={status}
                              statusConfig={statusConfig}
                              vendors={vendors}
                              budgetData={assignmentBudgets[assignment.id]}
                              onStatusChange={handleStatusChange}
                              onVendorChange={handleVendorChange}
                              onAssignmentTypeChange={handleAssignmentTypeChange}
                              onPaymentStatusChange={handlePaymentStatusChange}
                              onStartDateChange={handleStartDateChange}
                              onEndDateChange={handleEndDateChange}
                              onBudgetChange={handleBudgetChange}
                              onToggleActive={handleToggleActive}
                              onEdit={openEdit}
                              onDelete={handleDeleteClick}
                              onResourceCountClick={(assignment, resources) => {
                                setResourceModalAssignment(assignment);
                                setResourceModalResources(resources);
                                setResourceModalOpen(true);
                              }}
                            />
                          );
                        })}
                      </SortableContext>
                    </tbody>
                  </table>
                </DndContext>
              )}
            </div>
          );
        })}

        {groupedAssignments.length === 0 && (
          <div className="bg-card border border-border rounded-xl px-4 py-8 text-center text-muted-foreground">
            No assignments configured. Click "Add Assignment" to create one.
          </div>
        )}
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
                  <SelectItem value="Insourced">Insourced</SelectItem>
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
                  <SelectItem value="Insourced">Insourced</SelectItem>
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

      {/* Linked Resources Modal - Enterprise Grade */}
      <Dialog open={resourceModalOpen} onOpenChange={setResourceModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">Linked Resources</div>
                <div className="text-sm font-normal text-muted-foreground">
                  {resourceModalAssignment?.name || 'Assignment'}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {resourceModalResources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No resources linked to this assignment.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Table Header */}
                <div className="flex items-center px-4 py-2 bg-muted/50 rounded-lg text-[11px] font-semibold text-muted-foreground uppercase">
                  <div className="w-16">RID</div>
                  <div className="flex-1">Name</div>
                </div>
                
                {/* Table Rows */}
                <ScrollArea className="h-[280px]">
                  <div className="space-y-1">
                    {resourceModalResources.map((resource) => (
                      <div 
                        key={resource.id} 
                        className="flex items-center px-4 py-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="w-16">
                          <span className="text-xs font-mono font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                            {resource.resourceId || '—'}
                          </span>
                        </div>
                        <div className="flex-1 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium text-foreground">{resource.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                {/* Footer Summary */}
                <div className="flex items-center justify-between px-4 py-3 mt-3 bg-muted/30 rounded-lg border border-border">
                  <span className="text-sm text-muted-foreground">Total Resources</span>
                  <Lozenge appearance="success">
                    {resourceModalResources.length}
                  </Lozenge>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResourceModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
