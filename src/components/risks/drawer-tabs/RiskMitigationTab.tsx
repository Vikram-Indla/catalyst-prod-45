/**
 * RiskMitigationTab - Mitigation tab for Risk Drawer
 * 
 * Matches Business Drawer Risk form Mitigation section exactly.
 * Uses same layout, spacing, and field structure as RiskFormV2.
 */

import { Risk, RiskFormData, SeverityLevel } from '@/types/risks';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SEVERITY_LEVELS, IMPACT_LEVELS } from '@/constants/risks';
import { Button } from '@/components/ui/button';
import { Upload, FileText } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskMitigationTabProps {
  risk: Risk;
  formData: Partial<RiskFormData>;
  onChange: (field: string, value: any) => void;
  isEditing: boolean;
}

export function RiskMitigationTab({ risk, formData, onChange, isEditing }: RiskMitigationTabProps) {
  const [attachments] = useState<string[]>([]);

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
    const ownerId = formData.owner_id ?? risk.owner_id;
    if (!ownerId) return '—';
    const profile = profiles.find(p => p.id === ownerId);
    return profile?.full_name || profile?.email || '—';
  }, [formData.owner_id, risk.owner_id, profiles]);

  // Check if mitigation is required
  const resolutionMethod = formData.resolution_method ?? risk.resolution_method;
  const isMitigationRequired = resolutionMethod === 'Mitigated';
  const mitigationValue = formData.mitigation ?? risk.mitigation;

  // Check if resolution status is required
  const isResolutionStatusRequired = resolutionMethod === 'Resolved';
  const resolutionStatusValue = formData.resolution_status ?? risk.resolution_status;

  return (
    <div className="space-y-5">
      {/* MITIGATION Section Header */}
      <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">Mitigation</h4>

      {/* Mitigation Plan */}
      <div>
        <Label className="text-xs font-medium">
          Mitigation Plan
          {isMitigationRequired && <span className="text-destructive">*</span>}
        </Label>
        <Textarea
          value={isEditing ? (formData.mitigation ?? '') : (risk.mitigation ?? '')}
          onChange={(e) => onChange('mitigation', e.target.value)}
          readOnly={!isEditing}
          className={cn(
            "mt-1 min-h-[80px] text-sm bg-background border-border",
            isMitigationRequired && !mitigationValue && isEditing && "border-destructive"
          )}
          placeholder={isEditing ? 'How will this risk be mitigated?' : ''}
        />
        {isMitigationRequired && !mitigationValue && isEditing && (
          <div className="flex items-center gap-1 text-destructive text-xs mt-1">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Mitigation Plan is required when Resolution Method is "Mitigated".</span>
          </div>
        )}
      </div>

      {/* Contingency Plan / Controls Implemented */}
      <div>
        <Label className="text-xs font-medium">Contingency Plan / Controls Implemented</Label>
        <Textarea
          value={isEditing ? (formData.contingency ?? '') : (risk.contingency ?? '')}
          onChange={(e) => onChange('contingency', e.target.value)}
          readOnly={!isEditing}
          className="mt-1 min-h-[60px] text-sm bg-background border-border"
          placeholder={isEditing ? 'What is the backup plan if mitigation fails?' : ''}
        />
      </div>

      {/* Mitigation Owner */}
      <div>
        <Label className="text-xs font-medium">Mitigation Owner</Label>
        {isEditing ? (
          <Select 
            value={formData.owner_id ?? risk.owner_id ?? undefined}
            onValueChange={(value) => onChange('owner_id', value)}
          >
            <SelectTrigger className="mt-1 h-9 text-sm">
              <SelectValue placeholder="Select owner..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-lg z-[400]">
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
        <Label className="text-xs font-medium">Residual Risk</Label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div>
            <Label className="text-xs text-muted-foreground">Residual Occurrence</Label>
            {isEditing ? (
              <Select>
                <SelectTrigger className="mt-1 h-9 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-[400]">
                  {SEVERITY_LEVELS.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1 h-9 flex items-center">
                <span className="text-sm">—</span>
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Residual Impact</Label>
            {isEditing ? (
              <Select>
                <SelectTrigger className="mt-1 h-9 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-[400]">
                  {IMPACT_LEVELS.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1 h-9 flex items-center">
                <span className="text-sm">—</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resolution Status */}
      <div>
        <Label className="text-xs font-medium">
          Resolution Status
          {isResolutionStatusRequired && <span className="text-destructive">*</span>}
        </Label>
        <Textarea
          value={isEditing ? (formData.resolution_status ?? '') : (risk.resolution_status ?? '')}
          onChange={(e) => onChange('resolution_status', e.target.value)}
          readOnly={!isEditing}
          className={cn(
            "mt-1 min-h-[60px] text-sm bg-background border-border",
            isResolutionStatusRequired && !resolutionStatusValue && isEditing && "border-destructive"
          )}
          placeholder={isEditing ? 'Current resolution status...' : ''}
        />
        {isResolutionStatusRequired && !resolutionStatusValue && isEditing && (
          <div className="flex items-center gap-1 text-destructive text-xs mt-1">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Resolution Status is required when Resolution Method is "Resolved".</span>
          </div>
        )}
      </div>

      {/* Evidence / Attachments */}
      <div>
        <Label className="text-xs font-medium">Evidence / Attachments</Label>
        {isEditing ? (
          <div className="mt-1 border border-dashed border-border rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop files here, or click to browse
            </p>
            <Button variant="outline" size="sm">
              Browse Files
            </Button>
          </div>
        ) : (
          <div className="mt-1 min-h-[60px] flex items-center justify-center border border-border rounded-lg">
            {attachments.length === 0 ? (
              <span className="text-sm text-muted-foreground">No attachments</span>
            ) : (
              <div className="space-y-2 w-full p-3">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{file}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
