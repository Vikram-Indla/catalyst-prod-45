import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BusinessRequest } from '@/types/business-request';

const FUNDING_STATUS_OPTIONS = ['Not Started', 'In Progress', 'Approved', 'Rejected'];
const BUDGET_YEAR_OPTIONS = ['2024', '2025', '2026', '2027'];
const CONTRACT_TYPE_OPTIONS = ['Fixed Price', 'Time & Materials', 'Retainer', 'Staff Augmentation'];
const DELIVERY_MODEL_OPTIONS = ['Onshore', 'Offshore', 'Hybrid', 'Remote'];
const CAPACITY_STATUS_OPTIONS = ['Available', 'Constrained', 'At Risk', 'Blocked'];

interface BudgetViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function BudgetViewTab({ data, onChange, onDirtyChange }: BudgetViewTabProps) {
  const handleChange = (field: string, value: any) => {
    onChange(field, value);
    onDirtyChange?.(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Funding & Budget Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Funding & Budget</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Funding Status</Label>
            <Select value={data.funding_status || ''} onValueChange={(v) => handleChange('funding_status', v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {FUNDING_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Budget Year</Label>
            <Select value={data.budget_year || ''} onValueChange={(v) => handleChange('budget_year', v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Approved Budget (SAR)</Label>
            <Input
              type="number"
              value={data.approved_budget_sar || ''}
              onChange={(e) => handleChange('approved_budget_sar', parseFloat(e.target.value) || null)}
              placeholder="0.00"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Current Year Budget (SAR)</Label>
            <Input
              type="number"
              value={data.current_year_budget_sar || ''}
              onChange={(e) => handleChange('current_year_budget_sar', parseFloat(e.target.value) || null)}
              placeholder="0.00"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Budget Owner</Label>
            <Input
              value={data.budget_owner_name || ''}
              onChange={(e) => handleChange('budget_owner_name', e.target.value)}
              placeholder="Budget owner name"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Planned External Spend (SAR)</Label>
            <Input
              type="number"
              value={data.planned_external_spend_sar || ''}
              onChange={(e) => handleChange('planned_external_spend_sar', parseFloat(e.target.value) || null)}
              placeholder="0.00"
              className="bg-background"
            />
          </div>
        </div>
      </div>

      {/* Contract & Commercials Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contract & Commercials</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Contract Type</Label>
            <Select value={data.contract_type || ''} onValueChange={(v) => handleChange('contract_type', v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Primary Vendor</Label>
            <Input
              value={data.primary_vendor_name || ''}
              onChange={(e) => handleChange('primary_vendor_name', e.target.value)}
              placeholder="Vendor name"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Delivery Model</Label>
            <Select value={data.delivery_model || ''} onValueChange={(v) => handleChange('delivery_model', v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_MODEL_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Capacity Status</Label>
            <Select value={data.capacity_status || ''} onValueChange={(v) => handleChange('capacity_status', v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {CAPACITY_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Capacity & Risks Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Capacity & Risks</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Internal Effort %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={data.internal_effort_pct || ''}
              onChange={(e) => handleChange('internal_effort_pct', parseInt(e.target.value) || null)}
              placeholder="0"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Vendor Effort %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={data.vendor_effort_pct || ''}
              onChange={(e) => handleChange('vendor_effort_pct', parseInt(e.target.value) || null)}
              placeholder="0"
              className="bg-background"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Funding Assumptions</Label>
          <Textarea
            value={data.funding_assumptions || ''}
            onChange={(e) => handleChange('funding_assumptions', e.target.value)}
            placeholder="Document funding assumptions..."
            rows={3}
            className="bg-background resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Capacity Risks</Label>
          <Textarea
            value={data.capacity_risks || ''}
            onChange={(e) => handleChange('capacity_risks', e.target.value)}
            placeholder="Document capacity risks..."
            rows={3}
            className="bg-background resize-none"
          />
        </div>
      </div>
    </div>
  );
}
