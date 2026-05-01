/**
 * DemandDetailsViewTab - Redesigned with clean layout
 * Description, 4-col metadata, 3-col people, 3-col dates
 * Note: ID, Title, and Status are handled in the drawer header (BusinessRequestDrawer.tsx)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ads';
import { Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { RichTextEditor } from '../RichTextEditor';
import {
  BusinessRequest,
  THEME_OPTIONS,
  STAKEHOLDER_OPTIONS,
  REQUEST_TYPE_OPTIONS,
} from '@/types/business-request';
import { DepartmentSelect } from '@/components/business-requests/DepartmentSelect';
import { UserSelect } from '@/components/business-requests/UserSelect';
import { useDepartments, useBusinessOwners, useDepartmentOwnerMappings, getOwnerIdForDepartment } from '@/hooks/useDepartmentsAndOwners';
import { useActiveDemandProcessSteps } from '@/hooks/useDemandProcessSteps';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useUpdateBusinessRequest } from '@/hooks/useBusinessRequests';

// Quarter options matching the create form format (with hyphens)
const QUARTER_OPTIONS = [
  'Q4-2025', 'Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026',
  'Q1-2027', 'Q2-2027', 'Q3-2027', 'Q4-2027',
];

// Helper to format quarter for display (Q4-2026 -> Q4 2026)
function formatQuarterDisplay(quarter: string): string {
  return quarter.replace('-', ' ');
}

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

// Label component
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium uppercase tracking-wide mb-1.5 block text-gray-500">
      {children}
    </label>
  );
}

// Priority dropdown (locked)
function PriorityDropdown({ value, locked = true }: { value: string; locked?: boolean }) {
  const priorityKey = value?.toLowerCase() || 'unscored';
  const priorityInfo = PRIORITY_LABELS[priorityKey] || PRIORITY_LABELS.unscored;
  
  return (
    <div 
      className="h-9 px-3 rounded-md flex items-center justify-between border cursor-pointer"
      style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--divider)' }}
      onClick={() => locked && toast.info('Priority is auto-calculated from the Scoring tab')}
    >
      <div className="flex items-center gap-2">
        <div className={cn('w-2 h-2 rounded-full', priorityInfo.color)} />
        <span className="text-sm font-medium">{priorityInfo.label}</span>
      </div>
      {locked && <Lock className="w-3.5 h-3.5 text-gray-400" />}
    </div>
  );
}

export function DemandDetailsViewTab({ data, onChange, onDirtyChange, requestId }: DemandDetailsViewTabProps) {
  const queryClient = useQueryClient();
  const { data: departments } = useDepartments();
  const { data: owners } = useBusinessOwners();
  const { data: mappings } = useDepartmentOwnerMappings();
  const { data: processSteps = [] } = useActiveDemandProcessSteps();
  const updateMutation = useUpdateBusinessRequest();
  
  // Auto-save state
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Record<string, any>>({});

  // Fetch reporter profile if needed
  const { data: reporterProfile } = useQuery({
    queryKey: ['profile', data.requestor],
    queryFn: async () => {
      if (!data.requestor || !data.requestor.includes('-')) return null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', data.requestor)
        .single();
      return profile;
    },
    enabled: !!data.requestor && data.requestor.includes('-'),
    staleTime: 5 * 60 * 1000,
  });

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!requestId || Object.keys(pendingChangesRef.current).length === 0) return;
    
    setIsSaving(true);
    const changesToSave = { ...pendingChangesRef.current };
    pendingChangesRef.current = {};
    
    console.log('[DemandDetailsViewTab] Auto-saving changes:', changesToSave);
    
    try {
      await updateMutation.mutateAsync({ id: requestId, data: changesToSave as Partial<BusinessRequest> });
      console.log('[DemandDetailsViewTab] Auto-save successful');
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      queryClient.invalidateQueries({ queryKey: ['business-request', requestId] });
    } catch (error) {
      console.error('[DemandDetailsViewTab] Auto-save failed:', error);
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
    }, 1500);
  }, [performAutoSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        if (Object.keys(pendingChangesRef.current).length > 0) {
          performAutoSave();
        }
      }
    };
  }, [performAutoSave]);

  // Resolve legacy department/owner IDs
  useEffect(() => {
    if (departments && !data.department_id && data.department) {
      const dept = departments.find(d => d.name.toLowerCase() === (data.department || '').toLowerCase());
      if (dept) onChange('department_id', dept.id);
    }
  }, [departments, data.department, data.department_id, onChange]);

  useEffect(() => {
    if (owners && !data.business_owner_id && data.business_owner) {
      const owner = owners.find(o => o.name.toLowerCase() === (data.business_owner || '').toLowerCase());
      if (owner) onChange('business_owner_id', owner.id);
    }
  }, [owners, data.business_owner, data.business_owner_id, onChange]);

  const handleChange = (field: string, value: any) => {
    onChange(field, value);
    onDirtyChange?.(true);
    if (requestId) {
      triggerAutoSave(field, value);
    }
  };

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
    if (requestId) {
      Object.entries(updates).forEach(([field, value]) => {
        pendingChangesRef.current[field] = value;
      });
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = setTimeout(() => performAutoSave(), 1500);
    }
  };

  const handleDateChange = (field: string) => (date: Date | undefined) => {
    const formattedDate = date ? format(date, 'yyyy-MM-dd') : null;
    
    // Keep end_date and impl_target_end_date in sync for Target Complete
    if (field === 'impl_target_end_date') {
      // Target Complete: update both impl_target_end_date (primary) and end_date (for backward compat)
      onChange('_batch', { impl_target_end_date: formattedDate, end_date: formattedDate });
      onDirtyChange?.(true);
      if (requestId) {
        pendingChangesRef.current['impl_target_end_date'] = formattedDate;
        pendingChangesRef.current['end_date'] = formattedDate;
        if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = setTimeout(() => performAutoSave(), 1500);
      }
    } else {
      handleChange(field, formattedDate);
    }
  };

  // Computed values
  const priorityKey = (data.priority_tier as string)?.toLowerCase() || 'unscored';
  const reporterName = data.requestor_name || reporterProfile?.full_name || reporterProfile?.email;
  const businessOwnerName = data.business_owner || owners?.find(o => o.id === data.business_owner_id)?.name;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">

      {/* SECTION 1: Description - Full Width with more vertical space */}
      <div>
        <FieldLabel>Description</FieldLabel>
        <RichTextEditor
          value={data.description || ''}
          onChange={(value) => handleChange('description', value)}
          placeholder="Describe the demand in detail..."
          minHeight="200px"
        />
      </div>

      {/* Divider */}
      <hr className="border-gray-200" />

      {/* SECTION 3: Key Metadata - 4 Column Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <FieldLabel>Priority</FieldLabel>
          <PriorityDropdown value={priorityKey} locked={true} />
        </div>
        <div>
          <FieldLabel>Target Quarter</FieldLabel>
          <Select 
            value={data.planned_quarter?.[0] || ''} 
            onValueChange={(value) => handleChange('planned_quarter', [value])}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select quarter" />
            </SelectTrigger>
            <SelectContent className="z-[500] bg-popover">
              {QUARTER_OPTIONS.map((q) => (
                <SelectItem key={q} value={q}>{formatQuarterDisplay(q)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Department</FieldLabel>
          <DepartmentSelect
            value={data.department_id || null}
            onChange={handleDepartmentChange}
            placeholder="Select department"
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>EA Review Required</FieldLabel>
          <div className="flex items-center gap-3 h-9 px-3 rounded-md border" style={{ borderColor: 'var(--divider)' }}>
            <Switch 
              checked={data.ea_review_required ?? false}
              onCheckedChange={(checked) => handleChange('ea_review_required', checked)}
              className="data-[state=checked]:bg-[var(--secondary-olive)]"
            />
            <span className="text-sm text-gray-600">
              {data.ea_review_required ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 4: People - 3 Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <FieldLabel>Reporter</FieldLabel>
          {reporterName ? (
            <div className="h-9 px-3 rounded-md border flex items-center gap-2" style={{ borderColor: 'var(--divider)' }}>
              <Avatar name={reporterName} size="xxsmall" />
              <span className="text-sm truncate">{reporterName}</span>
            </div>
          ) : (
            <div className="h-9 px-3 rounded-md border flex items-center text-muted-foreground text-sm" style={{ borderColor: 'var(--divider)' }}>
              Not assigned
            </div>
          )}
        </div>
        <div>
          <FieldLabel>Assignee</FieldLabel>
          <UserSelect
            value={data.assignee || null}
            onChange={(userId) => handleChange('assignee', userId)}
            placeholder="Select assignee"
          />
        </div>
        <div>
          <FieldLabel>Business Owner</FieldLabel>
          {businessOwnerName ? (
            <div className="h-9 px-3 rounded-md border flex items-center gap-2" style={{ borderColor: 'var(--divider)', backgroundColor: 'color-mix(in srgb, var(--secondary-bronze) 8%, transparent)' }}>
              <Avatar name={businessOwnerName} size="xxsmall" />
              <span className="text-sm truncate">{businessOwnerName}</span>
            </div>
          ) : (
            <div className="h-9 px-3 rounded-md border flex items-center text-muted-foreground text-sm" style={{ borderColor: 'var(--divider)' }}>
              Auto-assigned from department
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5: Timeline - 3 Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <FieldLabel>Business Ask Date</FieldLabel>
          <CatalystDatePicker 
            value={data.start_date} 
            onChange={(date) => handleDateChange('start_date')(date ?? undefined)}
            placeholder="Select date"
          />
        </div>
        <div>
          <FieldLabel>Kickoff Date</FieldLabel>
          <CatalystDatePicker 
            value={data.impl_start_date} 
            onChange={(date) => handleDateChange('impl_start_date')(date ?? undefined)}
            placeholder="Select date"
          />
        </div>
        <div>
          <FieldLabel>Target Complete</FieldLabel>
          <CatalystDatePicker 
            value={data.impl_target_end_date} 
            onChange={(date) => handleDateChange('impl_target_end_date')(date ?? undefined)}
            placeholder="Select date"
          />
        </div>
      </div>

      {/* SECTION 6: Feature Unification Fields (Notion import + native creation) */}
      {(data.arabic_title || data.scope_url || data.request_type || data.category || data.theme || (data as any).stakeholders?.length > 0 || (data as any).po_user_id || (data as any).project_manager_user_id) && (
        <>
          <hr className="border-gray-200" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Business Request Details
            </p>
            <div className="space-y-3">
              {/* Arabic title */}
              {data.arabic_title && (
                <div>
                  <FieldLabel>Business Request name (Arabic)</FieldLabel>
                  <div
                    className="h-9 px-3 rounded-md border flex items-center text-sm"
                    style={{ direction: 'rtl', textAlign: 'right', borderColor: 'var(--divider)' }}
                  >
                    {data.arabic_title}
                  </div>
                </div>
              )}

              {/* Type / Category / Theme in a 3-col row */}
              {(data.request_type || data.category || data.theme) && (
                <div className="grid grid-cols-3 gap-4">
                  {data.request_type && (
                    <div>
                      <FieldLabel>Type</FieldLabel>
                      <div className="h-9 px-3 rounded-md border flex items-center text-sm capitalize" style={{ borderColor: 'var(--divider)' }}>
                        {REQUEST_TYPE_OPTIONS.find(o => o.value === data.request_type)?.label ?? data.request_type}
                      </div>
                    </div>
                  )}
                  {data.category && (
                    <div>
                      <FieldLabel>Category</FieldLabel>
                      <div className="h-9 px-3 rounded-md border flex items-center text-sm" style={{ borderColor: 'var(--divider)' }}>
                        {data.category}
                      </div>
                    </div>
                  )}
                  {data.theme && (
                    <div>
                      <FieldLabel>Theme</FieldLabel>
                      <div className="h-9 px-3 rounded-md border flex items-center text-sm truncate" style={{ borderColor: 'var(--divider)' }}>
                        {THEME_OPTIONS.find(o => o.value === data.theme)?.labelEn ?? THEME_OPTIONS.find(o => o.value === data.theme)?.label ?? data.theme}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Scope URL */}
              {data.scope_url && (
                <div>
                  <FieldLabel>Scope reference</FieldLabel>
                  <div className="h-9 px-3 rounded-md border flex items-center text-sm" style={{ borderColor: 'var(--divider)' }}>
                    <a
                      href={data.scope_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0052CC] hover:underline truncate"
                    >
                      {data.scope_url}
                    </a>
                  </div>
                </div>
              )}

              {/* Stakeholders */}
              {(data as any).stakeholders?.length > 0 && (
                <div>
                  <FieldLabel>Stakeholders</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {((data as any).stakeholders as string[]).map((v: string) => {
                      const opt = STAKEHOLDER_OPTIONS.find(o => o.value === v);
                      return (
                        <span
                          key={v}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{ background: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))', color: '#344563', border: '1px solid #DFE1E6' }}
                        >
                          {opt?.label ?? v}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* DM + PO row */}
              {((data as any).project_manager_user_id || (data as any).po_user_id) && (
                <div className="grid grid-cols-2 gap-4">
                  {(data as any).project_manager_user_id && (
                    <div>
                      <FieldLabel>Delivery Manager</FieldLabel>
                      <UserSelect
                        value={(data as any).project_manager_user_id}
                        onChange={(userId) => handleChange('project_manager_user_id', userId)}
                        placeholder="Unassigned"
                      />
                    </div>
                  )}
                  {(data as any).po_user_id && (
                    <div>
                      <FieldLabel>Product Owner</FieldLabel>
                      <UserSelect
                        value={(data as any).po_user_id}
                        onChange={(userId) => handleChange('po_user_id', userId)}
                        placeholder="Unassigned"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Targeted feature flag */}
              {(data as any).targeted_feature === true && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center"
                    style={{ background: '#0052CC' }}
                  >
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Targeted feature</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Metadata Footer */}
      <div className="flex items-center gap-6 pt-2 text-xs text-gray-400">
        <span>
          Created: <span className="text-gray-600">
            {data.created_at ? format(parseISO(data.created_at), 'dd MMM yyyy') : '—'}
          </span>
        </span>
        <span>
          Updated: <span className="text-gray-600">
            {data.updated_at ? format(parseISO(data.updated_at), 'dd MMM yyyy') : '—'}
          </span>
        </span>
      </div>
    </div>
  );
}
