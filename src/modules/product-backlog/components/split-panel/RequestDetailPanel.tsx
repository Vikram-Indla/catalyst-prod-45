/**
 * RequestDetailPanel - Right panel for split panel layout
 * Full detail view of selected request with inline editing
 * Matches the design spec with exact field layout
 */

import React, { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Link2, Edit, Paperclip, Copy, Trash2, 
  FileText, Check, Lock, Star, Calendar, ArrowLeft
} from 'lucide-react';
import { CatalystOwnerAvatar } from '@/components/ui/catalyst';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDepartments, useBusinessOwners, useDepartmentOwnerMappings, getOwnerIdForDepartment } from '@/hooks/useDepartmentsAndOwners';
import { useActiveDemandProcessSteps } from '@/hooks/useDemandProcessSteps';
import { useActiveUsers } from '@/hooks/useActiveUsers';

interface RequestItem {
  id: string;
  _dbId: string;
  summary: string;
  processStep: string;
  score: number | null;
  autoPriority: string;
  rank: number | null;
  reporter?: string | null;
  reporterId?: string | null;
  assignee?: string | null;
  assigneeId?: string | null;
  department: string | null;
  departmentId?: string | null;
  businessOwner?: string | null;
  businessOwnerId?: string | null;
  businessAsk?: string | null;
  kickoff?: string | null;
  targetComplete?: string | null;
  deliveryTrack?: string | null;
  platform?: string | null;
  quarter: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  description?: string;
  ea_review_required?: boolean;
}

interface RequestDetailPanelProps {
  request: RequestItem | null;
  onUpdateField: (field: string, value: any) => void;
  onEdit: () => void;
  onClone: () => void;
  onDelete: () => void;
  onOpenDrawer: () => void;
  onAttachment: () => void;
  onLink: () => void;
  onScore: () => void;
  onMobileBack?: () => void;
  showMobileBack?: boolean;
}

// Status color mapping based on process step value - QA spec colors
const STATUS_COLORS: Record<string, string> = {
  new_request: 'bg-[#2563eb]',      // Blue
  new_demand: 'bg-[#2563eb]',       // Blue
  draft: 'bg-[#737373]',            // Gray
  in_review: 'bg-[#2563eb]',        // Blue
  ea_review: 'bg-[#2563eb]',        // Blue
  analyse: 'bg-[#2563eb]',          // Blue
  approved: 'bg-[#0d9488]',         // Teal
  ready_to_implement: 'bg-[#0d9488]', // Teal
  implement: 'bg-[#2563eb]',        // Blue
  closed: 'bg-[#0d9488]',           // Teal
  completed: 'bg-[#0d9488]',        // Teal
  rejected: 'bg-[#ef4444]',         // Red
  on_hold: 'bg-[#d97706]',          // Orange
};

const getStatusColor = (value: string) => STATUS_COLORS[value] || 'bg-[#737373]';

// Quarter options (canonical storage format: "Q1-2026"; display: "Q1 2026")
const QUARTER_OPTIONS = [
  'Q1-2025', 'Q2-2025', 'Q3-2025', 'Q4-2025',
  'Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026',
  'Q1-2027', 'Q2-2027', 'Q3-2027', 'Q4-2027',
];

