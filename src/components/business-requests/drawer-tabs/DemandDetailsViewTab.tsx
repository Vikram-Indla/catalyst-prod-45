/**
 * DemandDetailsViewTab - Catalyst Design System
 * Executive-grade form cards with olive accents
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
        background: 'var(--surface-bg, hsl(var(--background)))',
        border: '1px solid var(--border-default, hsl(var(--border)))',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <header 
        className={cn(
          "px-4 py-3 flex items-center justify-between",
          collapsible && "cursor-pointer hover:bg-[var(--surface-hover,hsl(var(--muted)))]"
        )}
        style={{
          background: 'linear-gradient(180deg, var(--surface-bg, hsl(var(--background))) 0%, var(--surface-subtle, hsl(var(--muted)/0.3)) 100%)',
          borderBottom: expanded ? '1px solid var(--border-subtle, hsl(var(--border)/0.5))' : 'none',
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
            className="p-1 rounded hover:bg-[var(--surface-hover,hsl(var(--muted)))]"
            style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", !expanded && "-rotate-90")} />
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
      <label 
        className="text-[12px] font-medium"
        style={{ color: 'var(--text-secondary, hsl(var(--muted-foreground)))' }}
      >
        {label}
        {required && <span style={{ color: '#B85C5C' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

export function DemandDetailsViewTab({ data, onChange }: DemandDetailsViewTabProps) {
  // Input styles matching Catalyst
  const inputStyle = {
    background: 'var(--input-bg, hsl(var(--background)))',
    borderColor: 'var(--input-border, hsl(var(--border)))',
    color: 'var(--text-primary, hsl(var(--foreground)))',
  };

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
            style={inputStyle}
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
