/**
 * DemandDetailsViewTab - Catalyst Design System
 * Enterprise-grade details card with Summary and Description
 * Description uses flex layout to fill remaining vertical space
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

// Catalyst Form Card Component - with flex support for full-height content
function FormCard({ 
  title, 
  children, 
  collapsible = false,
  defaultExpanded = true,
  flexGrow = false
}: { 
  title: string; 
  children: ReactNode; 
  collapsible?: boolean;
  defaultExpanded?: boolean;
  flexGrow?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section 
      className={cn(
        "rounded-lg overflow-hidden",
        flexGrow && "flex-1 flex flex-col min-h-0"
      )}
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <header 
        className={cn(
          "px-5 py-3.5 flex items-center justify-between shrink-0",
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
        <div className={cn(
          "p-5 space-y-5",
          flexGrow && "flex-1 flex flex-col min-h-0"
        )}>
          {children}
        </div>
      )}
    </section>
  );
}

// Catalyst Field Component
function Field({ 
  label, 
  required, 
  children,
  flexGrow = false
}: { 
  label: string; 
  required?: boolean; 
  children: ReactNode;
  flexGrow?: boolean;
}) {
  return (
    <div className={cn(
      "space-y-2",
      flexGrow && "flex-1 flex flex-col min-h-0"
    )}>
      <label className="text-[13px] font-medium text-foreground shrink-0">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <div className={cn(flexGrow && "flex-1 min-h-0")}>
        {children}
      </div>
    </div>
  );
}

export function DemandDetailsViewTab({ data, onChange }: DemandDetailsViewTabProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* DETAILS CARD - Primary card with flex layout for description to fill space */}
      <FormCard title="Details" flexGrow>
        {/* Summary field - fixed height */}
        <div className="shrink-0">
          <Field label="Summary" required>
            <Input
              value={data.title || ''}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="Enter demand summary"
              className="h-10 text-[14px]"
            />
          </Field>
        </div>

        {/* Description field - fills remaining height */}
        <Field label="Description" flexGrow>
          <RichTextEditor
            value={data.description || ''}
            onChange={(value) => onChange('description', value)}
            placeholder="Enter detailed description..."
            className="flex-1 h-full min-h-[300px]"
          />
        </Field>
      </FormCard>
    </div>
  );
}
