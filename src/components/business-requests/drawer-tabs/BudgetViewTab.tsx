import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Wallet, TrendingUp, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserPicker } from '@/components/ui/user-picker';
import { BusinessRequest } from '@/types/business-request';

// Budget Constants
const FUNDING_STATUS_OPTIONS = [
  'Not Budgeted',
  'Budget Requested',
  'Budget Approved',
  'Partially Budgeted',
  'Funded from Existing Contract',
];

const BUDGET_YEAR_OPTIONS = [
  'FY 2024',
  'FY 2025',
  'FY 2026',
  'FY 2027',
];

const BUDGET_TYPE_OPTIONS = ['CAPEX', 'OPEX'];

const CONTRACT_TYPE_OPTIONS = [
  'In-source',
  'Co-source',
  'Outsource',
];

const DELIVERY_MODEL_OPTIONS = [
  'Vendor Owns Build',
  'Vendor Build, Internal Support',
  'Internal Build, Vendor Advisory',
];


interface BudgetViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
}

// Helper to format currency
const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'SAR 0';
  return `SAR ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// PO Tags Input Component
function POTagsInput({ 
  value, 
  onChange 
}: { 
  value: string[] | null; 
  onChange: (value: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const tags = value || [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!tags.includes(inputValue.trim())) {
        onChange([...tags, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 border border-border rounded-md bg-background">
        {tags.map((tag, index) => (
          <Badge 
            key={index} 
            variant="secondary" 
            className="h-6 px-2 gap-1 bg-brand-primary/10 text-brand-primary border-brand-primary/20"
          >
            {tag}
            <button 
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:bg-brand-primary/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? "Type PO and press Enter..." : "Add more..."}
          className="flex-1 min-w-[120px] border-0 p-0 h-6 focus-visible:ring-0 text-sm"
        />
      </div>
    </div>
  );
}

// Budget Type Multi-Select Chips
function BudgetTypeChips({
  value,
  onChange,
}: {
  value: string[] | null;
  onChange: (value: string[]) => void;
}) {
  const selected = value || [];

  const toggleType = (type: string) => {
    if (selected.includes(type)) {
      onChange(selected.filter(t => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <div className="flex gap-2">
      {BUDGET_TYPE_OPTIONS.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => toggleType(type)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
            selected.includes(type)
              ? "bg-brand-primary text-white border-brand-primary"
              : "bg-background text-muted-foreground border-border hover:border-brand-primary/50"
          )}
        >
          {type}
        </button>
      ))}
    </div>
  );
}

export function BudgetViewTab({ data, onChange }: BudgetViewTabProps) {
  const [fundingOpen, setFundingOpen] = useState(true);
  const [contractOpen, setContractOpen] = useState(true);

  // Get computed values for summary cards
  const fundingStatus = data.funding_status || 'Not Budgeted';
  const approvedBudget = data.approved_budget_sar || 0;
  const budgetType = data.budget_type || [];

  // Get status color classes - using semantic tokens for dark mode support
  const getFundingStatusStyle = () => {
    if (fundingStatus === 'Budget Approved' || fundingStatus === 'Funded from Existing Contract') {
      return { background: 'var(--status-success-bg)', borderColor: 'var(--status-success-border, rgba(125, 163, 125, 0.3))' };
    }
    if (fundingStatus === 'Budget Requested' || fundingStatus === 'Partially Budgeted') {
      return { background: 'var(--status-warning-bg)', borderColor: 'var(--status-warning-border, rgba(212, 168, 85, 0.3))' };
    }
    return { background: 'var(--surface-1, hsl(var(--card)))', borderColor: 'var(--border-default, hsl(var(--border)))' };
  };


  return (
    <div className="flex flex-col h-full space-y-4" style={{ background: 'var(--surface-bg, hsl(var(--background)))' }}>
      {/* Intro Text */}
      <p className="text-sm text-muted-foreground">
        Manage budget allocation, contracts, and capacity planning for this demand.
      </p>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Funding Status Card */}
        <div className="rounded-lg border p-4" style={getFundingStatusStyle()}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-brand-primary" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-2, hsl(var(--muted-foreground)))' }}>Funding Status</span>
          </div>
          <p className="text-lg font-semibold" style={{ color: 'var(--text-1, hsl(var(--foreground)))' }}>{fundingStatus}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-2, hsl(var(--muted-foreground)))' }}>
            Type: {budgetType.length > 0 ? budgetType.join(' / ') : 'Not set'}
          </p>
        </div>

        {/* Approved Budget Card */}
        <div className="rounded-lg border p-4" style={{ background: 'var(--surface-1, hsl(var(--card)))', borderColor: 'var(--border-default, hsl(var(--border)))' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-brand-primary" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-2, hsl(var(--muted-foreground)))' }}>Approved Budget</span>
          </div>
          <p className="text-lg font-semibold" style={{ color: 'var(--text-1, hsl(var(--foreground)))' }}>{formatCurrency(approvedBudget)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-2, hsl(var(--muted-foreground)))' }}>
            Budget year: {data.budget_year || 'Not selected'}
          </p>
        </div>

      </div>

      {/* Section 1: Funding & Budget */}
      <Collapsible open={fundingOpen} onOpenChange={setFundingOpen}>
        <div className="border border-border rounded-xl overflow-hidden shadow-sm" style={{ background: 'var(--surface-1, hsl(var(--card)))' }}>
          <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
              Funding & Budget
            </h3>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              !fundingOpen && "-rotate-90"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Funding Status */}
                <div>
                  <Label className="text-xs font-medium">Funding Status</Label>
                  <Select
                    value={data.funding_status || ''}
                    onValueChange={(value) => onChange('funding_status', value)}
                  >
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {FUNDING_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Budget Year */}
                <div>
                  <Label className="text-xs font-medium">Budget Year</Label>
                  <Select
                    value={data.budget_year || ''}
                    onValueChange={(value) => onChange('budget_year', value)}
                  >
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUDGET_YEAR_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Budget Type */}
                <div className="md:col-span-2">
                  <Label className="text-xs font-medium">Budget Type</Label>
                  <div className="mt-2">
                    <BudgetTypeChips
                      value={data.budget_type}
                      onChange={(value) => onChange('budget_type', value)}
                    />
                  </div>
                </div>

                {/* Approved Budget */}
                <div>
                  <Label className="text-xs font-medium">Approved Budget (SAR)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={data.approved_budget_sar || ''}
                    onChange={(e) => onChange('approved_budget_sar', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    className="mt-1 h-9 text-sm"
                  />
                </div>

                {/* Current Year Budget */}
                <div>
                  <Label className="text-xs font-medium">Current Year Budget (SAR)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={data.current_year_budget_sar || ''}
                    onChange={(e) => onChange('current_year_budget_sar', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    className="mt-1 h-9 text-sm"
                  />
                </div>

                {/* Budget Owner */}
                <div>
                  <Label className="text-xs font-medium">Budget Owner</Label>
                  <Input
                    value={data.budget_owner_name || ''}
                    onChange={(e) => onChange('budget_owner_name', e.target.value)}
                    placeholder="Enter budget owner name"
                    className="mt-1 h-9 text-sm"
                  />
                </div>

                {/* Project Manager */}
                <div>
                  <Label className="text-xs font-medium">Project Manager</Label>
                  <div className="mt-1">
                    <UserPicker
                      value={data.project_manager_user_id || null}
                      onChange={(value) => onChange('project_manager_user_id', value as string | null)}
                      placeholder="Select project manager..."
                    />
                  </div>
                </div>

                {/* Planned External Spend */}
                <div>
                  <Label className="text-xs font-medium">Planned External Spend (SAR)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={data.planned_external_spend_sar || ''}
                    onChange={(e) => onChange('planned_external_spend_sar', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    className="mt-1 h-9 text-sm"
                  />
                </div>

                {/* Internal Effort Cost */}
                <div>
                  <Label className="text-xs font-medium">Internal Effort Cost Equivalent (SAR)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={data.internal_effort_cost_sar || ''}
                    onChange={(e) => onChange('internal_effort_cost_sar', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    className="mt-1 h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Section 2: Contract & Commercials */}
      <Collapsible open={contractOpen} onOpenChange={setContractOpen}>
        <div className="border border-border rounded-xl overflow-hidden shadow-sm" style={{ background: 'var(--surface-1, hsl(var(--card)))' }}>
          <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
              Contract & Commercials
            </h3>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              !contractOpen && "-rotate-90"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contract Type */}
                <div>
                  <Label className="text-xs font-medium">Contract Type</Label>
                  <Select
                    value={data.contract_type || ''}
                    onValueChange={(value) => onChange('contract_type', value)}
                  >
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Primary Vendor */}
                <div>
                  <Label className="text-xs font-medium">Primary Vendor</Label>
                  <Input
                    value={data.primary_vendor_name || ''}
                    onChange={(e) => onChange('primary_vendor_name', e.target.value)}
                    placeholder="Enter vendor name"
                    className="mt-1 h-9 text-sm"
                  />
                </div>

                {/* PO Numbers */}
                <div className="md:col-span-2">
                  <Label className="text-xs font-medium">PO Number(s)</Label>
                  <div className="mt-1">
                    <POTagsInput
                      value={data.po_numbers}
                      onChange={(value) => onChange('po_numbers', value)}
                    />
                  </div>
                </div>

                {/* Contract Start Date */}
                <div>
                  <Label className="text-xs font-medium">Contract Start Date</Label>
                  <div className="mt-1">
                    <CatalystDatePicker
                      value={data.contract_start_date || null}
                      onChange={(date) => onChange('contract_start_date', date ? format(date, 'yyyy-MM-dd') : null)}
                      placeholder="Pick a date"
                    />
                  </div>
                </div>

                {/* Contract End Date */}
                <div>
                  <Label className="text-xs font-medium">Contract End Date</Label>
                  <div className="mt-1">
                    <CatalystDatePicker
                      value={data.contract_end_date || null}
                      onChange={(date) => onChange('contract_end_date', date ? format(date, 'yyyy-MM-dd') : null)}
                      placeholder="Pick a date"
                    />
                  </div>
                  {/* Date validation */}
                  {data.contract_start_date && data.contract_end_date && 
                   new Date(data.contract_end_date) < new Date(data.contract_start_date) && (
                    <p className="text-xs text-destructive mt-1">
                      End date must be after start date.
                    </p>
                  )}
                </div>

                {/* Delivery Model */}
                <div className="md:col-span-2">
                  <Label className="text-xs font-medium">Delivery Model</Label>
                  <Select
                    value={data.delivery_model || ''}
                    onValueChange={(value) => onChange('delivery_model', value)}
                  >
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue placeholder="Select delivery model" />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERY_MODEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
