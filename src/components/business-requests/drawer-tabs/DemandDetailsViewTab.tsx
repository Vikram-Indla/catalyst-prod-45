/**
 * DemandDetailsViewTab - Catalyst Design System
 * Enterprise-grade details with all demand fields + Summary and Description
 * Supports auto-save with debouncing
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ChevronDown, Calendar as CalendarIcon, Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '../RichTextEditor';
import { BusinessRequest, PROCESS_STEPS } from '@/types/business-request';
import { DepartmentSelect } from '@/components/business-requests/DepartmentSelect';
import { useDepartments, useBusinessOwners, useDepartmentOwnerMappings, getOwnerIdForDepartment } from '@/hooks/useDepartmentsAndOwners';
import { useActiveDemandProcessSteps } from '@/hooks/useDemandProcessSteps';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useUpdateBusinessRequest } from '@/hooks/useBusinessRequests';

const QUARTER_OPTIONS = [
  'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025',
  'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026',
  'Q1 2027', 'Q2 2027',
];

// Status color mapping
const STATUS_COLORS: Record<string, string> = {
  new_request: 'bg-amber-500',
  new_demand: 'bg-blue-500',
  in_review: 'bg-indigo-500',
  ea_review: 'bg-violet-500',
  analyse: 'bg-purple-500',
  approved: 'bg-green-500',
  ready_to_implement: 'bg-teal-500',
  implement: 'bg-cyan-500',
  closed: 'bg-gray-400',
  rejected: 'bg-red-500',
  on_hold: 'bg-orange-500',
};

const getStatusColor = (value: string) => STATUS_COLORS[value?.toLowerCase()] || 'bg-gray-400';

// Priority tier config
const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: 'High', color: 'bg-red-500' },
  medium: { label: 'Medium', color: 'bg-amber-500' },
  low: { label: 'Low', color: 'bg-green-500' },
  unscored: { label: 'Unscored', color: 'bg-gray-400' },
};

interface DemandDetailsViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  requestId?: string | null;
}

// Field label component
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-3)' }}>
      {children}
    </label>
  );
}

// Avatar component
function UserAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  
  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs';
  
  return (
    <div 
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white shrink-0",
        sizeClasses
      )}
      style={{ backgroundColor: 'hsl(var(--secondary-bronze))' }}
    >
      {initials}
    </div>
  );
}

// Assignee Select component
function AssigneeSelect({ value, onChange }: { value: string | null; onChange: (name: string | null) => void }) {
  const { data: profiles = [] } = useQuery({
    queryKey: ['all-profiles-for-assignment-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('approval_status', 'APPROVED')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Select value={value || 'unassigned'} onValueChange={(v) => onChange(v === 'unassigned' ? null : v)}>
      <SelectTrigger 
        className="w-full h-10"
        style={{ 
          backgroundColor: 'hsl(var(--secondary-bronze) / 0.08)', 
          border: '1px solid hsl(var(--secondary-bronze) / 0.2)' 
        }}
      >
        <SelectValue placeholder="Select assignee">
          {value ? (
            <div className="flex items-center gap-2">
              <UserAvatar name={value} size="sm" />
              <span>{value}</span>
            </div>
          ) : (
            'Not assigned'
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-[500] bg-popover">
        <SelectItem value="unassigned">
          <span className="text-muted-foreground">Unassigned</span>
        </SelectItem>
        {profiles.map((p) => (
          <SelectItem key={p.id} value={p.full_name || p.email || p.id}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[hsl(var(--secondary-bronze))] flex items-center justify-center text-white text-[10px] font-semibold">
                {(p.full_name || p.email || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <span>{p.full_name || p.email}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Date picker field component
function DatePickerField({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: string | null | undefined; 
  onChange: (date: Date | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const dateValue = value ? parseISO(value) : undefined;
  
  return (
    <div className="flex-1">
      <FieldLabel>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-10",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(parseISO(value), 'dd/MM/yyyy') : 'Select date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[500] bg-popover" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function DemandDetailsViewTab({ data, onChange, onDirtyChange, requestId }: DemandDetailsViewTabProps) {
  const queryClient = useQueryClient();
  const { data: departments } = useDepartments();
  const { data: owners } = useBusinessOwners();
  const { data: mappings } = useDepartmentOwnerMappings();
  const { data: processSteps = PROCESS_STEPS } = useActiveDemandProcessSteps();
  const updateMutation = useUpdateBusinessRequest();
  
  // Auto-save state
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Record<string, any>>({});

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!requestId || Object.keys(pendingChangesRef.current).length === 0) return;
    
    setIsSaving(true);
    const changesToSave = { ...pendingChangesRef.current };
    pendingChangesRef.current = {};
    
    try {
      await updateMutation.mutateAsync({ id: requestId, data: changesToSave as Partial<BusinessRequest> });
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      queryClient.invalidateQueries({ queryKey: ['business-request', requestId] });
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Restore changes on failure so they can be retried
      pendingChangesRef.current = { ...changesToSave, ...pendingChangesRef.current };
      toast.error('Auto-save failed. Changes will be retried.');
    } finally {
      setIsSaving(false);
    }
  }, [requestId, updateMutation, queryClient]);

  // Debounced auto-save trigger
  const triggerAutoSave = useCallback((field: string, value: any) => {
    pendingChangesRef.current[field] = value;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, 1500); // 1.5 second debounce
  }, [performAutoSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        // Save any pending changes immediately on unmount
        if (Object.keys(pendingChangesRef.current).length > 0) {
          performAutoSave();
        }
      }
    };
  }, [performAutoSave]);

  // Resolve legacy text values to IDs on initial load
  useEffect(() => {
    if (departments && !data.department_id && data.department) {
      const dept = departments.find(d => d.name.toLowerCase() === (data.department || '').toLowerCase());
      if (dept) {
        onChange('department_id', dept.id);
      }
    }
  }, [departments, data.department, data.department_id, onChange]);

  useEffect(() => {
    if (owners && !data.business_owner_id && data.business_owner) {
      const owner = owners.find(o => o.name.toLowerCase() === (data.business_owner || '').toLowerCase());
      if (owner) {
        onChange('business_owner_id', owner.id);
      }
    }
  }, [owners, data.business_owner, data.business_owner_id, onChange]);

  const handleChange = (field: string, value: any) => {
    onChange(field, value);
    onDirtyChange?.(true);
    // Trigger auto-save if we have a requestId
    if (requestId) {
      triggerAutoSave(field, value);
    }
  };

  // Handle department change with auto-setting of business owner
  const handleDepartmentChange = (departmentId: string) => {
    const dept = departments?.find(d => d.id === departmentId);
    
    const updates: Record<string, any> = {
      department_id: departmentId,
      department: dept?.name || null,
    };

    if (mappings) {
      const ownerId = getOwnerIdForDepartment(departmentId, mappings);
      if (ownerId) {
        const owner = owners?.find(o => o.id === ownerId);
        updates.business_owner_id = ownerId;
        updates.business_owner = owner?.name || null;
      }
    }

    onChange('_batch', updates);
    onDirtyChange?.(true);
    // Auto-save all batch updates
    if (requestId) {
      Object.entries(updates).forEach(([field, value]) => {
        pendingChangesRef.current[field] = value;
      });
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        performAutoSave();
      }, 1500);
    }
  };

  const handleDateChange = (field: string) => (date: Date | undefined) => {
    handleChange(field, date ? format(date, 'yyyy-MM-dd') : null);
  };

  // Get status display info
  const statusKey = data.process_step?.toLowerCase() || 'new_demand';
  const statusInfo = processSteps.find(s => s.value === statusKey);
  const statusLabel = statusInfo?.label || 'New demand';
  const statusColor = getStatusColor(statusKey);

  // Get priority display info
  const priorityKey = (data.priority_tier as string)?.toLowerCase() || 'unscored';
  const priorityInfo = PRIORITY_LABELS[priorityKey] || PRIORITY_LABELS.unscored;

  // Get reporter display name - prefer resolved name over UUID
  const reporterName = data.requestor_name || (data.requestor && !data.requestor.includes('-') ? data.requestor : null);

  return (
    <div className="space-y-5 p-4 md:p-5 pb-6">
      {/* Auto-save indicator */}
      {isSaving && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving...
        </div>
      )}

      {/* Details Section with Summary and Description - MOVED TO TOP */}
      <div 
        className="rounded-lg p-4"
        style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--divider)' }}
      >
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-3)' }}>
          DETAILS
        </h3>
        
        {/* Summary field */}
        <div className="mb-4">
          <FieldLabel>
            Summary <span className="text-red-500">*</span>
          </FieldLabel>
          <Input
            value={data.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Enter summary"
            className="bg-background"
          />
        </div>
        
        {/* Description field */}
        <div>
          <FieldLabel>Description</FieldLabel>
          <RichTextEditor
            value={data.description || ''}
            onChange={(value) => handleChange('description', value)}
            placeholder="Enter detailed description..."
            minHeight="200px"
          />
        </div>
      </div>

      {/* Row 1: Status | EA Review Required? */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div>
          <FieldLabel>Status</FieldLabel>
          <Select 
            value={statusKey} 
            onValueChange={(value) => handleChange('process_step', value)}
          >
            <SelectTrigger className="w-full h-10">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', statusColor)} />
                  {statusLabel}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="z-[500] bg-popover">
              {processSteps.map((step) => (
                <SelectItem key={step.value} value={step.value}>
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', getStatusColor(step.value))} />
                    {step.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <FieldLabel>EA Review Required?</FieldLabel>
          <div 
            className="h-10 px-3 rounded-md flex items-center justify-between"
            style={{ backgroundColor: 'hsl(var(--secondary-olive) / 0.08)', border: '1px solid hsl(var(--secondary-olive) / 0.2)' }}
          >
            <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
              {data.ea_review_required ? 'Yes' : 'No'}
            </span>
            <Switch 
              id="ea-review"
              checked={data.ea_review_required ?? true}
              onCheckedChange={(checked) => handleChange('ea_review_required', checked)}
              className="data-[state=checked]:bg-[hsl(var(--secondary-olive))]"
            />
          </div>
        </div>
      </div>

      {/* Row 2: Priority | Target Quarter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div>
          <FieldLabel>Priority</FieldLabel>
          <div 
            className="h-10 px-3 rounded-md flex items-center justify-between cursor-pointer"
            style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--divider)' }}
            onClick={() => toast.info('Priority is auto-calculated from the Scoring tab')}
          >
            <div className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full', priorityInfo.color)} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                {priorityInfo.label}
              </span>
            </div>
            <Lock className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
          </div>
        </div>

        <div>
          <FieldLabel>Target Quarter</FieldLabel>
          <Select 
            value={data.planned_quarter?.[0] || ''} 
            onValueChange={(value) => handleChange('planned_quarter', [value])}
          >
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="Select quarter" />
            </SelectTrigger>
            <SelectContent className="z-[500] bg-popover">
              {QUARTER_OPTIONS.map((q) => (
                <SelectItem key={q} value={q}>{q}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 3: Reporter | Assignee */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div>
          <FieldLabel>Reporter</FieldLabel>
          <div 
            className="h-10 px-3 rounded-md flex items-center justify-between"
            style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--divider)' }}
          >
            {reporterName ? (
              <>
                <div className="flex items-center gap-2">
                  <UserAvatar name={reporterName} size="sm" />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                    {reporterName}
                  </span>
                </div>
                <button 
                  className="text-xs font-medium"
                  style={{ color: 'hsl(var(--secondary-bronze))' }}
                  onClick={() => toast.info('Change reporter feature coming soon')}
                >
                  Change
                </button>
              </>
            ) : (
              <span className="text-sm" style={{ color: 'var(--text-3)' }}>Not assigned</span>
            )}
          </div>
        </div>

        <div>
          <FieldLabel>Assignee</FieldLabel>
          <AssigneeSelect
            value={data.assignee || null}
            onChange={(name) => handleChange('assignee', name)}
          />
        </div>
      </div>

      {/* Row 4: Department | Business Owner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div>
          <FieldLabel>Department</FieldLabel>
          <DepartmentSelect
            value={data.department_id || null}
            onChange={handleDepartmentChange}
            placeholder="Select department"
          />
        </div>

        <div>
          <FieldLabel>Business Owner</FieldLabel>
          <div 
            className="h-10 px-3 rounded-md flex items-center justify-between"
            style={{ backgroundColor: 'hsl(var(--secondary-bronze) / 0.08)', border: '1px solid hsl(var(--secondary-bronze) / 0.2)' }}
          >
            {data.business_owner ? (
              <div className="flex items-center gap-2">
                <UserAvatar name={data.business_owner} size="sm" />
                <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                  {data.business_owner}
                </span>
              </div>
            ) : (
              <span className="text-sm" style={{ color: 'var(--text-3)' }}>Not assigned</span>
            )}
          </div>
        </div>
      </div>

      {/* Row 5: Business Ask Date | Kickoff Date | Target Complete */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <DatePickerField 
          label="Business Ask Date" 
          value={data.start_date} 
          onChange={handleDateChange('start_date')}
        />
        <DatePickerField 
          label="Kickoff Date" 
          value={data.impl_start_date} 
          onChange={handleDateChange('impl_start_date')}
        />
        <DatePickerField 
          label="Target Complete" 
          value={data.end_date} 
          onChange={handleDateChange('end_date')}
        />
      </div>

    </div>
  );
}
