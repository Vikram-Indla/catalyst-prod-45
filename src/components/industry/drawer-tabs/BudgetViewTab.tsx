import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Wallet, TrendingUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserPicker } from '@/components/ui/user-picker';
import { BusinessRequest } from '@/types/business-request';

// Constants
const FUNDING_STATUS_OPTIONS = ['Not Started', 'In Progress', 'Approved', 'Rejected'];
const BUDGET_YEAR_OPTIONS = ['2024', '2025', '2026', '2027'];
const BUDGET_TYPE_OPTIONS = ['CAPEX', 'OPEX'];
const CONTRACT_TYPE_OPTIONS = ['Fixed Price', 'Time & Materials', 'Retainer', 'Staff Augmentation'];
const DELIVERY_MODEL_OPTIONS = ['Onshore', 'Offshore', 'Hybrid', 'Remote'];
const CAPACITY_STATUS_OPTIONS = ['Available', 'Constrained', 'At Risk', 'Blocked'];

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

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined || isNaN(num)) return '';
    return new Intl.NumberFormat('en-SA').format(num);
  };

  const parseNumber = (str: string): number | null => {
    const cleaned = str.replace(/,/g, '').trim();
    if (!cleaned) return null;
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

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
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Input
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="bg-white dark:bg-gray-900 pr-14"
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
    <div className="space-y-2">
      <Label className="text-sm font-medium">Budget Type</Label>
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
                ? "bg-[#c69c6d] text-white shadow-sm"
                : "bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            )}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );
}

// PO Tags Input
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
      <Label className="text-sm font-medium">PO Number(s)</Label>
      <div className={cn(
        "flex flex-wrap gap-2 p-2 min-h-[42px] border rounded-lg transition-colors",
        "bg-white dark:bg-gray-900",
        "border-gray-200 dark:border-gray-700",
        "focus-within:border-[#c69c6d] focus-within:ring-1 focus-within:ring-[#c69c6d]/20"
      )}>
        {tags.map((tag, index) => (
          <Badge 
            key={index}
            variant="secondary"
            className="h-6 gap-1 pr-1 bg-[#c69c6d]/10 text-[#8b7355] dark:bg-[#c69c6d]/20 dark:text-[#d4b896] border-[#c69c6d]/20"
          >
            {tag}
            <button 
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:bg-[#c69c6d]/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? "Type PO and press Enter..." : "Add more..."}
          className="flex-1 min-w-[120px] border-0 p-0 h-6 focus-visible:ring-0 text-sm bg-transparent placeholder:text-gray-400"
        />
      </div>
    </div>
  );
}

// Section with collapsible
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
      <div className="py-2">
        <CollapsibleTrigger className="w-full flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#5c7c5c] dark:text-[#7da37d]">
            {title}
          </h3>
          <ChevronDown className={cn(
            "w-4 h-4 text-gray-400 transition-transform",
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

export function BudgetViewTab({ data, onChange, onDirtyChange }: BudgetViewTabProps) {
  const handleChange = (field: string, value: any) => {
    onChange(field, value);
    onDirtyChange?.(true);
  };

  return (
    <div className="p-4 md:p-5 pb-6 space-y-4">
      {/* Funding & Budget Section */}
      <FormSection title="Funding & Budget">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Funding Status</Label>
            <Select value={data.funding_status || ''} onValueChange={(v) => handleChange('funding_status', v)}>
              <SelectTrigger className="bg-white dark:bg-gray-900">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 z-[400]">
                {FUNDING_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Budget Year</Label>
            <Select value={data.budget_year || ''} onValueChange={(v) => handleChange('budget_year', v)}>
              <SelectTrigger className="bg-white dark:bg-gray-900">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 z-[400]">
                {BUDGET_YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
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

          <CurrencyInput
            label="Approved Budget (SAR)"
            value={data.approved_budget_sar}
            onChange={(value) => handleChange('approved_budget_sar', value)}
          />

          <CurrencyInput
            label="Current Year Budget (SAR)"
            value={data.current_year_budget_sar}
            onChange={(value) => handleChange('current_year_budget_sar', value)}
          />

          <div className="space-y-2">
            <Label className="text-sm font-medium">Budget Owner</Label>
            <UserPicker
              value={data.budget_owner_user_id || null}
              onChange={(value) => handleChange('budget_owner_user_id', value as string | null)}
              placeholder="Select budget owner..."
            />
          </div>

          <CurrencyInput
            label="Planned External Spend (SAR)"
            value={data.planned_external_spend_sar}
            onChange={(value) => handleChange('planned_external_spend_sar', value)}
          />
        </div>
      </FormSection>

      {/* Contract & Commercials Section */}
      <FormSection title="Contract & Commercials">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Contract Type</Label>
            <Select value={data.contract_type || ''} onValueChange={(v) => handleChange('contract_type', v)}>
              <SelectTrigger className="bg-white dark:bg-gray-900">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 z-[400]">
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
              className="bg-white dark:bg-gray-900"
            />
          </div>

          {/* PO Numbers - Full width */}
          <div className="md:col-span-2">
            <POTagsInput
              value={data.po_numbers}
              onChange={(value) => handleChange('po_numbers', value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Delivery Model</Label>
            <Select value={data.delivery_model || ''} onValueChange={(v) => handleChange('delivery_model', v)}>
              <SelectTrigger className="bg-white dark:bg-gray-900">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 z-[400]">
                {DELIVERY_MODEL_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Capacity Status</Label>
            <Select value={data.capacity_status || ''} onValueChange={(v) => handleChange('capacity_status', v)}>
              <SelectTrigger className="bg-white dark:bg-gray-900">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 z-[400]">
                {CAPACITY_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormSection>

      {/* Capacity & Risks Section */}
      <FormSection title="Capacity & Risks">
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
              className="bg-white dark:bg-gray-900"
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
              className="bg-white dark:bg-gray-900"
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
            className="bg-white dark:bg-gray-900 resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Capacity Risks</Label>
          <Textarea
            value={data.capacity_risks || ''}
            onChange={(e) => handleChange('capacity_risks', e.target.value)}
            placeholder="Document capacity risks..."
            rows={3}
            className="bg-white dark:bg-gray-900 resize-none"
          />
        </div>
      </FormSection>
    </div>
  );
}
