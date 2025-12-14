/**
 * RiskFormV2 - Canonical shared risk form component
 * 
 * Single source of truth for risk capture across all Catalyst contexts:
 * - Business Drawer Risks tab
 * - Enterprise Risk Drawer
 * - Epic / Feature / Theme / Project risk tabs
 * 
 * Follows Business Drawer as the canonical design with:
 * - Bordered card containers for sections
 * - All fields have visible borders (even in view mode)
 */

import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveRiskSeverityLevels } from '@/hooks/useRiskSeverityLevels';

// Risk form data type
export interface RiskFormDataV2 {
  title: string;
  description: string;
  status: 'Open' | 'Closed';
  resolution_method: 'Resolved' | 'Owned' | 'Accepted' | 'Mitigated';
  occurrence: 'Low' | 'Medium' | 'High' | 'Critical' | null;
  impact: 'Low' | 'Medium' | 'High' | 'Critical' | null;
  critical_path: 'Yes' | 'No' | null;
  target_resolution_date: string | null;
  consequence: string | null;
  mitigation: string | null;
  contingency: string | null;
  resolution_status: string | null;
  owner_id: string | null;
}

// Context types for where the risk is displayed
export type RiskContext = 
  | 'business_request' 
  | 'epic' 
  | 'feature' 
  | 'story' 
  | 'theme' 
  | 'project' 
  | 'program' 
  | 'enterprise';

interface RiskFormV2Props {
  mode: 'view' | 'edit';
  value: RiskFormDataV2;
  onChange: (data: RiskFormDataV2) => void;
  onSave?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  context?: RiskContext;
  contextInfo?: {
    entityType: string;
    entityKey?: string;
    entityTitle?: string;
    businessLine?: string;
  };
  showContextMetadata?: boolean;
  createdBy?: string;
  createdAt?: string;
}

// Configuration options
const STATUS_OPTIONS = [
  { value: 'Open', label: 'Open' },
  { value: 'Closed', label: 'Closed' },
];

const RESOLUTION_METHOD_OPTIONS = [
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Owned', label: 'Owned' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Mitigated', label: 'Mitigated' },
];

// Fallback severity options if database is empty
const FALLBACK_SEVERITY_OPTIONS = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
];

const CRITICAL_PATH_OPTIONS = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

