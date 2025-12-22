/**
 * DemandDetailsViewTab - Catalyst Design System
 * Simple DETAILS card with Summary and Description as shown in design
 */

import { useState, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '../RichTextEditor';
import { BusinessRequest } from '@/types/business-request';

interface DemandDetailsViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
}

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
          "px-5 py-3.5 flex items-center justify-between",
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
        <div className="p-5 space-y-5">
          {children}
        </div>
      )}
    </section>
  );
}

// Catalyst Field Component
function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[13px] font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export function DemandDetailsViewTab({ data, onChange }: DemandDetailsViewTabProps) {
  return (
    <div className="space-y-4">
      {/* DETAILS CARD - Primary card as shown in design */}
      <FormCard title="Details">
        <Field label="Summary" required>
          <Input
            value={data.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Enter demand summary"
            className="h-10 text-[14px]"
          />
        </Field>

        <Field label="Description">
          <RichTextEditor
            value={data.description || ''}
            onChange={(value) => onChange('description', value)}
            placeholder="Enter detailed description..."
          />
        </Field>
      </FormCard>
    </div>
  );
}
