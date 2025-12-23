import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { BusinessRequest, PROCESS_STEPS } from '@/types/business-request';
import { DepartmentSelect } from '@/components/business-requests/DepartmentSelect';
import { BusinessOwnerSelect } from '@/components/business-requests/BusinessOwnerSelect';
import { useDepartments, useBusinessOwners, useDepartmentOwnerMappings, getOwnerIdForDepartment } from '@/hooks/useDepartmentsAndOwners';
import { useActiveDemandProcessSteps } from '@/hooks/useDemandProcessSteps';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Unified quarter options - using space format to match database storage
const QUARTER_OPTIONS = [
  'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024',
  'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025',
  'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026',
  'Q1 2027', 'Q2 2027', 'Q3 2027', 'Q4 2027',
];

// Normalize quarter value to space format for consistent storage
const normalizeQuarter = (q: string | undefined): string => {
  if (!q) return '';
  // Convert hyphen to space for consistency
  return q.replace('-', ' ').trim();
};

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
      <SelectTrigger className="w-full h-10">
        <SelectValue placeholder="Select assignee">
          {value ? (
            <div className="flex items-center gap-2 min-w-0">
              <UserAvatar name={value} size="sm" />
              <span className="truncate">{value}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Not assigned</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-[500]">
        <SelectItem value="unassigned">
          <span className="text-muted-foreground">Unassigned</span>
        </SelectItem>
        {profiles.map((p) => (
          <SelectItem key={p.id} value={p.full_name || p.email || p.id}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[hsl(var(--secondary-bronze))] flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                {(p.full_name || p.email || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <span className="truncate">{p.full_name || p.email}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Date picker field component - uses shorter format to prevent truncation
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
    <div className="flex-1 min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-10 px-2.5",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-1.5 h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {value ? format(parseISO(value), 'dd MMM yyyy') : 'Select'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[500]" align="start">
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

export function DemandDetailsViewTab({ data, onChange, onDirtyChange }: DemandDetailsViewTabProps) {
  const { data: departments } = useDepartments();
  const { data: owners } = useBusinessOwners();
  const { data: mappings } = useDepartmentOwnerMappings();
  const { data: processSteps = PROCESS_STEPS } = useActiveDemandProcessSteps();

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
  };

  const handleBusinessOwnerChange = (ownerId: string) => {
    handleChange('business_owner_id', ownerId);
    const owner = owners?.find(o => o.id === ownerId);
    if (owner) {
      handleChange('business_owner', owner.name);
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

  // Get reporter display name
  const reporterName = data.requestor_name || data.requestor || null;

  return (
    <div className="space-y-5 pb-6">
      {/* Row 1: Status | EA Review Required? */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="min-w-0">
          <FieldLabel>Status</FieldLabel>
          <Select 
            value={statusKey} 
            onValueChange={(value) => handleChange('process_step', value)}
          >
            <SelectTrigger className="w-full h-10">
              <SelectValue>
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColor)} />
                  <span className="truncate">{statusLabel}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="z-[500]">
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

        <div className="min-w-0">
          <FieldLabel>EA Review Required?</FieldLabel>
          <div 
            className="h-10 px-3 rounded-md flex items-center justify-between"
            style={{ backgroundColor: 'hsl(var(--secondary-olive) / 0.08)', border: '1px solid hsl(var(--secondary-olive) / 0.2)' }}
          >
            <span className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
              {data.ea_review_required ? 'Yes' : 'No'}
            </span>
            <Switch 
              id="ea-review"
              checked={data.ea_review_required ?? true}
              onCheckedChange={(checked) => handleChange('ea_review_required', checked)}
              className="data-[state=checked]:bg-[hsl(var(--secondary-olive))] flex-shrink-0 ml-2"
            />
          </div>
        </div>
      </div>

      {/* Row 2: Priority | Target Quarter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="min-w-0">
          <FieldLabel>Priority</FieldLabel>
          <div 
            className="h-10 px-3 rounded-md flex items-center justify-between cursor-pointer"
            style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--divider)' }}
            onClick={() => toast.info('Priority is auto-calculated from the Scoring tab')}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', priorityInfo.color)} />
              <span className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
                {priorityInfo.label}
              </span>
            </div>
            <Lock className="w-3.5 h-3.5 flex-shrink-0 ml-2" style={{ color: 'var(--text-3)' }} />
          </div>
        </div>

        <div className="min-w-0">
          <FieldLabel>Target Quarter</FieldLabel>
          <Select 
            value={Array.isArray(data.planned_quarter) ? data.planned_quarter[0] || '' : data.planned_quarter || ''} 
            onValueChange={(value) => handleChange('planned_quarter', [value])}
          >
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="Select quarter" />
            </SelectTrigger>
            <SelectContent className="z-[500]">
              {QUARTER_OPTIONS.map((q) => (
                <SelectItem key={q} value={q}>{q}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 3: Reporter | Assignee */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="min-w-0">
          <FieldLabel>Reporter</FieldLabel>
          <div 
            className="h-10 px-3 rounded-md flex items-center gap-2"
            style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--divider)' }}
          >
            {reporterName ? (
              <>
                <UserAvatar name={reporterName} size="sm" />
                <span className="text-sm font-medium truncate flex-1 min-w-0" style={{ color: 'var(--text-1)' }}>
                  {reporterName}
                </span>
              </>
            ) : (
              <span className="text-sm truncate" style={{ color: 'var(--text-3)' }}>Not assigned</span>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <FieldLabel>Assignee</FieldLabel>
          <AssigneeSelect
            value={data.assignee || null}
            onChange={(name) => handleChange('assignee', name)}
          />
        </div>
      </div>

      {/* Row 4: Department | Business Owner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="min-w-0">
          <FieldLabel>Department</FieldLabel>
          <DepartmentSelect
            value={data.department_id || null}
            onChange={handleDepartmentChange}
            placeholder="Select department"
          />
        </div>

        <div className="min-w-0">
          <FieldLabel>Business Owner</FieldLabel>
          <div 
            className="h-10 px-3 rounded-md flex items-center gap-2"
            style={{ backgroundColor: 'hsl(var(--secondary-bronze) / 0.08)', border: '1px solid hsl(var(--secondary-bronze) / 0.2)' }}
          >
            {data.business_owner ? (
              <>
                <UserAvatar name={data.business_owner} size="sm" />
                <span className="text-sm font-medium truncate flex-1 min-w-0" style={{ color: 'var(--text-1)' }}>
                  {data.business_owner}
                </span>
              </>
            ) : (
              <span className="text-sm truncate" style={{ color: 'var(--text-3)' }}>Not assigned</span>
            )}
          </div>
        </div>
      </div>

      {/* Row 5: Business Ask Date | Kickoff Date | Target Complete */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <DatePickerField 
          label="Business Ask" 
          value={data.start_date} 
          onChange={handleDateChange('start_date')}
        />
        <DatePickerField 
          label="Kickoff" 
          value={data.impl_start_date} 
          onChange={handleDateChange('impl_start_date')}
        />
        <DatePickerField 
          label="Target Complete" 
          value={data.end_date} 
          onChange={handleDateChange('end_date')}
        />
      </div>

      {/* Details Section with Summary and Description */}
      <div className="pt-4" style={{ borderTop: '1px solid var(--divider)' }}>
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
            <Textarea
              value={data.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Detailed description"
              rows={6}
              className="bg-background resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
