/**
 * EpicBudgetViewTab - Cloned from BudgetViewTab
 * 
 * Changes:
 * - REMOVED: Entire "Contract & Commercials" section
 * - Keep: Funding Status, Approved Budget, Capacity Status tiles
 * - Keep: Funding & Budget section
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Wallet, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserPicker } from '@/components/ui/user-picker';

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

const CAPACITY_STATUS_OPTIONS = [
  'Not Assessed',
  'Capacity Available',
  'Capacity Constrained',
  'Requires Additional Headcount / Vendor',
];

interface EpicBudgetViewTabProps {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

// Helper to format currency
const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'SAR 0';
  return `SAR ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export function EpicBudgetViewTab({ data, onChange }: EpicBudgetViewTabProps) {
  const [isFundingOpen, setIsFundingOpen] = useState(true);

  const budgetTypes = data.budget_type || [];
  const budgetTypeDisplay = budgetTypes.length > 0 ? budgetTypes.join(' / ') : 'Not set';

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm text-muted-foreground">
        Manage budget allocation and capacity planning for this epic.
      </p>

      {/* Summary Tiles - same as BusinessRequest but simpler */}
      <div className="grid grid-cols-3 gap-4">
        {/* Funding Status Tile */}
        <div className="border border-border rounded-lg p-4 bg-white">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Wallet className="h-3.5 w-3.5" />
            Funding Status
          </div>
          <div className="text-lg font-semibold">{data.funding_status || 'Not Budgeted'}</div>
          <div className="text-xs text-muted-foreground">Type: {budgetTypeDisplay}</div>
        </div>

        {/* Approved Budget Tile */}
        <div className="border border-border rounded-lg p-4 bg-white">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Approved Budget
          </div>
          <div className="text-lg font-semibold">{formatCurrency(data.approved_budget_sar)}</div>
          <div className="text-xs text-muted-foreground">
            Budget year: {data.budget_year || 'Not selected'}
          </div>
        </div>

        {/* Capacity Status Tile */}
        <div className="border border-border rounded-lg p-4 bg-white">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Users className="h-3.5 w-3.5" />
            Capacity Status
          </div>
          <div className="text-lg font-semibold">{data.capacity_status || 'Not Assessed'}</div>
          <div className="text-xs text-muted-foreground">
            {data.internal_effort_pct || 0}% Internal / {data.vendor_effort_pct || 0}% Vendor
          </div>
        </div>
      </div>

      {/* FUNDING & BUDGET Section */}
      <Collapsible open={isFundingOpen} onOpenChange={setIsFundingOpen}>
        <div className="border border-border rounded-xl bg-white shadow-sm">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">
              Funding & Budget
            </h3>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isFundingOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-5 pb-5 space-y-5">
              {/* Funding Status & Budget Year */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium">Funding Status</Label>
                  <Select 
                    value={data.funding_status || ''} 
                    onValueChange={(v) => onChange('funding_status', v)}
                  >
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="z-[400]">
                      {FUNDING_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">Budget Year</Label>
                  <Select 
                    value={data.budget_year || ''} 
                    onValueChange={(v) => onChange('budget_year', v)}
                  >
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent className="z-[400]">
                      {BUDGET_YEAR_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Budget Type */}
              <div>
                <Label className="text-xs font-medium">Budget Type</Label>
                <div className="flex gap-2 mt-1">
                  {BUDGET_TYPE_OPTIONS.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        const current = data.budget_type || [];
                        const newTypes = current.includes(type)
                          ? current.filter((t: string) => t !== type)
                          : [...current, type];
                        onChange('budget_type', newTypes);
                      }}
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-md border transition-colors",
                        (data.budget_type || []).includes(type)
                          ? "bg-brand-gold/10 border-brand-gold text-brand-gold"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Approved Budget & Current Year Budget */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium">Approved Budget (SAR)</Label>
                  <Input
                    type="number"
                    value={data.approved_budget_sar || ''}
                    onChange={(e) => onChange('approved_budget_sar', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Current Year Budget (SAR)</Label>
                  <Input
                    type="number"
                    value={data.current_year_budget_sar || ''}
                    onChange={(e) => onChange('current_year_budget_sar', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    className="mt-1 h-9"
                  />
                </div>
              </div>

              {/* Budget Owner & Project Manager */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium">Budget Owner</Label>
                  <Input
                    value={data.budget_owner_name || ''}
                    onChange={(e) => onChange('budget_owner_name', e.target.value)}
                    placeholder="Enter budget owner name"
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Project Manager</Label>
                  <div className="mt-1">
                    <UserPicker
                      value={data.project_manager_user_id || null}
                      onChange={(v) => onChange('project_manager_user_id', v)}
                      placeholder="Select project manager..."
                    />
                  </div>
                </div>
              </div>

              {/* Planned External Spend & Internal Effort Cost */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium">Planned External Spend (SAR)</Label>
                  <Input
                    type="number"
                    value={data.planned_external_spend_sar || ''}
                    onChange={(e) => onChange('planned_external_spend_sar', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Internal Effort Cost Equivalent (SAR)</Label>
                  <Input
                    type="number"
                    value={data.internal_effort_cost_sar || ''}
                    onChange={(e) => onChange('internal_effort_cost_sar', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    className="mt-1 h-9"
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* NOTE: Contract & Commercials section is REMOVED for Epic */}
    </div>
  );
}
