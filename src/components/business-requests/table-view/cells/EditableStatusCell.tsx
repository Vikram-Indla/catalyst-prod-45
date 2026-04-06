/**
 * EditableStatusCell — V12 StatusLozenge guardrail
 * 3-color system: grey (to do), blue (in progress), green (done)
 * 3px radius, 700 weight, uppercase, NO dots/icons
 */

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useActiveDemandProcessSteps } from '@/hooks/useDemandProcessSteps';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/* V12 StatusLozenge — map every status to grey/blue/green */
type LozengeVariant = 'grey' | 'blue' | 'green';

const LOZENGE_STYLES: Record<LozengeVariant, { bg: string; color: string }> = {
  grey:  { bg: '#DFE1E6', color: '#42526E' },
  blue:  { bg: '#0C66E4', color: '#FFFFFF' },
  green: { bg: '#1B7F37', color: '#FFFFFF' },
};

const STATUS_VARIANT_MAP: Record<string, LozengeVariant> = {
  // Grey — not started / waiting
  new: 'grey', new_request: 'grey', new_demand: 'grey', backlog: 'grey',
  draft: 'grey', on_hold: 'grey', 'on-hold': 'grey', blocked: 'grey',
  waiting: 'grey', figma_design: 'grey', technical_validation: 'grey',
  funnel: 'grey', scored: 'grey', ready: 'grey', ready_to_implement: 'grey',
  // Blue — in work
  in_progress: 'blue', 'in-progress': 'blue', in_review: 'blue',
  active: 'blue', testing: 'blue', implement: 'blue', implementing: 'blue',
  analyse: 'blue', analysis: 'blue', ea_review: 'blue', 'ea-review': 'blue',
  budget_review: 'blue', brd_preparation: 'blue', brd_backlog: 'blue',
  // Green — finished
  done: 'green', completed: 'green', approved: 'green', resolved: 'green',
  closed: 'green', in_support: 'green', cancelled: 'green', canceled: 'green',
  rejected: 'green',
};

function getLozengeVariant(status: string): LozengeVariant {
  const normalized = status?.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_') || 'new';
  return STATUS_VARIANT_MAP[normalized] || 'grey';
}

function getLozengeLabel(status: string): string {
  return status
    ?.replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .toUpperCase() || 'NEW';
}

interface EditableStatusCellProps {
  status: string;
  requestId: string;
  onSave: (requestId: string, status: string) => Promise<void>;
  disabled?: boolean;
}

export function EditableStatusCell({ status, requestId, onSave, disabled = false }: EditableStatusCellProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { data: processSteps = [] } = useActiveDemandProcessSteps();

  const variant = getLozengeVariant(status);
  const styles = LOZENGE_STYLES[variant];

  const handleSelect = async (selectedValue: string) => {
    if (disabled || isSaving || selectedValue === status) return;
    
    setIsSaving(true);
    try {
      await onSave(requestId, selectedValue);
      setOpen(false);
    } catch (error) {
      console.error('Failed to save status:', error);
    } finally {
      setIsSaving(false);
    }
  };

  /* V12 StatusLozenge element */
  const lozengeEl = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 20, /* V12 */
        padding: '0 6px', /* V12 */
        borderRadius: 4, /* V12 */
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif", /* V12 */
        fontSize: 11, /* V12 */
        fontWeight: 700, /* V12 */
        textTransform: 'uppercase' as const, /* V12 */
        letterSpacing: '0.03em', /* V12 */
        lineHeight: 1, /* V12 */
        whiteSpace: 'nowrap' as const, /* V12 */
        maxWidth: 150, /* V12 */
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        background: styles.bg,
        color: styles.color,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {getLozengeLabel(status)}
    </span>
  );

  if (disabled) return lozengeEl;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button onClick={(e) => e.stopPropagation()} style={{ background: 'none', border: 'none', padding: 0 }}>
          {lozengeEl}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-56 p-0 shadow-lg z-[100] bg-popover border-border"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-h-60 overflow-y-auto py-1">
          {processSteps.map((step) => {
            const stepVariant = getLozengeVariant(step.value);
            const stepStyles = LOZENGE_STYLES[stepVariant];
            const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_') || 'new';
            const isSelected = normalizedStatus === step.value;
            
            return (
              <button
                key={step.id}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors text-left',
                  'hover:bg-muted',
                  isSelected && 'bg-muted'
                )}
                onClick={() => handleSelect(step.value)}
                disabled={isSaving}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 20,
                    padding: '0 6px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.03em',
                    lineHeight: 1,
                    whiteSpace: 'nowrap' as const,
                    background: stepStyles.bg,
                    color: stepStyles.color,
                  }}
                >
                  {step.label.toUpperCase()}
                </span>
                {isSelected && (
                  <Check className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--cp-blue)' }} />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}