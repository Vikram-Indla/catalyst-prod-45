/**
 * EA Review Tab - Pre-Planning Governance
 * CIO & EA-grade review interface for architectural alignment and delivery strategy
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { UserPicker } from '@/components/ui/user-picker';
import { format } from 'date-fns';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { BusinessRequest } from '@/types/business-request';
import { AlertCircle, Lock, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface EAReviewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const EA_STATUS_OPTIONS = [
  { value: 'not_reviewed', label: 'Not Reviewed', icon: Clock },
  { value: 'in_review', label: 'In Review', icon: Clock },
  { value: 'approved', label: 'Approved', icon: CheckCircle2 },
  { value: 'approved_with_notes', label: 'Approved with Notes', icon: AlertCircle },
  { value: 'rejected', label: 'Rejected', icon: XCircle },
];

const ARCH_ALIGNMENT_OPTIONS = [
  { value: 'aligned', label: 'Aligned' },
  { value: 'partially_aligned', label: 'Partially Aligned' },
  { value: 'not_aligned', label: 'Not Aligned' },
];

const IMPACT_AREA_OPTIONS = [
  { value: 'application', label: 'Application' },
  { value: 'integration', label: 'Integration' },
  { value: 'data', label: 'Data' },
  { value: 'security', label: 'Security' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'mixed', label: 'Mixed' },
];

const COMPLEXITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const RISK_LEVEL_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const DELIVERY_MODEL_OPTIONS = [
  { value: 'in_house', label: 'In-house Development' },
  { value: 'outsourced', label: 'Outsourced (Vendor)' },
];

const VENDOR_RISK_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function EAReviewTab({ data, onChange }: EAReviewTabProps) {
  const isRfpApproved = data.rfp_status === 'Approved';
  const eaStatus = data.ea_status || 'not_reviewed';
  const requiresConstraints = eaStatus === 'approved_with_notes' || eaStatus === 'rejected';
  const requiresRiskNotes = data.ea_risk_level === 'high';
  const isOutsourced = data.ea_delivery_model === 'outsourced';

  // Match Review Date styling: thin border + background surface
  const fieldContainerStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '0.5rem',
  };

  return (
    <div className="flex flex-col h-full space-y-4" style={{ background: 'var(--bg)' }}>
      {/* SECTION 1: EA Decision */}
      <div
        className="border rounded-lg p-4 space-y-4"
        style={{ borderColor: 'var(--border-color)', background: 'var(--surface-1)' }}
      >
        <h3 className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
          EA Decision
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
              EA Status <span className="text-destructive">*</span>
            </Label>
            <Select value={eaStatus} onValueChange={(value) => onChange('ea_status', value)}>
              <SelectTrigger className="mt-1 h-10 text-[13px]" style={fieldContainerStyle}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="z-[400] bg-popover border-border">
                {EA_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-3 w-3" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
              EA Reviewer <span className="text-destructive">*</span>
            </Label>
            <div className="mt-1">
              <UserPicker
                value={data.ea_reviewer || null}
                onChange={(value) => onChange('ea_reviewer', value as string | null)}
                placeholder="Select reviewer..."
                className="[&_button]:h-10"
              />
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
              Review Date <span className="text-destructive">*</span>
            </Label>
            <div className="mt-1">
              <CatalystDatePicker
                value={data.ea_review_date || null}
                onChange={(date) => onChange('ea_review_date', date ? format(date, 'yyyy-MM-dd') : null)}
                placeholder="Select date"
              />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
            EA Summary <span className="text-destructive">*</span>
          </Label>
          <Textarea
            value={data.ea_summary || ''}
            onChange={(e) => onChange('ea_summary', e.target.value)}
            placeholder="Enter EA review summary..."
            className="mt-1 min-h-[80px] text-[13px]"
            style={fieldContainerStyle}
          />
        </div>

        {requiresConstraints && (
          <div>
            <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
              Constraints / Conditions <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={data.ea_constraints || ''}
              onChange={(e) => onChange('ea_constraints', e.target.value)}
              placeholder="Enter constraints or conditions for approval..."
              className="mt-1 min-h-[60px] text-[13px]"
              style={fieldContainerStyle}
            />
          </div>
        )}
      </div>

      {/* SECTION 2: Architectural Alignment */}
      <div
        className="border rounded-lg p-4 space-y-4"
        style={{ borderColor: 'var(--border-color)', background: 'var(--surface-1)' }}
      >
        <h3 className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
          Architectural Alignment
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
              Arch Alignment
            </Label>
            <Select value={data.ea_arch_alignment || ''} onValueChange={(value) => onChange('ea_arch_alignment', value)}>
              <SelectTrigger className="mt-1 h-10 text-[13px]" style={fieldContainerStyle}>
                <SelectValue placeholder="Select alignment" />
              </SelectTrigger>
              <SelectContent className="z-[400] bg-popover border-border">
                {ARCH_ALIGNMENT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
              Primary Impact Area
            </Label>
            <Select
              value={data.ea_primary_impact_area || ''}
              onValueChange={(value) => onChange('ea_primary_impact_area', value)}
            >
              <SelectTrigger className="mt-1 h-10 text-[13px]" style={fieldContainerStyle}>
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent className="z-[400] bg-popover border-border">
                {IMPACT_AREA_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
            Business Capability Impact
          </Label>
          <Textarea
            value={data.ea_business_capability_impact || ''}
            onChange={(e) => onChange('ea_business_capability_impact', e.target.value)}
            placeholder="Describe the business capability impact..."
            className="mt-1 min-h-[60px] text-[13px]"
            style={fieldContainerStyle}
          />
        </div>
      </div>

      {/* SECTION 3: Risk & Complexity */}
      <div
        className="border rounded-lg p-4 space-y-4"
        style={{ borderColor: 'var(--border-color)', background: 'var(--surface-1)' }}
      >
        <h3 className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
          Risk & Complexity
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
              EA Complexity
            </Label>
            <Select value={data.ea_complexity || ''} onValueChange={(value) => onChange('ea_complexity', value)}>
              <SelectTrigger className="mt-1 h-10 text-[13px]" style={fieldContainerStyle}>
                <SelectValue placeholder="Select complexity" />
              </SelectTrigger>
              <SelectContent className="z-[400] bg-popover border-border">
                {COMPLEXITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
              EA Risk Level
            </Label>
            <Select value={data.ea_risk_level || ''} onValueChange={(value) => onChange('ea_risk_level', value)}>
              <SelectTrigger className="mt-1 h-10 text-[13px]" style={fieldContainerStyle}>
                <SelectValue placeholder="Select risk level" />
              </SelectTrigger>
              <SelectContent className="z-[400] bg-popover border-border">
                {RISK_LEVEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {requiresRiskNotes && (
          <div>
            <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
              Risk Notes <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={data.ea_risk_notes || ''}
              onChange={(e) => onChange('ea_risk_notes', e.target.value)}
              placeholder="Enter risk notes (required for High risk)..."
              className="mt-1 min-h-[60px] text-[13px]"
              style={fieldContainerStyle}
            />
          </div>
        )}
      </div>
    </div>
  );
}

