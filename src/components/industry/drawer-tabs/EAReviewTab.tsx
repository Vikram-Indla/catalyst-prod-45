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

  return (
    <div className="p-4 md:p-5 pb-6 space-y-4" style={{ background: 'var(--bg)' }}>
      {/* SECTION 1: EA Decision */}
      <div className="border rounded-lg p-4 space-y-4" style={{ borderColor: 'var(--border-color)', background: 'var(--surface-1)' }}>
        <h3 className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
          EA Decision
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
              EA Status <span className="text-destructive">*</span>
            </Label>
            <Select
              value={eaStatus}
              onValueChange={(value) => onChange('ea_status', value)}
            >
              <SelectTrigger className="mt-1 h-8 text-[13px]" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="z-[400]" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)' }}>
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
            style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
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
              style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
            />
          </div>
        )}
      </div>

      {/* SECTION 2: Architectural Alignment */}
      <div className="border rounded-lg p-4 space-y-4" style={{ borderColor: 'var(--border-color)', background: 'var(--surface-1)' }}>
        <h3 className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
          Architectural Alignment
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
              Arch Alignment
            </Label>
            <Select
              value={data.ea_arch_alignment || ''}
              onValueChange={(value) => onChange('ea_arch_alignment', value)}
            >
              <SelectTrigger className="mt-1 h-8 text-[13px]" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
                <SelectValue placeholder="Select alignment" />
              </SelectTrigger>
              <SelectContent className="z-[400]" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)' }}>
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
              <SelectTrigger className="mt-1 h-8 text-[13px]" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent className="z-[400]" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)' }}>
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
            style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
          />
        </div>
      </div>

      {/* SECTION 3: Risk & Complexity */}
      <div className="border rounded-lg p-4 space-y-4" style={{ borderColor: 'var(--border-color)', background: 'var(--surface-1)' }}>
        <h3 className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
          Risk & Complexity
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
              EA Complexity
            </Label>
            <Select
              value={data.ea_complexity || ''}
              onValueChange={(value) => onChange('ea_complexity', value)}
            >
              <SelectTrigger className="mt-1 h-8 text-[13px]" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
                <SelectValue placeholder="Select complexity" />
              </SelectTrigger>
              <SelectContent className="z-[400]" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)' }}>
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
            <Select
              value={data.ea_risk_level || ''}
              onValueChange={(value) => onChange('ea_risk_level', value)}
            >
              <SelectTrigger className="mt-1 h-8 text-[13px]" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
                <SelectValue placeholder="Select risk level" />
              </SelectTrigger>
              <SelectContent className="z-[400]" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)' }}>
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
              style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
            />
          </div>
        )}
      </div>

      {/* SECTION 4: Delivery Strategy (RFP-GATED) */}
      <div 
        className="border rounded-lg p-4 space-y-4" 
        style={{ 
          borderColor: isRfpApproved ? 'var(--border-color)' : 'var(--border-color)', 
          background: isRfpApproved ? 'var(--surface-1)' : 'var(--surface-2)',
          opacity: isRfpApproved ? 1 : 0.6
        }}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
            Delivery Strategy
          </h3>
          {!isRfpApproved && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px]" style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>
              <Lock className="h-3 w-3" />
              RFP Approval Required
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
              Delivery Model
            </Label>
            <Select
              value={data.ea_delivery_model || ''}
              onValueChange={(value) => onChange('ea_delivery_model', value)}
              disabled={!isRfpApproved}
            >
              <SelectTrigger className="mt-1 h-8 text-[13px]" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent className="z-[400]" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)' }}>
                {DELIVERY_MODEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isOutsourced && (
            <div>
              <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
                Vendor Dependency Risk <span className="text-destructive">*</span>
              </Label>
              <Select
                value={data.ea_vendor_dependency_risk || ''}
                onValueChange={(value) => onChange('ea_vendor_dependency_risk', value)}
                disabled={!isRfpApproved}
              >
                <SelectTrigger className="mt-1 h-8 text-[13px]" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
                  <SelectValue placeholder="Select risk" />
                </SelectTrigger>
                <SelectContent className="z-[400]" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)' }}>
                  {VENDOR_RISK_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div>
          <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
            Delivery Rationale <span className="text-destructive">*</span>
          </Label>
          <Textarea
            value={data.ea_delivery_rationale || ''}
            onChange={(e) => onChange('ea_delivery_rationale', e.target.value)}
            placeholder="Enter delivery rationale..."
            className="mt-1 min-h-[60px] text-[13px]"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
            disabled={!isRfpApproved}
          />
        </div>
      </div>
    </div>
  );
}
