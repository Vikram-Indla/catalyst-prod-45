import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BusinessRequest, RISK_RATING_OPTIONS, PORTFOLIO_DECISION_OPTIONS } from '@/types/business-request';

interface EstimationTabProps {
  data: Partial<BusinessRequest>;
  isEditMode: boolean;
  onChange: (field: keyof BusinessRequest, value: any) => void;
}

export function EstimationTab({ data, isEditMode, onChange }: EstimationTabProps) {
  return (
    <div className="space-y-4">
      {/* Estimation Notes */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">
          Estimation Notes {isEditMode && <span className="text-red-500">*</span>}
        </label>
        <Textarea
          value={data.estimation_notes || ''}
          onChange={(e) => onChange('estimation_notes', e.target.value)}
          disabled={!isEditMode}
          placeholder="Add estimation notes..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] min-h-[100px]"
        />
      </div>

      {/* Dependencies */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Dependencies</label>
        <Textarea
          value={data.estimation_dependencies || ''}
          onChange={(e) => onChange('estimation_dependencies', e.target.value)}
          disabled={!isEditMode}
          placeholder="List estimation dependencies..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] min-h-[80px]"
        />
      </div>

      {/* Risk Rating & Estimated Cost */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Risk Rating</label>
          <Select
            value={data.estimation_risk_rating || ''}
            onValueChange={(value) => onChange('estimation_risk_rating', value)}
            disabled={!isEditMode}
          >
            <SelectTrigger className="border-[#e5e5e5] disabled:bg-[#f9fafb]">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {RISK_RATING_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">
            Estimated Cost (SAR) {isEditMode && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] text-sm">SAR</span>
            <Input
              type="number"
              value={data.estimated_cost_sar || ''}
              onChange={(e) => onChange('estimated_cost_sar', e.target.value ? parseFloat(e.target.value) : null)}
              disabled={!isEditMode}
              placeholder="0.00"
              className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] pl-12"
            />
          </div>
        </div>
      </div>

      {/* Approval Inputs */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Approval Inputs</label>
        <Textarea
          value={data.approval_inputs || ''}
          onChange={(e) => onChange('approval_inputs', e.target.value)}
          disabled={!isEditMode}
          placeholder="Add approval inputs..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] min-h-[80px]"
        />
      </div>

      {/* Portfolio Decision */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Portfolio Decision</label>
        <Select
          value={data.portfolio_decision || ''}
          onValueChange={(value) => onChange('portfolio_decision', value)}
          disabled={!isEditMode}
        >
          <SelectTrigger className="border-[#e5e5e5] disabled:bg-[#f9fafb]">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {PORTFOLIO_DECISION_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
