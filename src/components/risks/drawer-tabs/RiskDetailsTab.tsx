/**
 * RiskDetailsTab - Details tab for Risk Drawer
 * 
 * NOW USES RiskFormV2 for visual parity with Business Drawer Risks tab.
 * This is the canonical risk details layout.
 */

import { Risk, RiskFormData } from '@/types/risks';
import { RiskFormV2, RiskFormDataV2 } from '@/components/risks/shared/RiskFormV2';
import { format, parseISO } from 'date-fns';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RiskDetailsTabProps {
  risk: Risk;
  formData: Partial<RiskFormData>;
  onChange: (field: string, value: any) => void;
  isEditing: boolean;
}

export function RiskDetailsTab({ risk, formData, onChange, isEditing }: RiskDetailsTabProps) {
  // Fetch profiles for owner/created-by display
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

  // Get owner name
  const ownerName = useMemo(() => {
    const ownerId = formData.owner_id ?? risk.owner_id;
    if (!ownerId) return '—';
    const profile = profiles.find(p => p.id === ownerId);
    return profile?.full_name || profile?.email || '—';
  }, [formData.owner_id, risk.owner_id, profiles]);

  // Get created-by name
  const createdByName = useMemo(() => {
    if (!risk.created_by) return '—';
    const profile = profiles.find(p => p.id === risk.created_by);
    return profile?.full_name || profile?.email || '—';
  }, [risk.created_by, profiles]);

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  // Convert risk + formData to RiskFormDataV2 format
  const riskFormData: RiskFormDataV2 = {
    title: (formData.title ?? risk.title) || '',
    description: (formData.description ?? risk.description) || '',
    status: (formData.status ?? risk.status) || 'Open',
    resolution_method: (formData.resolution_method ?? risk.resolution_method) || 'Owned',
    occurrence: (formData.occurrence ?? risk.occurrence) || null,
    impact: (formData.impact ?? risk.impact) || null,
    critical_path: (formData.critical_path ?? risk.critical_path) || null,
    target_resolution_date: (formData.target_resolution_date ?? risk.target_resolution_date) || null,
    consequence: (formData.consequence ?? risk.consequence) || null,
    // Mitigation fields are NOT shown in Details tab - they have their own tab
    mitigation: null,
    contingency: null,
    resolution_status: null,
    owner_id: (formData.owner_id ?? risk.owner_id) || null,
  };

  // Handle changes from RiskFormV2
  const handleFormChange = (data: RiskFormDataV2) => {
    // Map RiskFormDataV2 changes back to individual field calls
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'mitigation' && key !== 'contingency' && key !== 'resolution_status') {
        onChange(key, value);
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* RISK DETAILS Section Header */}
      <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">Risk Details</h4>
      
      {/* Use RiskFormV2 for the form fields - Details section only */}
      <RiskFormDetailsSection
        mode={isEditing ? 'edit' : 'view'}
        value={riskFormData}
        onChange={handleFormChange}
        profiles={profiles}
      />

      {/* Metadata Block - Owner, Business Line, Created By, Created Date */}
      <div className="pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Owner</span>
            <p className="font-medium text-sm">{ownerName}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Business Line</span>
            <p className="font-medium text-sm">{risk.program_id ? 'Enterprise' : '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Created By</span>
            <p className="font-medium text-sm">{createdByName}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Created Date</span>
            <p className="font-medium text-sm">{formatDate(risk.created_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * RiskFormDetailsSection - Renders the Details section fields
 * Matches Business Drawer Risk form exactly: Status, Resolution Method, Title, Description,
 * Occurrence, Impact, Critical Path (3-col), Target Resolution Date, Consequence
 */
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { cn } from '@/lib/utils';

interface RiskFormDetailsSectionProps {
  mode: 'view' | 'edit';
  value: RiskFormDataV2;
  onChange: (data: RiskFormDataV2) => void;
  profiles: { id: string; full_name: string | null; email: string | null }[];
}

const STATUS_OPTIONS = [
  { value: 'Open', label: 'Open', color: 'bg-red-100 text-red-700' },
  { value: 'Closed', label: 'Closed', color: 'bg-muted text-muted-foreground' },
];

const RESOLUTION_METHOD_OPTIONS = [
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Owned', label: 'Owned' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Mitigated', label: 'Mitigated' },
];

const SEVERITY_OPTIONS = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
];

const CRITICAL_PATH_OPTIONS = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

function RiskFormDetailsSection({ mode, value, onChange, profiles }: RiskFormDetailsSectionProps) {
  const isEditing = mode === 'edit';

  const handleChange = (field: keyof RiskFormDataV2, fieldValue: any) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const getStatusConfig = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  };

  return (
    <div className="space-y-4">
      {/* Status and Resolution Method - 2 column */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium">Status</Label>
          {isEditing ? (
            <Select 
              value={value.status} 
              onValueChange={v => handleChange('status', v)}
            >
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-[400]">
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="mt-1 h-9 flex items-center">
              <Badge className={cn("text-xs", getStatusConfig(value.status).color)}>
                {value.status}
              </Badge>
            </div>
          )}
        </div>
        <div>
          <Label className="text-xs font-medium">Resolution Method</Label>
          {isEditing ? (
            <Select 
              value={value.resolution_method} 
              onValueChange={v => handleChange('resolution_method', v)}
            >
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-[400]">
                {RESOLUTION_METHOD_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="mt-1 h-9 flex items-center">
              <span className="text-sm font-medium">{value.resolution_method}</span>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <Label className="text-xs font-medium">
          Title<span className="text-destructive">*</span>
        </Label>
        {isEditing ? (
          <Input
            value={value.title || ''}
            onChange={e => handleChange('title', e.target.value)}
            placeholder="Risk title"
            className="mt-1 h-9 text-sm"
          />
        ) : (
          <div className="mt-1 h-9 flex items-center">
            <span className="text-sm">{value.title || '—'}</span>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <Label className="text-xs font-medium">
          Description<span className="text-destructive">*</span>
        </Label>
        <Textarea
          value={value.description || ''}
          onChange={e => handleChange('description', e.target.value)}
          placeholder={isEditing ? 'Describe the risk...' : ''}
          readOnly={!isEditing}
          className="mt-1 min-h-[80px] text-sm bg-background border-border"
        />
      </div>

      {/* Occurrence, Impact, Critical Path - 3 column */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs font-medium">Occurrence</Label>
          {isEditing ? (
            <Select 
              value={value.occurrence || undefined} 
              onValueChange={v => handleChange('occurrence', v)}
            >
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-[400]">
                {SEVERITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="mt-1 h-9 flex items-center">
              <span className="text-sm">{value.occurrence || '—'}</span>
            </div>
          )}
        </div>
        <div>
          <Label className="text-xs font-medium">Impact</Label>
          {isEditing ? (
            <Select 
              value={value.impact || undefined} 
              onValueChange={v => handleChange('impact', v)}
            >
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-[400]">
                {SEVERITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="mt-1 h-9 flex items-center">
              <span className="text-sm">{value.impact || '—'}</span>
            </div>
          )}
        </div>
        <div>
          <Label className="text-xs font-medium">Critical Path</Label>
          {isEditing ? (
            <Select 
              value={value.critical_path || undefined} 
              onValueChange={v => handleChange('critical_path', v)}
            >
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-[400]">
                {CRITICAL_PATH_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="mt-1 h-9 flex items-center">
              {value.critical_path === 'Yes' ? (
                <Badge variant="destructive" className="bg-red-500 text-white">Yes</Badge>
              ) : (
                <span className="text-sm">{value.critical_path || '—'}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Target Resolution Date */}
      <div>
        <Label className="text-xs font-medium">Target Resolution Date</Label>
        <div className="mt-1">
          {isEditing ? (
            <CatalystDatePicker
              value={value.target_resolution_date ? parseISO(value.target_resolution_date) : undefined}
              onChange={(date) => handleChange('target_resolution_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="Select date"
            />
          ) : (
            <div className="h-9 flex items-center">
              <span className="text-sm">
                {value.target_resolution_date 
                  ? format(parseISO(value.target_resolution_date), 'dd/MM/yyyy') 
                  : '—'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Consequence */}
      <div>
        <Label className="text-xs font-medium">Consequence</Label>
        <Textarea
          value={value.consequence || ''}
          onChange={e => handleChange('consequence', e.target.value)}
          placeholder={isEditing ? 'What are the consequences if this risk occurs?' : ''}
          readOnly={!isEditing}
          className="mt-1 min-h-[60px] text-sm bg-background border-border"
        />
      </div>
    </div>
  );
}
