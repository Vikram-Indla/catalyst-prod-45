/**
 * RiskMitigationTab - Mitigation tab for Risk Drawer
 * Follows Business Drawer pattern with unified spacing and layout
 */

import { Risk, RiskFormData, SeverityLevel } from '@/types/risks';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SEVERITY_LEVELS, IMPACT_LEVELS } from '@/constants/risks';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X } from 'lucide-react';
import { useState } from 'react';

interface RiskMitigationTabProps {
  risk: Risk;
  formData: Partial<RiskFormData>;
  onChange: (field: string, value: any) => void;
  isEditing: boolean;
}

export function RiskMitigationTab({ risk, formData, onChange, isEditing }: RiskMitigationTabProps) {
  const [attachments, setAttachments] = useState<string[]>([]);

  return (
    <div className="space-y-6">
      {/* A. Mitigation Plan */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Mitigation Plan</Label>
        <Textarea
          value={isEditing ? formData.mitigation || '' : risk.mitigation || ''}
          onChange={(e) => onChange('mitigation', e.target.value)}
          readOnly={!isEditing}
          className="min-h-[120px] bg-background border-border"
          placeholder={isEditing ? 'Describe the mitigation plan...' : ''}
        />
      </div>

      {/* B. Controls Implemented */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Controls Implemented</Label>
        <Textarea
          value={isEditing ? formData.contingency || '' : risk.contingency || ''}
          onChange={(e) => onChange('contingency', e.target.value)}
          readOnly={!isEditing}
          className="min-h-[80px] bg-background border-border"
          placeholder={isEditing ? 'List the controls that have been implemented...' : ''}
        />
      </div>

      {/* C. Mitigation Owner */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Mitigation Owner</Label>
        {isEditing ? (
          <Input
            value={formData.owner_id || ''}
            onChange={(e) => onChange('owner_id', e.target.value)}
            className="h-9 bg-background border-border"
            placeholder="Select owner..."
          />
        ) : (
          <div className="h-9 flex items-center">
            <span className="text-sm">{risk.owner_id || '—'}</span>
          </div>
        )}
      </div>

      {/* D. Residual Risk */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Residual Risk</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Residual Occurrence</Label>
            {isEditing ? (
              <Select>
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
                <span className="text-sm">—</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Residual Impact</Label>
            {isEditing ? (
              <Select>
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
                <span className="text-sm">—</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* E. Resolution Status */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Resolution Status</Label>
        <Textarea
          value={isEditing ? formData.resolution_status || '' : risk.resolution_status || ''}
          onChange={(e) => onChange('resolution_status', e.target.value)}
          readOnly={!isEditing}
          className="min-h-[80px] bg-background border-border"
          placeholder={isEditing ? 'Describe the current resolution status...' : ''}
        />
      </div>

      {/* F. Evidence / Attachments */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Evidence / Attachments</Label>
        {isEditing ? (
          <div className="border border-dashed border-border rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop files here, or click to browse
            </p>
            <Button variant="outline" size="sm">
              Browse Files
            </Button>
          </div>
        ) : (
          <div className="min-h-[60px] flex items-center justify-center border border-border rounded-lg">
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
