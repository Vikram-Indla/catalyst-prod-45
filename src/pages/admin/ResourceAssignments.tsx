// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from 'react';
import { useResourceAssignments, type ResourceAssignment, type AssignmentStatus, type PaymentStatus } from '@/modules/capacity-planner/hooks/useResourceAssignments';
import { useAssignmentBudgets, type LinkedResource, type AssignmentBudgetData } from '@/modules/capacity-planner/hooks/useInsourcedBudget';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/admin/admin-dialog';
import AddIcon from '@atlaskit/icon/core/add';
import EditIcon from '@atlaskit/icon/core/edit';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import DragHandlerIcon from '@atlaskit/icon/glyph/drag-handler';
import BriefcaseIcon from '@atlaskit/icon/core/briefcase';
import WarningIcon from '@atlaskit/icon/core/warning';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import CalendarIcon from '@atlaskit/icon/core/calendar';
import DownloadIcon from '@atlaskit/icon/core/download';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import PersonIcon from '@atlaskit/icon/core/person';
import { exportAssignmentsToExcel } from '@/components/admin/assignments/exportAssignmentsToExcel';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import Toggle from '@atlaskit/toggle';
import AdsSelect from '@atlaskit/select';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { LicenseAllocationSection } from '@/modules/budget';
import { Lozenge, Tooltip, type LozengeAppearance } from '@/components/ads';
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
import { AdminGuard } from '@/components/admin/AdminGuard';

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
      style={{ ...style, borderTop: '1px solid var(--ds-border, #DCDFE4)', opacity: !assignment.is_active ? 0.5 : isDragging ? 0.7 : 1 }}
      onMouseEnter={e => { if (!isDragging) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-hovered, #F1F2F4)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isDragging ? 'var(--ds-background-neutral, #F7F8F9)' : ''; }}
    >
      <td style={{ padding: '12px 16px', cursor: 'grab', color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }} className="active:cursor-grabbing" {...attributes} {...listeners}>
        <span style={{ display: 'inline-flex', cursor: 'grab' }}><DragHandlerIcon label="" size="small" /></span>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <span className="text-xs font-medium px-2 py-1 rounded" style={{ color: 'var(--ds-text-brand, #0C66E4)', background: 'var(--ds-background-selected, #E9F2FF)' }}>
          {assignment.assignment_id || '—'}
        </span>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--ds-background-selected, #E9F2FF)' }}>
            <span style={{ display: 'inline-flex', color: 'var(--ds-icon-brand, #0C66E4)' }}><BriefcaseIcon label="" size="small" /></span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>{assignment.name}</span>
            {assignment.project?.name && (
              <span className="text-xs" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>{assignment.project.name}</span>
            )}
          </div>
        </div>
      </td>
      {/* Resource Count - Clickable */}
      <td style={{ padding: "12px 16px" }}>
        {resourceCount > 0 ? (
          <button
            onClick={() => onResourceCountClick(assignment, budgetData?.linkedResources || [])}
            className="flex items-center gap-1.5 px-2 py-1 rounded transition-colors cursor-pointer"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#15803D' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(34,197,94,0.2)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(34,197,94,0.1)')}
          >
            <span style={{ display: 'inline-flex' }}><PeopleGroupIcon label="" size="small" /></span>
            <span className="text-sm font-medium">{resourceCount}</span>
          </button>
        ) : (
          <span className="text-sm" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>0</span>
        )}
      </td>
      <td style={{ padding: "12px 16px" }}>
        <AdsSelect
          menuPortalTarget={document.body}
          value={{ label: statusConfig.label, value: status }}
          options={[
            { label: 'Yet to Start', value: 'yet_to_start' },
            { label: 'On Hold', value: 'on_hold' },
            { label: 'In Progress', value: 'in_progress' },
            { label: 'Completed', value: 'completed' },
          ]}
          onChange={(opt) => opt && onStatusChange(assignment, opt.value)}
          styles={{ control: (base: any) => ({ ...base, minHeight: 32, height: 32, width: 130, fontSize: 12 }) }}
        />
      </td>
      {/* Budget - Read-only for Insourced (auto-calculated), Editable for Outsourced/Cosourced */}
      <td style={{ padding: "12px 16px" }}>
        {normalizeAssignmentType(assignment.assignment_type) === 'Insourced' ? (
          <Tooltip content={<p>Sum of {resourceCount} linked resources' CTC (auto-calculated)</p>}>
            <div className="flex items-center gap-1 px-2 py-1 -mx-2 rounded min-w-[80px] cursor-help" style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }}>
              <span className="text-xs" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>﷼</span>
              <span className="text-sm" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>{totalBudget.toLocaleString()}</span>
            </div>
          </Tooltip>
        ) : (
          <Textfield
            type="number"
            defaultValue={assignment.budget?.toString() || ''}
            onBlur={(e) => {
              const val = (e.target as HTMLInputElement).value ? parseFloat((e.target as HTMLInputElement).value) : null;
              if (val !== assignment.budget) {
                onBudgetChange(assignment, val);
              }
            }}
            placeholder="0"
          />
        )}
      </td>
      <td style={{ padding: "12px 16px" }}>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="h-8 w-[130px] flex items-center justify-start text-left font-normal text-xs px-2 rounded border"
              style={{
                borderColor: 'var(--ds-border, #DCDFE4)',
                background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
                color: assignment.start_date ? 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' : 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))',
              }}
            >
              <span style={{ display: 'inline-flex', marginRight: 8 }}><CalendarIcon label="" size="small" /></span>
              {assignment.start_date ? format(parseISO(assignment.start_date), "dd/MM/yyyy") : <span>dd/mm/yyyy</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[500]" align="start">
            <Calendar
              mode="single"
              selected={assignment.start_date ? parseISO(assignment.start_date) : undefined}
              onSelect={(date) => onStartDateChange(assignment, date ? format(date, 'yyyy-MM-dd') : '')}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="h-8 w-[130px] flex items-center justify-start text-left font-normal text-xs px-2 rounded border"
              style={{
                borderColor: 'var(--ds-border, #DCDFE4)',
                background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
                color: assignment.end_date ? 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' : 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))',
              }}
            >
              <span style={{ display: 'inline-flex', marginRight: 8 }}><CalendarIcon label="" size="small" /></span>
              {assignment.end_date ? format(parseISO(assignment.end_date), "dd/MM/yyyy") : <span>dd/mm/yyyy</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[500]" align="start">
            <Calendar
              mode="single"
              selected={assignment.end_date ? parseISO(assignment.end_date) : undefined}
              onSelect={(date) => onEndDateChange(assignment, date ? format(date, 'yyyy-MM-dd') : '')}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </td>
      <td style={{ padding: "12px 16px" }}>
        {(assignment.assignment_type === 'Outsourced' || assignment.assignment_type === 'Cosourced') ? (
          <AdsSelect
            menuPortalTarget={document.body}
            value={assignment.vendor_id
              ? vendors.find(v => v.id === assignment.vendor_id)
                ? { label: vendors.find(v => v.id === assignment.vendor_id)!.name, value: assignment.vendor_id }
                : null
              : { label: 'Not specified', value: '__none__' }}
            options={[
              { label: 'Not specified', value: '__none__' },
              ...vendors.map(v => ({ label: v.name, value: v.id })),
            ]}
            onChange={(opt) => opt && onVendorChange(assignment, opt.value)}
            styles={{ control: (base: any) => ({ ...base, minHeight: 32, height: 32, width: 110, fontSize: 12 }) }}
          />
        ) : (
          <span className="text-sm" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>—</span>
        )}
      </td>
      <td style={{ padding: "12px 16px" }}>
        {(() => {
          const typeOpts = [
            { label: 'Not specified', value: '__none__' },
            { label: 'Insourced', value: 'Insourced' },
            { label: 'Outsourced', value: 'Outsourced' },
            { label: 'Cosourced', value: 'Cosourced' },
          ];
          const curType = normalizeAssignmentType(assignment.assignment_type) === 'Unspecified' ? '__none__' : normalizeAssignmentType(assignment.assignment_type);
          return (
            <AdsSelect
              menuPortalTarget={document.body}
              value={typeOpts.find(o => o.value === curType) || null}
              options={typeOpts}
              onChange={(opt) => opt && onAssignmentTypeChange(assignment, opt.value)}
              styles={{ control: (base: any) => ({ ...base, minHeight: 32, height: 32, width: 120, fontSize: 12 }) }}
            />
          );
        })()}
      </td>
      <td style={{ padding: "12px 16px" }}>
        {normalizeAssignmentType(assignment.assignment_type) === 'Insourced' || assignment.assignment_type === 'BAU' ? (
          // Insourced: Always show "On Track" as read-only
          <Lozenge appearance={PAYMENT_STATUS_CONFIG['on_track'].appearance}>
            {PAYMENT_STATUS_CONFIG['on_track'].label}
          </Lozenge>
        ) : (assignment.assignment_type === 'Outsourced' || assignment.assignment_type === 'Cosourced') ? (
          (() => {
            const payOpts = [
              { label: 'Unpaid', value: 'unpaid' },
              { label: 'On Track', value: 'on_track' },
              { label: 'Paid', value: 'paid' },
              { label: 'Closed', value: 'closed' },
            ];
            const curPay = assignment.payment_status || 'unpaid';
            return (
              <AdsSelect
                menuPortalTarget={document.body}
                value={payOpts.find(o => o.value === curPay) || null}
                options={payOpts}
                onChange={(opt) => opt && onPaymentStatusChange(assignment, opt.value)}
                styles={{ control: (base: any) => ({ ...base, minHeight: 32, height: 32, width: 100, fontSize: 12 }) }}
              />
            );
          })()
        ) : (
          <span className="text-sm" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>—</span>
        )}
      </td>
      <td style={{ padding: "12px 16px", textAlign: "center" }}>
        <Toggle
          isChecked={assignment.is_active}
          onChange={() => onToggleActive(assignment)}
        />
      </td>
      <td style={{ padding: "12px 16px" }}>
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onEdit(assignment)}
            className="w-8 h-8 rounded flex items-center justify-center transition-colors"
            style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-hovered, #F1F2F4)'; (e.currentTarget as HTMLElement).style.color = 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))'; }}
          >
            <EditIcon label="" size="small" />
          </button>
          <button
            onClick={() => onDelete(assignment)}
            className="w-8 h-8 rounded flex items-center justify-center transition-colors"
            style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(202,53,33,0.1)'; (e.currentTarget as HTMLElement).style.color = 'var(--ds-icon-danger, #CA3521)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))'; }}
          >
            <TrashIcon label="" size="small" />
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
          <div className="h-8 rounded w-48" style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }} />
          <div className="h-32 rounded" style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }} />
        </div>
      </div>
    );
  }

  return (
    <AdminGuard>
    <div
      style={{
        padding: '24px 32px 48px',
        maxWidth: 1280,
        color: 'var(--ds-text, #292A2E)',
        fontFamily:
          '"Atlassian Sans", ui-sans-serif, -apple-system, system-ui, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header — Jira admin parity: H1 24/653 + subtitle + right-aligned primary button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 653,
              lineHeight: '28px',
              color: 'var(--ds-text, #292A2E)',
              margin: 0,
              letterSpacing: 'normal',
            }}
          >
            Resource assignments
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            appearance="default"
            onClick={() => {
              try {
                exportAssignmentsToExcel(allAssignments);
                toast.success('Excel file downloaded');
              } catch (error) {
                toast.error('No data to export');
              }
            }}
            iconBefore={DownloadIcon}
          >
            Download Excel
          </Button>
          <Button
            appearance="primary"
            onClick={() => setCreateModalOpen(true)}
            iconBefore={AddIcon}
          >
            Add assignment
          </Button>
        </div>
      </div>
      <p
        style={{
          fontSize: 14,
          fontWeight: 400,
          color: 'var(--ds-text-subtle, #505258)',
          margin: '0 0 24px 0',
          lineHeight: '20px',
          maxWidth: 760,
        }}
      >
        Configure assignment values for capacity planning resources.
      </p>

      {/* Grouped Assignments List */}
      <div className="space-y-4">
        {groupedAssignments.map((group) => {
          const isCollapsed = collapsedGroups.has(group.type);
          const typeAppearance = ASSIGNMENT_TYPE_APPEARANCES[group.type] || ASSIGNMENT_TYPE_APPEARANCES.Unspecified;

          return (
            <div key={group.type} className="rounded-xl overflow-hidden" style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)' }}>
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.type)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
                style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-hovered, #F1F2F4)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral, #F7F8F9)')}
              >
                {isCollapsed ? (
                  <span style={{ display: 'inline-flex', color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}><ChevronRightIcon label="" size="small" /></span>
                ) : (
                  <span style={{ display: 'inline-flex', color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}><ChevronDownIcon label="" size="small" /></span>
                )}
                <Lozenge appearance={typeAppearance}>
                  {group.type}
                </Lozenge>
                <span className="text-xs" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
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
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    {/* Jira-parity table headers: 12/653/rgb(80,82,88) SENTENCE-CASE
                        (not uppercase), hairline bottom border, padding 8px 12px 8px 0. */}
                    <thead>
                      <tr>
                        {[
                          { label: '', width: '32px' },
                          { label: 'AID', width: '60px' },
                          { label: 'Name', width: 'auto' },
                          { label: 'Resources', width: '80px' },
                          { label: 'Status', width: '130px' },
                          { label: 'Budget (SAR)', width: '110px' },
                          { label: 'Assignment start date', width: '130px' },
                          { label: 'Assignment end date', width: '130px' },
                          { label: 'Vendor', width: '120px' },
                          { label: 'Assignment type', width: '130px' },
                          { label: 'Payment status', width: '120px' },
                          { label: 'Active', width: '80px', align: 'center' as const },
                          { label: 'Actions', width: '100px', align: 'center' as const },
                        ].map((col, i) => (
                          <th
                            key={i}
                            scope="col"
                            style={{
                              textAlign: col.align || 'left',
                              fontSize: 12,
                              fontWeight: 653,
                              color: 'var(--ds-text-subtle, #505258)',
                              padding: '8px 12px 8px 0',
                              borderBottom: '1.67px solid rgba(11, 18, 14, 0.14)',
                              textTransform: 'none',
                              letterSpacing: 'normal',
                              lineHeight: '16px',
                              width: col.width,
                            }}
                          >
                            {col.label}
                          </th>
                        ))}
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
          <div className="rounded-xl px-4 py-8 text-center" style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
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
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Name *</label>
              <Textfield
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: (e.target as HTMLInputElement).value }))}
                placeholder="e.g., Senaei BAU"
              />
            </div>
            <div className="space-y-2">
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Description</label>
              <Textfield
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: (e.target as HTMLInputElement).value }))}
                placeholder="Brief description..."
              />
            </div>
            <div className="space-y-2">
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Assignment Type</label>
              {(() => {
                const typeOpts = [
                  { label: 'Not specified', value: '__none__' },
                  { label: 'Insourced', value: 'Insourced' },
                  { label: 'Outsourced', value: 'Outsourced' },
                  { label: 'Cosourced', value: 'Cosourced' },
                ];
                return (
                  <AdsSelect
                    menuPortalTarget={document.body}
                    value={typeOpts.find(o => o.value === (formData.assignment_type || '__none__')) || null}
                    options={typeOpts}
                    onChange={(opt) => opt && setFormData(f => ({ ...f, assignment_type: opt.value === '__none__' ? '' : opt.value }))}
                  />
                );
              })()}
            </div>
          </div>
          <DialogFooter>
            <Button appearance="subtle" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button
              appearance="primary"
              onClick={handleCreate}
              isDisabled={createAssignment.isPending}
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
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Name *</label>
              <Textfield
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: (e.target as HTMLInputElement).value }))}
                placeholder="e.g., Senaei BAU"
              />
            </div>
            <div className="space-y-2">
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Project</label>
              {(() => {
                const projectOpts = [
                  { label: 'No project', value: '__none__' },
                  ...projects.map((p: any) => ({ label: p.name, value: p.id })),
                ];
                return (
                  <AdsSelect
                    menuPortalTarget={document.body}
                    value={projectOpts.find(o => o.value === (formData.project_id || '__none__')) || null}
                    options={projectOpts}
                    onChange={(opt) => opt && setFormData(f => ({ ...f, project_id: opt.value === '__none__' ? '' : opt.value }))}
                  />
                );
              })()}
            </div>
            <div className="space-y-2">
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Assignment Status</label>
              {(() => {
                const statusOpts = [
                  { label: 'Yet to Start', value: 'yet_to_start' },
                  { label: 'On Hold', value: 'on_hold' },
                  { label: 'In Progress', value: 'in_progress' },
                  { label: 'Completed', value: 'completed' },
                ];
                return (
                  <AdsSelect
                    menuPortalTarget={document.body}
                    value={statusOpts.find(o => o.value === formData.assignment_status) || null}
                    options={statusOpts}
                    onChange={(opt) => opt && setFormData(f => ({ ...f, assignment_status: opt.value as AssignmentStatus }))}
                  />
                );
              })()}
            </div>
            <div className="space-y-2">
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Budget</label>
              <Textfield
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData(f => ({ ...f, budget: (e.target as HTMLInputElement).value }))}
                placeholder="e.g., 50000"
              />
            </div>
            <div className="space-y-2">
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Vendor</label>
              {(() => {
                const vendorOpts = [
                  { label: 'Not specified', value: '__none__' },
                  ...vendors.map(v => ({ label: v.name, value: v.id })),
                ];
                return (
                  <AdsSelect
                    menuPortalTarget={document.body}
                    value={vendorOpts.find(o => o.value === (formData.vendor_id || '__none__')) || null}
                    options={vendorOpts}
                    onChange={(opt) => opt && setFormData(f => ({ ...f, vendor_id: opt.value === '__none__' ? '' : opt.value }))}
                  />
                );
              })()}
            </div>
            <div className="space-y-2">
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Assignment Type</label>
              {(() => {
                const typeOpts = [
                  { label: 'Not specified', value: '__none__' },
                  { label: 'Insourced', value: 'Insourced' },
                  { label: 'Outsourced', value: 'Outsourced' },
                  { label: 'Cosourced', value: 'Cosourced' },
                ];
                return (
                  <AdsSelect
                    menuPortalTarget={document.body}
                    value={typeOpts.find(o => o.value === (formData.assignment_type || '__none__')) || null}
                    options={typeOpts}
                    onChange={(opt) => opt && setFormData(f => ({ ...f, assignment_type: opt.value === '__none__' ? '' : opt.value }))}
                  />
                );
              })()}
            </div>
            
            {/* License Allocation Section */}
            {editingAssignment && (
              <LicenseAllocationSection assignmentId={editingAssignment.id} />
            )}
          </div>
          <DialogFooter>
            <Button appearance="subtle" onClick={() => setEditingAssignment(null)}>Cancel</Button>
            <Button
              appearance="primary"
              onClick={handleUpdate}
              isDisabled={updateAssignment.isPending}
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
                  <span style={{ display: 'inline-flex', color: 'var(--ds-icon-warning, #F79009)' }}><WarningIcon label="" size="medium" /></span>
                  Cannot Delete Assignment
                </>
              ) : (
                'Delete Assignment'
              )}
            </DialogTitle>
          </DialogHeader>
          
          {isCheckingLinks ? (
            <div className="py-8 text-center" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
              Checking for linked records...
            </div>
          ) : linkedRecords.length > 0 ? (
            <div className="space-y-4 py-4">
              <p className="text-sm" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
                The assignment <strong>"{assignmentToDelete?.name}"</strong> cannot be deleted because it has {linkedRecords.length} linked resource{linkedRecords.length > 1 ? 's' : ''}:
              </p>
              <ScrollArea className="h-[200px] rounded-md p-3" style={{ border: '1px solid var(--ds-border, #DCDFE4)' }}>
                <div className="space-y-2">
                  {linkedRecords.map((record, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded" style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }}>
                      <span style={{ display: 'inline-flex', flexShrink: 0, color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}><BriefcaseIcon label="" size="small" /></span>
                      <span className="font-medium">{record.resource_name}</span>
                      <span className="text-xs ml-auto" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
                        ({record.table_source === 'allocation' ? 'Allocation' : 'Assigned'})
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
                Please reassign or remove these resources from this assignment before deleting.
              </p>
            </div>
          ) : (
            <div className="py-4">
              <p className="text-sm" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
                Are you sure you want to delete <strong>"{assignmentToDelete?.name}"</strong>? This action cannot be undone.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button appearance="subtle" onClick={() => {
              setDeleteModalOpen(false);
              setAssignmentToDelete(null);
              setLinkedRecords([]);
            }}>
              {linkedRecords.length > 0 ? 'Close' : 'Cancel'}
            </Button>
            {linkedRecords.length === 0 && (
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px', borderRadius: '4px', fontSize: '14px', fontWeight: 500,
                  background: 'var(--ds-background-danger-bold, #CA3521)', color: '#FFFFFF',
                  border: 'none', cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.7 : 1,
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Linked Resources Modal - Enterprise Grade */}
      <Dialog open={resourceModalOpen} onOpenChange={setResourceModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                <span style={{ display: 'inline-flex', color: '#15803D' }}><PeopleGroupIcon label="" size="small" /></span>
              </div>
              <div>
                <div className="text-lg font-semibold">Linked Resources</div>
                <div className="text-sm font-normal" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
                  {resourceModalAssignment?.name || 'Assignment'}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {resourceModalResources.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
                <span style={{ display: 'flex', justifyContent: 'center', opacity: 0.3, marginBottom: 12 }}><PersonIcon label="" size="large" /></span>
                <p>No resources linked to this assignment.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Table Header */}
                <div className="flex items-center px-4 py-2 rounded-lg text-[11px] font-semibold uppercase" style={{ background: 'var(--ds-background-neutral, #F7F8F9)', color: 'var(--ds-text-subtlest, #626F86)' }}>
                  <div className="w-16">RID</div>
                  <div className="flex-1">Name</div>
                </div>

                {/* Table Rows */}
                <ScrollArea className="h-[280px]">
                  <div className="space-y-1">
                    {resourceModalResources.map((resource) => (
                      <div
                        key={resource.id}
                        className="flex items-center px-4 py-3 rounded-lg transition-colors"
                        style={{ border: '1px solid var(--ds-border, #DCDFE4)', background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-hovered, #F1F2F4)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))')}
                      >
                        <div className="w-16">
                          <span className="text-xs font-mono font-medium px-2 py-1 rounded" style={{ color: 'var(--ds-text-brand, #0C66E4)', background: 'var(--ds-background-selected, #E9F2FF)' }}>
                            {resource.resourceId || '—'}
                          </span>
                        </div>
                        <div className="flex-1 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }}>
                            <span style={{ display: 'inline-flex', color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}><PersonIcon label="" size="small" /></span>
                          </div>
                          <span className="text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>{resource.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Footer Summary */}
                <div className="flex items-center justify-between px-4 py-3 mt-3 rounded-lg" style={{ background: 'var(--ds-background-neutral, #F7F8F9)', border: '1px solid var(--ds-border, #DCDFE4)' }}>
                  <span className="text-sm" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>Total Resources</span>
                  <Lozenge appearance="success">
                    {resourceModalResources.length}
                  </Lozenge>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button appearance="subtle" onClick={() => setResourceModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminGuard>
  );
}
