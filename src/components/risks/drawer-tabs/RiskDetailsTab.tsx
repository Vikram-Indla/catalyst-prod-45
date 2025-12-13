/**
 * RiskDetailsTab - Details tab for Risk Drawer
 * Follows Business Drawer pattern with unified spacing and layout
 */

import { Risk, RiskFormData, RiskStatus, RoamStatus, SeverityLevel, YesNo } from '@/types/risks';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { ROAM_STATUSES, RISK_STATUSES, SEVERITY_LEVELS, IMPACT_LEVELS } from '@/constants/risks';
import { format, parseISO } from 'date-fns';

interface RiskDetailsTabProps {
  risk: Risk;
  formData: Partial<RiskFormData>;
  onChange: (field: string, value: any) => void;
  isEditing: boolean;
}

export function RiskDetailsTab({ risk, formData, onChange, isEditing }: RiskDetailsTabProps) {
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* A. Status & ROAM Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Status</Label>
          {isEditing ? (
            <Select
              value={formData.status}
              onValueChange={(value) => onChange('status', value)}
            >
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[400]">
                {RISK_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge 
              variant={risk.status === 'Open' ? 'destructive' : 'default'}
              className={risk.status === 'Open' ? 'bg-green-600' : 'bg-muted'}
            >
              {risk.status}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Resolution Method</Label>
          {isEditing ? (
            <Select
              value={formData.resolution_method}
              onValueChange={(value) => onChange('resolution_method', value)}
            >
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[400]">
                {ROAM_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm font-medium">{risk.resolution_method}</span>
          )}
        </div>
      </div>

      {/* B. Description */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Description</Label>
        <Textarea
          value={isEditing ? formData.description || '' : risk.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          readOnly={!isEditing}
          className="min-h-[100px] bg-background border-border"
          placeholder={isEditing ? 'Enter risk description...' : ''}
        />
      </div>

      {/* C. Risk Scoring Row (3 fields on ONE ROW) */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Occurrence</Label>
          {isEditing ? (
            <Select
              value={formData.occurrence || undefined}
              onValueChange={(value) => onChange('occurrence', value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[400]">
                {SEVERITY_LEVELS.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="h-9 flex items-center">
              <span className="text-sm">{risk.occurrence || '—'}</span>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Impact</Label>
          {isEditing ? (
            <Select
              value={formData.impact || undefined}
              onValueChange={(value) => onChange('impact', value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[400]">
                {IMPACT_LEVELS.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="h-9 flex items-center">
              <span className="text-sm">{risk.impact || '—'}</span>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Critical Path</Label>
          {isEditing ? (
            <Select
              value={formData.critical_path || undefined}
              onValueChange={(value) => onChange('critical_path', value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[400]">
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="h-9 flex items-center">
              {risk.critical_path === 'Yes' ? (
                <Badge variant="destructive" className="bg-red-500">Yes</Badge>
              ) : (
                <span className="text-sm">{risk.critical_path || '—'}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* D. Target Resolution Date */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Target Resolution Date</Label>
        {isEditing ? (
          <CatalystDatePicker
            value={formData.target_resolution_date ? parseISO(formData.target_resolution_date) : undefined}
            onChange={(date) => onChange('target_resolution_date', date ? format(date, 'yyyy-MM-dd') : null)}
          />
        ) : (
          <div className="h-9 flex items-center">
            <span className="text-sm">{formatDate(risk.target_resolution_date)}</span>
          </div>
        )}
      </div>

      {/* E. Consequence */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Consequence</Label>
        <Textarea
          value={isEditing ? formData.consequence || '' : risk.consequence || ''}
          onChange={(e) => onChange('consequence', e.target.value)}
          readOnly={!isEditing}
          className="min-h-[80px] bg-background border-border"
          placeholder={isEditing ? 'Describe the consequence if this risk occurs...' : ''}
        />
      </div>

      {/* F. Metadata Block */}
      <div className="pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Owner</span>
            <p className="font-medium">{risk.owner_id || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Business Line</span>
            <p className="font-medium">{risk.program_id || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Created By</span>
            <p className="font-medium">{risk.created_by || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Created Date</span>
            <p className="font-medium">{formatDate(risk.created_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