function normalizeQuarterValue(q: string | null | undefined): string {
  if (!q) return '';
  return q
    .toUpperCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeQuarterKey(q: string | null | undefined): string {
  if (!q) return '';
  const formatted = normalizeQuarterValue(q); // "Q1 2026"
  return formatted.replace(' ', '-'); // "Q1-2026"
}

// Fallback department options (used if DB fetch fails)
const FALLBACK_DEPARTMENT_OPTIONS = [
  'Standard Incentive',
  'Special Programs',
  'Investment Services',
  'Industrial Development',
  'Regulatory Affairs',
];

// Copy Link button component
function CopyLinkButton({ requestId }: { requestId: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    const url = `${window.location.origin}/industry/backlog?request=${requestId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy}>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy Link'}
    </Button>
  );
}

// Avatar component - uses canonical CatalystOwnerAvatar
function RequestUserAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <CatalystOwnerAvatar 
      name={name} 
      size={size === 'sm' ? 'sm' : 'md'} 
      showTooltip={false}
    />
  );
}

// User Select component - reusable for Assignee and Business Owner
function UserSelect({ 
  value, 
  onChange, 
  users, 
  placeholder = "Select user" 
}: { 
  value: string | null; 
  onChange: (name: string | null) => void;
  users: { id: string; name: string }[];
  placeholder?: string;
}) {
  return (
    <Select value={value || 'unassigned'} onValueChange={(v) => onChange(v === 'unassigned' ? null : v)}>
      <SelectTrigger className="w-full h-10 bg-card border-border">
        <SelectValue placeholder={placeholder}>
          {value ? (
            <div className="flex items-center gap-2">
              <RequestUserAvatar name={value} size="sm" />
              <span>{value}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-[500] bg-popover">
        <SelectItem value="unassigned">
          <span className="text-muted-foreground">Unassigned</span>
        </SelectItem>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.name}>
            <div className="flex items-center gap-2">
              <CatalystOwnerAvatar name={u.name} size="sm" showTooltip={false} />
              <span>{u.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Assignee Select component with profiles data (real-time sync with admin/users)
function AssigneeSelect({ value, onChange }: { value: string | null; onChange: (name: string | null) => void }) {
  // Fetch only active (approved) profiles with real-time sync
  const { data: activeUsers = [] } = useActiveUsers();
  
  // Transform to expected format
  const users = activeUsers.map(u => ({
    id: u.id,
    name: u.full_name || u.email || u.id,
  }));

  return (
    <UserSelect 
      value={value} 
      onChange={onChange} 
      users={users} 
      placeholder="Select assignee" 
    />
  );
}

// Business Owner Select component
function BusinessOwnerSelect({ 
  value, 
  onChange,
  businessOwners 
}: { 
  value: string | null; 
  onChange: (name: string | null) => void;
  businessOwners: { id: string; name: string }[];
}) {
  const users = businessOwners.map(o => ({
    id: o.id,
    name: o.name,
  }));

  return (
    <UserSelect 
      value={value} 
      onChange={onChange} 
      users={users} 
      placeholder="Select business owner" 
    />
  );
}

// Field label component
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-3)' }}>
      {children}
    </label>
  );
}

// Date picker field component
function DatePickerField({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: string | null; 
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
            <Calendar className="mr-2 h-4 w-4" />
            {value ? format(parseISO(value), 'dd/MM/yyyy') : 'Select date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={dateValue}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function RequestDetailPanel({
  request,
  onUpdateField,
  onEdit,
  onClone,
  onDelete,
  onOpenDrawer,
  onAttachment,
  onLink,
  onScore,
  onMobileBack,
  showMobileBack = false,
}: RequestDetailPanelProps) {
  // Fetch departments and business owners from DB
  const { data: departments = [] } = useDepartments();
  const { data: businessOwners = [] } = useBusinessOwners();
  const { data: departmentOwnerMappings = [] } = useDepartmentOwnerMappings();
  
  // Fetch active process steps from DB
  const { data: processSteps = [] } = useActiveDemandProcessSteps();

  // Fetch attachment count
  const { data: attachmentCount = 0 } = useQuery({
    queryKey: ['business-request-attachments-count', request?._dbId],
    queryFn: async () => {
      if (!request?._dbId) return 0;
      const { count, error } = await supabase
        .from('attachments')
        .select('*', { count: 'exact', head: true })
        .eq('entity_type', 'business_request')
        .eq('entity_id', request._dbId);

      if (error) return 0;
      return count || 0;
    },
    enabled: !!request?._dbId,
  });

  // Handle department change - auto-set business owner from mapping
  // Batch related updates to avoid multiple "Updated successfully" toasts
  const handleDepartmentChange = (departmentId: string) => {
    // Find department by ID or name
    const dept = departments.find(d => d.id === departmentId || d.name === departmentId);
    const deptId = dept?.id || departmentId;
    const deptName = dept?.name || departmentId;

    const updates: Record<string, any> = {
      department: deptName,
      departmentId: deptId,
    };

    // Auto-set business owner from mapping
    const ownerId = getOwnerIdForDepartment(deptId, departmentOwnerMappings);
    if (ownerId) {
      const owner = businessOwners.find(o => o.id === ownerId);
      if (owner) {
        updates.businessOwner = owner.name;
        updates.businessOwnerId = owner.id;
      }
    }

    onUpdateField('_batch', updates);
  };

  if (!request) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--surface-2)' }}>
            <FileText className="w-8 h-8" style={{ color: 'var(--text-3)' }} />
          </div>
          <h3 className="text-lg font-medium" style={{ color: 'var(--text-1)' }}>No request selected</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Select a request from the list to view details</p>
        </div>
      </div>
    );
  }

  const statusKey = request.processStep?.toLowerCase().replace(/\s+/g, '_') || 'new_request';
  const currentStep = processSteps.find(s => s.value === statusKey);
  // Format status label: use label from process steps, or format raw value (new_demand -> New demand)
  const statusLabel = currentStep?.label || 
    (request.processStep ? request.processStep.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : 'New Request');
  const statusColor = getStatusColor(statusKey);
  const priorityLabel = request.autoPriority?.charAt(0).toUpperCase() + request.autoPriority?.slice(1) || 'Unscored';
  // Priority dot colors per QA spec
  const priorityColor = request.autoPriority?.toLowerCase() === 'high' || request.autoPriority?.toLowerCase() === 'critical' 
    ? 'bg-[#ef4444]'  // Red for high/critical
    : request.autoPriority?.toLowerCase() === 'medium' 
      ? 'bg-[#d97706]'  // Orange for medium
      : 'bg-[#737373]'; // Gray for low/unscored

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  const handleDateChange = (field: string) => (date: Date | undefined) => {
    if (date) {
      onUpdateField(field, format(date, 'yyyy-MM-dd'));
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="shrink-0 px-4 md:px-6 py-4" style={{ borderBottom: '1px solid var(--divider)' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 flex items-start gap-2">
            {/* Mobile Back Button */}
            {showMobileBack && onMobileBack && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0 -ml-2"
                onClick={onMobileBack}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex-1 min-w-0">
              {/* ID + Rank */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span 
                  className="text-sm font-mono font-semibold cursor-pointer hover:underline text-brand-primary" 
                  onClick={onOpenDrawer}
                >
                  {request.id}
                </span>
                {request.rank && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                    #{request.rank}
                  </Badge>
                )}
              </div>
              {/* Title */}
              <h1 className="text-xl md:text-2xl font-semibold" style={{ color: 'var(--text-1)' }}>
                {request.summary}
              </h1>
            </div>
          </div>

          {/* Copy Link Button */}
          <div className="ml-2 md:ml-4 shrink-0">
            <CopyLinkButton requestId={request.id} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
        <div className="space-y-5">
          {/* Row 1: Status | EA Review Required? */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select 
                value={statusKey} 
                onValueChange={(value) => onUpdateField('processStep', value)}
              >
                <SelectTrigger className="w-full h-10 bg-card border-border">
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
              <div className="h-10 px-3 rounded-md flex items-center justify-between bg-card border border-border">
                <span className="text-sm font-medium text-foreground">
                  {request.ea_review_required ? 'Yes' : 'No'}
                </span>
                <Switch 
                  id="ea-review"
                  checked={request.ea_review_required ?? true}
                  onCheckedChange={(checked) => onUpdateField('ea_review_required', checked)}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Priority | Target Quarter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <FieldLabel>Priority</FieldLabel>
              <div 
                className="h-10 px-3 rounded-md flex items-center justify-between cursor-pointer bg-card border border-border"
                onClick={() => toast.info('Priority is auto-calculated from the Scoring tab')}
              >
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', priorityColor)} />
                  <span className="text-sm font-medium text-foreground">
                    {priorityLabel}
                  </span>
                </div>
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>

            <div>
              <FieldLabel>Target Quarter</FieldLabel>
              <Select 
                value={normalizeQuarterKey(request.quarter) || ''}
                onValueChange={(value) => onUpdateField('quarter', normalizeQuarterKey(value))}
              >
                <SelectTrigger className="w-full h-10 bg-card border-border">
                  <SelectValue placeholder="Select quarter..." />
                </SelectTrigger>
                <SelectContent className="z-[500] bg-popover">
                  {QUARTER_OPTIONS.map((q) => (
                    <SelectItem key={q} value={q}>
                      {normalizeQuarterValue(q)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Reporter | Assignee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <FieldLabel>Reporter</FieldLabel>
              <div className="h-10 px-3 rounded-md flex items-center justify-between bg-card border border-border">
                {request.reporter ? (
                  <>
                    <div className="flex items-center gap-2">
                      <RequestUserAvatar name={request.reporter} size="sm" />
                      <span className="text-sm font-medium text-foreground">
                        {request.reporter}
                      </span>
                    </div>
                    <button 
                      className="text-xs font-medium text-brand-primary hover:underline"
                      onClick={() => toast.info('Change reporter')}
                    >
                      Change
                    </button>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Not assigned</span>
                )}
              </div>
            </div>

            <div>
              <FieldLabel>Assignee</FieldLabel>
              <AssigneeSelect
                value={request.assignee || null}
                onChange={(name) => onUpdateField('assignee', name)}
              />
            </div>
          </div>

          {/* Row 4: Department | Business Owner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <FieldLabel>Department</FieldLabel>
              <Select 
                value={request.departmentId || request.department || ''} 
                onValueChange={handleDepartmentChange}
              >
                <SelectTrigger className="w-full h-10 bg-card border-border">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="z-[500] bg-popover">
                  {(departments.length > 0 ? departments : FALLBACK_DEPARTMENT_OPTIONS.map(name => ({ id: name, name }))).map((d) => (
                    <SelectItem key={typeof d === 'string' ? d : d.id} value={typeof d === 'string' ? d : d.id}>
                      {typeof d === 'string' ? d : d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <FieldLabel>Business Owner</FieldLabel>
              <BusinessOwnerSelect
                value={request.businessOwner || null}
                onChange={(name) => {
                  const owner = businessOwners.find(o => o.name === name);
                  onUpdateField('_batch', {
                    businessOwner: name,
                    businessOwnerId: owner?.id || null,
                  });
                }}
                businessOwners={businessOwners}
              />
            </div>
          </div>

          {/* Row 5: Business Ask Date | Kickoff Date | Target Complete */}
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <DatePickerField 
              label="Business Ask Date" 
              value={request.businessAsk} 
              onChange={handleDateChange('businessAsk')}
            />
            <DatePickerField 
              label="Kickoff Date" 
              value={request.kickoff} 
              onChange={handleDateChange('kickoff')}
            />
            <DatePickerField 
              label="Target Complete" 
              value={request.targetComplete} 
              onChange={handleDateChange('targetComplete')}
            />
          </div>

          {/* Timestamps */}
          <div className="pt-4 flex flex-col sm:flex-row gap-4 sm:gap-8" style={{ borderTop: '1px solid var(--divider)' }}>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                CREATED
              </span>
              <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-2)' }}>
                {formatDate(request.createdAt)}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                LAST UPDATED
              </span>
              <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-2)' }}>
                {formatDate(request.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div 
        className="shrink-0 px-3 md:px-6 py-3 flex items-center justify-start gap-1.5 md:gap-2 overflow-x-auto"
        style={{ borderTop: '1px solid var(--divider)', backgroundColor: 'var(--surface-2)' }}
      >
        <Button variant="outline" size="sm" className="gap-1 px-2 md:px-3 shrink-0" onClick={onOpenDrawer}>
          <Edit className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Edit</span>
        </Button>
        <Button variant="outline" size="sm" className="gap-1 px-2 md:px-3 shrink-0" onClick={onAttachment}>
          <Paperclip className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Attach</span>
          {attachmentCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1.5 text-xs">
              {attachmentCount}
            </Badge>
          )}
        </Button>
        <Button variant="outline" size="sm" className="gap-1 px-2 md:px-3 shrink-0" onClick={onClone}>
          <Copy className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Clone</span>
        </Button>
        <Button variant="outline" size="sm" className="gap-1 px-2 md:px-3 shrink-0" onClick={onLink}>
          <Link2 className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Link</span>
        </Button>
        <Button variant="outline" size="sm" className="gap-1 px-2 md:px-3 shrink-0" onClick={onScore}>
          <Star className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Score</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1 px-2 md:px-3 shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10" 
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Delete</span>
        </Button>
      </div>
    </div>
  );
}
