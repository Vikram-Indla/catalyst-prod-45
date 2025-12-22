/**
 * DemandDetailsViewTab - Catalyst Design System
 * Executive-grade form cards with olive accents
 * Enhanced with Organization, Planning & Delivery sections
 */

import { useState, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '../RichTextEditor';
import { BusinessRequest } from '@/types/business-request';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { UserPicker } from '@/components/ui/user-picker';
import { format } from 'date-fns';

interface DemandDetailsViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
}

// Constants for select options
const DEPARTMENT_OPTIONS = [
  'Technology',
  'Finance',
  'Operations',
  'Human Resources',
  'Marketing',
  'Sales',
  'Legal',
  'Compliance',
  'Strategy',
];

const DELIVERY_PLATFORM_OPTIONS = [
  'Core Banking',
  'Mobile Banking',
  'Web Portal',
  'Enterprise Platform',
  'Integration Layer',
  'Analytics Platform',
];

const DELIVERY_TRACK_OPTIONS = [
  'Digital Transformation',
  'Core Modernization',
  'Customer Experience',
  'Operational Excellence',
  'Regulatory Compliance',
];

const PLANNED_QUARTER_OPTIONS = [
  'Q1 2025',
  'Q2 2025',
  'Q3 2025',
  'Q4 2025',
  'Q1 2026',
  'Q2 2026',
];

// Catalyst Form Card Component
function FormCard({ 
  title, 
  children, 
  collapsible = false,
  defaultExpanded = true 
}: { 
  title: string; 
  children: ReactNode; 
  collapsible?: boolean;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section 
      className="rounded-lg overflow-hidden"
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <header 
        className={cn(
          "px-4 py-3 flex items-center justify-between",
          collapsible && "cursor-pointer hover:bg-muted/50"
        )}
        style={{
          background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--muted)/0.3) 100%)',
          borderBottom: expanded ? '1px solid hsl(var(--border)/0.5)' : 'none',
        }}
        onClick={collapsible ? () => setExpanded(!expanded) : undefined}
      >
        <h2 
          className="text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground"
        >
          {title}
        </h2>
        {collapsible && (
          <button 
            className="p-1 rounded hover:bg-muted"
          >
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", !expanded && "-rotate-90")} />
          </button>
        )}
      </header>
      {expanded && (
        <div className="p-4 space-y-4">
          {children}
        </div>
      )}
    </section>
  );
}

// Catalyst Field Component
function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function DemandDetailsViewTab({ data, onChange }: DemandDetailsViewTabProps) {
  return (
    <div className="space-y-4">

      {/* ═══════════════════════════════════════════════════════════
          DETAILS CARD
          ═══════════════════════════════════════════════════════════ */}
      <FormCard title="Details">
        <Field label="Summary" required>
          <Input
            value={data.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Enter demand summary"
            className="h-9 text-[14px]"
          />
        </Field>

        <Field label="Description">
          <RichTextEditor
            value={data.description || ''}
            onChange={(value) => onChange('description', value)}
            placeholder="Enter detailed description..."
          />
        </Field>

        <Field label="Acceptance Criteria">
          <RichTextEditor
            value={data.acceptance_criteria || ''}
            onChange={(value) => onChange('acceptance_criteria', value)}
            placeholder="Define acceptance criteria..."
          />
        </Field>

        <Field label="Dependencies">
          <RichTextEditor
            value={data.dependencies || ''}
            onChange={(value) => onChange('dependencies', value)}
            placeholder="List any dependencies..."
          />
        </Field>
      </FormCard>

      {/* ═══════════════════════════════════════════════════════════
          ORGANIZATION CARD
          ═══════════════════════════════════════════════════════════ */}
      <FormCard title="Organization" collapsible defaultExpanded={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Department">
            <Select
              value={data.department || ''}
              onValueChange={(value) => onChange('department', value)}
            >
              <SelectTrigger className="h-9 text-[14px]">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Business Owner">
            <UserPicker
              value={data.business_owner_id || null}
              onChange={(value) => onChange('business_owner_id', value)}
              placeholder="Select business owner..."
            />
          </Field>

          <Field label="Requestor">
            <UserPicker
              value={data.requestor || null}
              onChange={(value) => onChange('requestor', value)}
              placeholder="Select requestor..."
            />
          </Field>

          <Field label="Assignee">
            <UserPicker
              value={data.assignee || null}
              onChange={(value) => onChange('assignee', value)}
              placeholder="Select assignee..."
            />
          </Field>
        </div>
      </FormCard>

      {/* ═══════════════════════════════════════════════════════════
          PLANNING & DELIVERY CARD
          ═══════════════════════════════════════════════════════════ */}
      <FormCard title="Planning & Delivery" collapsible defaultExpanded={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Delivery Platform">
            <Select
              value={data.delivery_platform || ''}
              onValueChange={(value) => onChange('delivery_platform', value)}
            >
              <SelectTrigger className="h-9 text-[14px]">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_PLATFORM_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Delivery Track">
            <Select
              value={data.delivery_track || ''}
              onValueChange={(value) => onChange('delivery_track', value)}
            >
              <SelectTrigger className="h-9 text-[14px]">
                <SelectValue placeholder="Select track" />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_TRACK_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Planned Quarter">
            <Select
              value={Array.isArray(data.planned_quarter) ? data.planned_quarter[0] : data.planned_quarter || ''}
              onValueChange={(value) => onChange('planned_quarter', [value])}
            >
              <SelectTrigger className="h-9 text-[14px]">
                <SelectValue placeholder="Select quarter" />
              </SelectTrigger>
              <SelectContent>
                {PLANNED_QUARTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FormCard>

      {/* ═══════════════════════════════════════════════════════════
          DATES CARD
          ═══════════════════════════════════════════════════════════ */}
      <FormCard title="Key Dates" collapsible defaultExpanded={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Start Date">
            <CatalystDatePicker
              value={data.start_date || null}
              onChange={(date) => onChange('start_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="Select start date"
            />
          </Field>

          <Field label="End Date">
            <CatalystDatePicker
              value={data.end_date || null}
              onChange={(date) => onChange('end_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="Select end date"
            />
          </Field>

          <Field label="Implementation Start Date">
            <CatalystDatePicker
              value={data.impl_start_date || null}
              onChange={(date) => onChange('impl_start_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="Select implementation start"
            />
          </Field>

          <Field label="Target Completion Date">
            <CatalystDatePicker
              value={data.impl_target_end_date || null}
              onChange={(date) => onChange('impl_target_end_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="Select target completion"
            />
          </Field>
        </div>

        {/* Date validation */}
        {data.start_date && data.end_date && 
         new Date(data.end_date) < new Date(data.start_date) && (
          <p className="text-xs text-destructive mt-1">
            End date must be after start date.
          </p>
        )}
      </FormCard>
    </div>
  );
}
