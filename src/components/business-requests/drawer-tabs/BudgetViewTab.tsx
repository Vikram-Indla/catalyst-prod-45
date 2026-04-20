import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Wallet, TrendingUp, X, Calendar } from 'lucide-react';
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
  onDirtyChange?: (isDirty: boolean) => void;
}

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

// Currency Input with formatting
function CurrencyInput({
  label,
  value,
  onChange,
  currency = 'SAR',
  placeholder = '0',
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  currency?: string;
  placeholder?: string;
}) {
  const [displayValue, setDisplayValue] = useState('');

  // Format number with commas
  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined || isNaN(num)) return '';
    return new Intl.NumberFormat('en-SA').format(num);
  };

  // Parse formatted string back to number
  const parseNumber = (str: string): number | null => {
    const cleaned = str.replace(/,/g, '').trim();
    if (!cleaned) return null;
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  // Update display when value prop changes
  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setDisplayValue(raw ? formatNumber(parseNumber(raw)) : '');
  };

  const handleBlur = () => {
    const num = parseNumber(displayValue);
    onChange(num);
    setDisplayValue(formatNumber(num));
  };

  return (
    <div>
      <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{label}</Label>
      <div className="relative">
        <Input
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            "h-9 text-sm pr-14",
            "bg-background",
            "border-input",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-ring"
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400 dark:text-gray-500">
          {currency}
        </span>
      </div>
    </div>
  );
}

// Budget Type Toggle with clear selected state
function BudgetTypeSelector({
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
    <div>
      <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Budget Type</Label>
      <div className={cn(
        "inline-flex rounded-lg border p-1",
        "border-gray-200 dark:border-gray-700",
        "bg-gray-50 dark:bg-gray-800/50"
      )}>
        {BUDGET_TYPE_OPTIONS.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => toggleType(type)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all",
              selected.includes(type)
                ? "bg-accent text-accent-foreground shadow-sm"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );
}

// PO Tags Input with consistent styling
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
    <div>
      <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">PO Number(s)</Label>
      <div className={cn(
        "flex flex-wrap gap-2 p-2 min-h-[42px] border rounded-lg transition-colors",
        "bg-background",
        "border-input",
        "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20"
      )}>
        {tags.map((tag, index) => (
          <span 
            key={index}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium",
              "bg-accent/10 text-[var(--secondary-bronze)]",
              "dark:bg-accent/20 dark:text-[var(--secondary-champagne)]"
            )}
          >
            {tag}
            <button 
              type="button"
              onClick={() => removeTag(tag)}
              className="text-muted-foreground hover:text-accent"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? "Type PO and press Enter..." : "Add more..."}
          className={cn(
            "flex-1 min-w-[150px] border-0 p-1 text-sm focus:ring-0 focus:outline-none bg-transparent",
            "placeholder:text-gray-400 dark:placeholder:text-gray-500",
            "text-gray-900 dark:text-gray-100"
          )}
        />
      </div>
    </div>
  );
}

