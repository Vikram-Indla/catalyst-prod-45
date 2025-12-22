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
  FileText, Check, Lock, Star, Calendar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

interface RequestItem {
  id: string;
  _dbId: string;
  summary: string;
  processStep: string;
  score: number | null;
  autoPriority: string;
  rank: number | null;
  reporter?: string | null;
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
  eaReviewRequired?: boolean;
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
}

// Status options
const STATUS_OPTIONS = [
  { value: 'new_demand', label: 'New Demand', color: 'bg-blue-500' },
  { value: 'new_request', label: 'New Request', color: 'bg-amber-500' },
  { value: 'analyse', label: 'Analyse', color: 'bg-purple-500' },
  { value: 'approved', label: 'Approved', color: 'bg-green-500' },
  { value: 'implement', label: 'Implement', color: 'bg-cyan-500' },
  { value: 'closed', label: 'Closed', color: 'bg-gray-400' },
];

// Quarter options
const QUARTER_OPTIONS = [
  'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025',
  'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026',
  'Q1 2027', 'Q2 2027',
];

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

// Avatar component
function UserAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
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
}: RequestDetailPanelProps) {
  // Fetch departments and business owners from DB
  const { data: departments = [] } = useDepartments();
  const { data: businessOwners = [] } = useBusinessOwners();
  const { data: departmentOwnerMappings = [] } = useDepartmentOwnerMappings();

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
  const handleDepartmentChange = (departmentId: string) => {
    // Find department by ID or name
    const dept = departments.find(d => d.id === departmentId || d.name === departmentId);
    const deptId = dept?.id || departmentId;
    const deptName = dept?.name || departmentId;
    
    // Update department
    onUpdateField('department', deptName);
    onUpdateField('departmentId', deptId);
    
    // Auto-set business owner from mapping
    const ownerId = getOwnerIdForDepartment(deptId, departmentOwnerMappings);
    if (ownerId) {
      const owner = businessOwners.find(o => o.id === ownerId);
      if (owner) {
        onUpdateField('businessOwner', owner.name);
        onUpdateField('businessOwnerId', owner.id);
      }
    }
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
  const statusOption = STATUS_OPTIONS.find(s => s.value === statusKey) || STATUS_OPTIONS[1];
  const priorityLabel = request.autoPriority?.charAt(0).toUpperCase() + request.autoPriority?.slice(1) || 'Unscored';
  const priorityColor = request.autoPriority?.toLowerCase() === 'high' || request.autoPriority?.toLowerCase() === 'critical' 
    ? 'bg-green-500' 
    : request.autoPriority?.toLowerCase() === 'medium' 
      ? 'bg-amber-500' 
      : 'bg-gray-400';

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
      <div className="shrink-0 px-6 py-4" style={{ borderBottom: '1px solid var(--divider)' }}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* ID + Rank */}
            <div className="flex items-center gap-2 mb-1">
              <span 
                className="text-sm font-mono font-medium cursor-pointer hover:underline" 
                style={{ color: 'hsl(var(--secondary-bronze))' }}
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
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-1)' }}>
              {request.summary}
            </h1>
          </div>

          {/* Copy Link Button */}
          <div className="ml-4">
            <CopyLinkButton requestId={request.id} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="space-y-5">
          {/* Row 1: Status | Business Owner */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select 
                value={statusKey} 
                onValueChange={(value) => onUpdateField('processStep', value)}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', statusOption.color)} />
                      {statusOption.label}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', opt.color)} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <FieldLabel>Business Owner</FieldLabel>
              <div 
                className="h-10 px-3 rounded-md flex items-center justify-between"
                style={{ backgroundColor: 'hsl(var(--secondary-bronze) / 0.08)', border: '1px solid hsl(var(--secondary-bronze) / 0.2)' }}
              >
                {request.businessOwner ? (
                  <>
                    <div className="flex items-center gap-2">
                      <UserAvatar name={request.businessOwner} size="sm" />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                        {request.businessOwner}
                      </span>
                    </div>
                    <button 
                      className="text-xs font-medium"
                      style={{ color: 'hsl(var(--secondary-bronze))' }}
                      onClick={() => toast.info('Change business owner')}
                    >
                      Change
                    </button>
                  </>
                ) : (
                  <span className="text-sm" style={{ color: 'var(--text-3)' }}>Not assigned</span>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Priority | Target Quarter */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <FieldLabel>Priority</FieldLabel>
              <div 
                className="h-10 px-3 rounded-md flex items-center justify-between"
                style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--divider)' }}
              >
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', priorityColor)} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                    {priorityLabel}
                  </span>
                </div>
                <Lock className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
              </div>
            </div>

            <div>
              <FieldLabel>Target Quarter</FieldLabel>
              <Select 
                value={request.quarter || ''} 
                onValueChange={(value) => onUpdateField('quarter', value)}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  {QUARTER_OPTIONS.map((q) => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Reporter | Assignee */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <FieldLabel>Reporter</FieldLabel>
              <div 
                className="h-10 px-3 rounded-md flex items-center justify-between"
                style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--divider)' }}
              >
                {request.reporter ? (
                  <>
                    <div className="flex items-center gap-2">
                      <UserAvatar name={request.reporter} size="sm" />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                        {request.reporter}
                      </span>
                    </div>
                    <button 
                      className="text-xs font-medium"
                      style={{ color: 'hsl(var(--secondary-bronze))' }}
                      onClick={() => toast.info('Change reporter')}
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
              <div 
                className="h-10 px-3 rounded-md flex items-center justify-between"
                style={{ backgroundColor: 'hsl(var(--secondary-bronze) / 0.08)', border: '1px solid hsl(var(--secondary-bronze) / 0.2)' }}
              >
                {request.assignee ? (
                  <>
                    <div className="flex items-center gap-2">
                      <UserAvatar name={request.assignee} size="sm" />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                        {request.assignee}
                      </span>
                    </div>
                    <button 
                      className="text-xs font-medium"
                      style={{ color: 'hsl(var(--secondary-bronze))' }}
                      onClick={() => toast.info('Change assignee')}
                    >
                      Change
                    </button>
                  </>
                ) : (
                  <span className="text-sm" style={{ color: 'var(--text-3)' }}>Not assigned</span>
                )}
              </div>
            </div>
          </div>

          {/* Row 4: Department | EA Review Required? */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <FieldLabel>Department</FieldLabel>
              <Select 
                value={request.departmentId || request.department || ''} 
                onValueChange={handleDepartmentChange}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {(departments.length > 0 ? departments : FALLBACK_DEPARTMENT_OPTIONS.map(name => ({ id: name, name }))).map((d) => (
                    <SelectItem key={typeof d === 'string' ? d : d.id} value={typeof d === 'string' ? d : d.id}>
                      {typeof d === 'string' ? d : d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div 
                className="h-10 px-3 rounded-md flex items-center gap-3 mt-6"
                style={{ backgroundColor: 'hsl(var(--secondary-olive) / 0.08)', border: '1px solid hsl(var(--secondary-olive) / 0.2)' }}
              >
                <Checkbox 
                  id="ea-review"
                  checked={request.eaReviewRequired ?? true}
                  onCheckedChange={(checked) => onUpdateField('eaReviewRequired', checked)}
                  className="data-[state=checked]:bg-[hsl(var(--secondary-olive))] data-[state=checked]:border-[hsl(var(--secondary-olive))]"
                />
                <label htmlFor="ea-review" className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                  EA Review Required?
                </label>
              </div>
            </div>
          </div>

          {/* Row 5: Business Ask Date | Kickoff Date | Target Complete */}
          <div className="grid grid-cols-3 gap-4">
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
          <div className="pt-4 flex gap-8" style={{ borderTop: '1px solid var(--divider)' }}>
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
        className="shrink-0 px-6 py-3 flex items-center justify-center gap-2"
        style={{ borderTop: '1px solid var(--divider)', backgroundColor: 'var(--surface-2)' }}
      >
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenDrawer}>
          <Edit className="w-3.5 h-3.5" />
          Edit Details
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onAttachment}>
          <Paperclip className="w-3.5 h-3.5" />
          Attach
          {attachmentCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1.5 text-xs">
              {attachmentCount}
            </Badge>
          )}
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onClone}>
          <Copy className="w-3.5 h-3.5" />
          Clone
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onLink}>
          <Link2 className="w-3.5 h-3.5" />
          Link
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onScore}>
          <Star className="w-3.5 h-3.5" />
          Score
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" 
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}