export function RiskFormV2({
  mode,
  value,
  onChange,
  onSave,
  onCancel,
  isLoading = false,
  context = 'enterprise',
  contextInfo,
  showContextMetadata = false,
  createdBy,
  createdAt,
}: RiskFormV2Props) {
  const [formError, setFormError] = useState('');
  const isEditing = mode === 'edit';
  
  // Check if mitigation is required based on resolution_method
  const isMitigationRequired = value.resolution_method === 'Mitigated';
  const showMitigationError = formError === 'mitigation_required';

  // Fetch severity levels from database
  const { data: severityLevels = [] } = useActiveRiskSeverityLevels();
  
  // Use database-driven options or fallback
  const SEVERITY_OPTIONS = useMemo(() => {
    if (severityLevels.length > 0) {
      return severityLevels.map(level => ({ value: level.value, label: level.label }));
    }
    return FALLBACK_SEVERITY_OPTIONS;
  }, [severityLevels]);

  // Fetch profiles for owner display
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Get owner name for display
  const ownerName = useMemo(() => {
    if (!value.owner_id) return '—';
    const profile = profiles.find(p => p.id === value.owner_id);
    return profile?.full_name || profile?.email || value.owner_id;
  }, [value.owner_id, profiles]);

  // Get created by name
  const createdByName = useMemo(() => {
    if (!createdBy) return '—';
    const profile = profiles.find(p => p.id === createdBy);
    return profile?.full_name || profile?.email || createdBy;
  }, [createdBy, profiles]);

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  // Handle field changes
  const handleChange = (field: keyof RiskFormDataV2, fieldValue: any) => {
    onChange({ ...value, [field]: fieldValue });
    if (formError) setFormError('');
  };

  // Check if resolution status is required (when resolution_method is 'Resolved')
  const isResolutionStatusRequired = value.resolution_method === 'Resolved';

  // Handle save with validation
  const handleSave = () => {
    if (!value.title?.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!value.description?.trim()) {
      setFormError('Description is required');
      return;
    }
    if (isMitigationRequired && !value.mitigation?.trim()) {
      setFormError('mitigation_required');
      return;
    }
    if (isResolutionStatusRequired && !value.resolution_status?.trim()) {
      setFormError('resolution_status_required');
      return;
    }
    onSave?.();
  };

  return (
    <div className="space-y-5">
      {/* RISK DETAILS Section - Wrapped in bordered card */}
      <div className="border border-border rounded-lg p-5 bg-white">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-gold mb-4">Risk Details</h4>
        
        {/* Status and Resolution Method - 2 column */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Status</Label>
            <Select 
              value={value.status} 
              onValueChange={v => handleChange('status', v)}
              disabled={!isEditing}
            >
              <SelectTrigger className="h-9 text-sm border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-[400]">
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Resolution Method</Label>
            <Select 
              value={value.resolution_method} 
              onValueChange={v => handleChange('resolution_method', v)}
              disabled={!isEditing}
            >
              <SelectTrigger className="h-9 text-sm border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-[400]">
                {RESOLUTION_METHOD_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Risk Owner - full width */}
        <div className="mb-4">
          <Label className="text-xs font-medium mb-1.5 block">Risk Owner</Label>
          {isEditing ? (
            <Select
              value={value.owner_id || undefined}
              onValueChange={v => handleChange('owner_id', v === 'UNASSIGNED' ? null : v)}
            >
              <SelectTrigger className="h-9 text-sm border-border">
                <SelectValue placeholder="Select owner..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-[400]">
                <SelectItem value="UNASSIGNED">
                  <span className="text-muted-foreground italic">Unassigned</span>
                </SelectItem>
                {profiles.map(profile => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name || profile.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="h-9 flex items-center px-3 text-sm border border-border rounded-md bg-muted/30">
              {value.owner_id ? ownerName : <span className="text-muted-foreground italic">Unassigned</span>}
            </div>
          )}
        </div>

        {/* Title */}
        <div className="mb-4">
          <Label className="text-xs font-medium mb-1.5 block">
            Title<span className="text-destructive">*</span>
          </Label>
          <Input
            value={value.title || ''}
            onChange={e => handleChange('title', e.target.value)}
            placeholder="Risk title"
            readOnly={!isEditing}
            className="h-9 text-sm border-border"
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <Label className="text-xs font-medium mb-1.5 block">
            Description<span className="text-destructive">*</span>
          </Label>
          <Textarea
            value={value.description || ''}
            onChange={e => handleChange('description', e.target.value)}
            placeholder={isEditing ? 'Describe the risk...' : ''}
            readOnly={!isEditing}
            className="min-h-[80px] text-sm border-border"
          />
        </div>

        {/* Occurrence, Impact, Critical Path - 3 column */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Occurrence</Label>
            <Select 
              value={value.occurrence || ''} 
              onValueChange={v => handleChange('occurrence', v || null)}
              disabled={!isEditing}
            >
              <SelectTrigger className="h-9 text-sm border-border">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-[400]">
                {SEVERITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Impact</Label>
            <Select 
              value={value.impact || ''} 
              onValueChange={v => handleChange('impact', v || null)}
              disabled={!isEditing}
            >
              <SelectTrigger className="h-9 text-sm border-border">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-[400]">
                {SEVERITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Critical Path</Label>
            <Select 
              value={value.critical_path || ''} 
              onValueChange={v => handleChange('critical_path', v || null)}
              disabled={!isEditing}
            >
              <SelectTrigger className="h-9 text-sm border-border">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-[400]">
                {CRITICAL_PATH_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Target Resolution Date */}
        <div className="mb-4">
          <Label className="text-xs font-medium mb-1.5 block">Target Resolution Date</Label>
          {isEditing ? (
            <CatalystDatePicker
              value={value.target_resolution_date ? parseISO(value.target_resolution_date) : undefined}
              onChange={(date) => handleChange('target_resolution_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="Select date"
            />
          ) : (
            <Input
              value={formatDate(value.target_resolution_date) || ''}
              readOnly
              placeholder="Select date"
              className="h-9 text-sm border-border"
            />
          )}
        </div>

        {/* Consequence */}
        <div>
          <Label className="text-xs font-medium mb-1.5 block">Consequence</Label>
          <Textarea
            value={value.consequence || ''}
            onChange={e => handleChange('consequence', e.target.value)}
            placeholder={isEditing ? 'What are the consequences if this risk occurs?' : ''}
            readOnly={!isEditing}
            className="min-h-[60px] text-sm border-border"
          />
        </div>
      </div>

      {/* MITIGATION Section - Wrapped in bordered card */}
      <div className="border border-border rounded-lg p-5 bg-white">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-gold mb-4">Mitigation</h4>

        {/* Mitigation Plan */}
        <div className="mb-4">
          <Label className="text-xs font-medium mb-1.5 block">
            Mitigation Plan
            {isMitigationRequired && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            value={value.mitigation || ''}
            onChange={e => handleChange('mitigation', e.target.value)}
            placeholder={isEditing ? 'How will this risk be mitigated?' : ''}
            readOnly={!isEditing}
            className={cn(
              "min-h-[60px] text-sm border-border",
              showMitigationError && "border-destructive focus-visible:ring-destructive"
            )}
          />
          {showMitigationError && (
            <div className="flex items-center gap-1 text-destructive text-xs mt-1">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Mitigation Plan is required when Resolution Method is "Mitigated".</span>
            </div>
          )}
        </div>

        {/* Contingency Plan (Controls Implemented) */}
        <div className="mb-4">
          <Label className="text-xs font-medium mb-1.5 block">Contingency Plan / Controls Implemented</Label>
          <Textarea
            value={value.contingency || ''}
            onChange={e => handleChange('contingency', e.target.value)}
            placeholder={isEditing ? 'What is the backup plan if mitigation fails?' : ''}
            readOnly={!isEditing}
            className="min-h-[60px] text-sm border-border"
          />
        </div>

        {/* Resolution Status */}
        <div>
          <Label className="text-xs font-medium mb-1.5 block">
            Resolution Status
            {isResolutionStatusRequired && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            value={value.resolution_status || ''}
            onChange={e => handleChange('resolution_status', e.target.value)}
            placeholder={isEditing ? 'Current resolution status...' : ''}
            readOnly={!isEditing}
            className={cn(
              "min-h-[60px] text-sm border-border",
              formError === 'resolution_status_required' && "border-destructive focus-visible:ring-destructive"
            )}
          />
          {formError === 'resolution_status_required' && (
            <div className="flex items-center gap-1 text-destructive text-xs mt-1">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Resolution Status is required when Resolution Method is "Resolved".</span>
            </div>
          )}
        </div>
      </div>

      {/* Context Metadata Block - only shown in certain contexts */}
      {showContextMetadata && (
        <div className="border border-border rounded-lg p-5 bg-white">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Owner</span>
              <p className="font-medium text-sm">{ownerName}</p>
            </div>
            {contextInfo?.businessLine && (
              <div>
                <span className="text-muted-foreground text-xs">Business Line</span>
                <p className="font-medium text-sm">{contextInfo.businessLine}</p>
              </div>
            )}
            {createdBy && (
              <div>
                <span className="text-muted-foreground text-xs">Created By</span>
                <p className="font-medium text-sm">{createdByName}</p>
              </div>
            )}
            {createdAt && (
              <div>
                <span className="text-muted-foreground text-xs">Created Date</span>
                <p className="font-medium text-sm">{formatDate(createdAt)}</p>
              </div>
            )}
            {contextInfo?.entityType && contextInfo.entityType !== 'enterprise' && (
              <div className="col-span-2">
                <span className="text-muted-foreground text-xs">Context</span>
                <p className="font-medium text-sm">
                  {contextInfo.entityType} Risk
                  {contextInfo.entityKey && ` · ${contextInfo.entityKey}`}
                  {contextInfo.entityTitle && ` · ${contextInfo.entityTitle}`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error message - show general errors but not inline-specific errors */}
      {formError && formError !== 'mitigation_required' && formError !== 'resolution_status_required' && (
        <div className="flex items-center gap-1 text-destructive text-xs">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{formError}</span>
        </div>
      )}

      {/* Action buttons - only show in edit mode with save/cancel handlers */}
      {isEditing && onSave && onCancel && (
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
}

// Default empty form data
export const getDefaultRiskFormData = (): RiskFormDataV2 => ({
  title: '',
  description: '',
  status: 'Open',
  resolution_method: 'Owned',
  occurrence: null,
  impact: null,
  critical_path: null,
  target_resolution_date: null,
  consequence: null,
  mitigation: null,
  contingency: null,
  resolution_status: null,
  owner_id: null,
});