// Section Header with subtle divider styling
function FormSection({ 
  title, 
  children, 
  defaultOpen = true 
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="py-3">
        <CollapsibleTrigger className="w-full flex items-center justify-between pb-3 border-b border-border">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--secondary-green)]">
            {title}
          </h3>
          <ChevronDown className={cn(
            "w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform",
            !isOpen && "-rotate-90"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-4 space-y-4">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Helper to format currency for display
const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'SAR 0';
  return `SAR ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BudgetViewTab({ data, onChange, onDirtyChange }: BudgetViewTabProps) {
  const handleChange = (field: string, value: any) => {
    onChange(field, value);
    onDirtyChange?.(true);
  };

  // Get computed values for summary cards
  const fundingStatus = data.funding_status || 'Not Budgeted';
  const approvedBudget = data.approved_budget_sar || 0;
  const budgetType = data.budget_type || [];

  // Get status color classes
  const getFundingStatusStyle = () => {
    if (fundingStatus === 'Budget Approved' || fundingStatus === 'Funded from Existing Contract') {
      return 'bg-primary/10 border-primary/20';
    }
    if (fundingStatus === 'Budget Requested' || fundingStatus === 'Partially Budgeted') {
      return 'bg-accent/10 border-accent/20';
    }
    return 'bg-card border-border';
  };

  return (
    <div className="space-y-4">
      {/* Intro Text */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Manage budget allocation, contracts, and capacity planning for this demand.
      </p>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Funding Status Card */}
        <div className={cn("rounded-lg border p-4", getFundingStatusStyle())}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-accent" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Funding Status</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{fundingStatus}</p>
          <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
            Type: {budgetType.length > 0 ? budgetType.join(' / ') : 'Not set'}
          </p>
        </div>

        {/* Approved Budget Card */}
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Approved Budget</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(approvedBudget)}</p>
          <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
            Budget year: {data.budget_year || 'Not selected'}
          </p>
        </div>
      </div>

      {/* Section 1: Funding & Budget */}
      <FormSection title="Funding & Budget">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Funding Status */}
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Funding Status</Label>
            <Select
              value={data.funding_status || ''}
              onValueChange={(value) => handleChange('funding_status', value)}
            >
              <SelectTrigger className="h-9 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 z-[400]">
                {FUNDING_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget Year */}
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Budget Year</Label>
            <Select
              value={data.budget_year || ''}
              onValueChange={(value) => handleChange('budget_year', value)}
            >
              <SelectTrigger className="h-9 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 z-[400]">
                {BUDGET_YEAR_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget Type - Full width */}
          <div className="md:col-span-2">
            <BudgetTypeSelector
              value={data.budget_type}
              onChange={(value) => handleChange('budget_type', value)}
            />
          </div>

          {/* Approved Budget (SAR) - with formatting */}
          <CurrencyInput
            label="Approved Budget (SAR)"
            value={data.approved_budget_sar}
            onChange={(value) => handleChange('approved_budget_sar', value)}
          />

          {/* Current Year Budget (SAR) - with formatting */}
          <CurrencyInput
            label="Current Year Budget (SAR)"
            value={data.current_year_budget_sar}
            onChange={(value) => handleChange('current_year_budget_sar', value)}
          />

          {/* Budget Owner - Now uses UserPicker like Project Manager */}
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Budget Owner</Label>
            <UserPicker
              value={data.budget_owner_user_id || null}
              onChange={(value) => handleChange('budget_owner_user_id', value as string | null)}
              placeholder="Select budget owner..."
            />
          </div>

          {/* Project Manager */}
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Project Manager</Label>
            <UserPicker
              value={data.project_manager_user_id || null}
              onChange={(value) => handleChange('project_manager_user_id', value as string | null)}
              placeholder="Select project manager..."
            />
          </div>

          {/* Planned External Spend (SAR) - with formatting */}
          <CurrencyInput
            label="Planned External Spend (SAR)"
            value={data.planned_external_spend_sar}
            onChange={(value) => handleChange('planned_external_spend_sar', value)}
          />

          {/* Internal Effort Cost (SAR) - with formatting */}
          <CurrencyInput
            label="Internal Effort Cost Equivalent (SAR)"
            value={data.internal_effort_cost_sar}
            onChange={(value) => handleChange('internal_effort_cost_sar', value)}
          />
        </div>
      </FormSection>

      {/* Section 2: Contract & Commercials */}
      <FormSection title="Contract & Commercials">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contract Type */}
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Contract Type</Label>
            <Select
              value={data.contract_type || ''}
              onValueChange={(value) => handleChange('contract_type', value)}
            >
              <SelectTrigger className="h-9 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 z-[400]">
                {CONTRACT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Primary Vendor */}
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Primary Vendor</Label>
            <Input
              value={data.primary_vendor_name || ''}
              onChange={(e) => handleChange('primary_vendor_name', e.target.value)}
              placeholder="Enter vendor name"
              className="h-9 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
            />
          </div>

          {/* PO Numbers - Full width */}
          <div className="md:col-span-2">
            <POTagsInput
              value={data.po_numbers}
              onChange={(value) => handleChange('po_numbers', value)}
            />
          </div>

          {/* Contract Start Date - with lighter icon */}
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Contract Start Date</Label>
            <CatalystDatePicker
              value={data.contract_start_date || null}
              onChange={(date) => handleChange('contract_start_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="Select date"
            />
          </div>

          {/* Contract End Date - with lighter icon */}
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Contract End Date</Label>
            <CatalystDatePicker
              value={data.contract_end_date || null}
              onChange={(date) => handleChange('contract_end_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="Select date"
            />
            {/* Date validation */}
            {data.contract_start_date && data.contract_end_date && 
             new Date(data.contract_end_date) < new Date(data.contract_start_date) && (
              <p className="text-xs text-destructive mt-1">
                End date must be after start date.
              </p>
            )}
          </div>

          {/* Delivery Model - Full width */}
          <div className="md:col-span-2">
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Delivery Model</Label>
            <Select
              value={data.delivery_model || ''}
              onValueChange={(value) => handleChange('delivery_model', value)}
            >
              <SelectTrigger className="h-9 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 z-[400]">
                {DELIVERY_MODEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormSection>
    </div>
  );
}
