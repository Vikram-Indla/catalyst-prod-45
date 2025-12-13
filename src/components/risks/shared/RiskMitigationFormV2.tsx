/**
 * RiskMitigationFormV2 - Mitigation-specific fields for Risk Drawer tabs
 * 
 * Separates mitigation fields for the Mitigation tab in RiskDrawer.
 * Uses same styling patterns as RiskFormV2.
 */

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface RiskMitigationDataV2 {
  mitigation: string | null;
  contingency: string | null;
  resolution_status: string | null;
  owner_id: string | null;
  residual_occurrence?: string | null;
  residual_impact?: string | null;
}

interface RiskMitigationFormV2Props {
  mode: 'view' | 'edit';
  value: RiskMitigationDataV2;
  onChange: (data: RiskMitigationDataV2) => void;
}

const SEVERITY_OPTIONS = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
];

export function RiskMitigationFormV2({
  mode,
  value,
  onChange,
}: RiskMitigationFormV2Props) {
  const isEditing = mode === 'edit';

  // Fetch profiles for owner dropdown
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
    return profile?.full_name || profile?.email || '—';
  }, [value.owner_id, profiles]);

  // Handle field changes
  const handleChange = (field: keyof RiskMitigationDataV2, fieldValue: any) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-5">
      {/* Mitigation Plan */}
      <div>
        <Label className="text-sm font-medium">Mitigation Plan</Label>
        <Textarea
          value={value.mitigation || ''}
          onChange={e => handleChange('mitigation', e.target.value)}
          placeholder={isEditing ? 'Describe the mitigation plan...' : ''}
          readOnly={!isEditing}
          className="mt-1 min-h-[120px] bg-background border-border"
        />
      </div>

      {/* Controls Implemented */}
      <div>
        <Label className="text-sm font-medium">Controls Implemented</Label>
        <Textarea
          value={value.contingency || ''}
          onChange={e => handleChange('contingency', e.target.value)}
          placeholder={isEditing ? 'List the controls that have been implemented...' : ''}
          readOnly={!isEditing}
          className="mt-1 min-h-[80px] bg-background border-border"
        />
      </div>

      {/* Mitigation Owner */}
      <div>
        <Label className="text-sm font-medium">Mitigation Owner</Label>
        {isEditing ? (
          <Select
            value={value.owner_id || undefined}
            onValueChange={v => handleChange('owner_id', v)}
          >
            <SelectTrigger className="mt-1 h-9">
              <SelectValue placeholder="Select owner..." />
            </SelectTrigger>
            <SelectContent className="bg-popover z-[400]">
              {profiles.map(profile => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.full_name || profile.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="mt-1 h-9 flex items-center">
            <span className="text-sm">{ownerName}</span>
          </div>
        )}
      </div>

      {/* Residual Risk - 2 column */}
      <div>
        <Label className="text-sm font-medium">Residual Risk</Label>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Residual Occurrence</Label>
            {isEditing ? (
              <Select
                value={value.residual_occurrence || undefined}
                onValueChange={v => handleChange('residual_occurrence', v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[400]">
                  {SEVERITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="h-9 flex items-center">
                <span className="text-sm">{value.residual_occurrence || '—'}</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Residual Impact</Label>
            {isEditing ? (
              <Select
                value={value.residual_impact || undefined}
                onValueChange={v => handleChange('residual_impact', v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[400]">
                  {SEVERITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="h-9 flex items-center">
                <span className="text-sm">{value.residual_impact || '—'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resolution Status */}
      <div>
        <Label className="text-sm font-medium">Resolution Status</Label>
        <Textarea
          value={value.resolution_status || ''}
          onChange={e => handleChange('resolution_status', e.target.value)}
          placeholder={isEditing ? 'Describe the current resolution status...' : ''}
          readOnly={!isEditing}
          className="mt-1 min-h-[80px] bg-background border-border"
        />
      </div>
    </div>
  );
}
