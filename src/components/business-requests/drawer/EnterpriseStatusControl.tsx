/**
 * EnterpriseStatusControl - Brand blue status control with dropdown
 * Catalyst Design System: Primary Blue (var(--ds-text-brand, #2563eb))
 */

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useActiveDemandProcessSteps } from '@/hooks/useDemandProcessSteps';

interface EnterpriseStatusControlProps {
  currentStep: string;
  onChange: (step: string) => void;
  disabled?: boolean;
}

function formatStepLabel(step: string): string {
  return step
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function EnterpriseStatusControl({ 
  currentStep, 
  onChange, 
  disabled = false 
}: EnterpriseStatusControlProps) {
  const [open, setOpen] = useState(false);
  const { data: processSteps = [] } = useActiveDemandProcessSteps();
  
  const displayLabel = formatStepLabel(currentStep || 'new_request');

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.3px]",
            "cursor-pointer transition-colors bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] hover:bg-[var(--ds-background-brand-bold-hovered,var(--ds-background-brand-bold-hovered, #1d4ed8))] text-white",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={{
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
          }}
        >
          <span 
            className="w-1.5 h-1.5 rounded-full animate-pulse bg-white"
          />
          {displayLabel}
          <ChevronDown className="h-3 w-3 opacity-80" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-44 z-[400] bg-popover border-border"
      >
        {processSteps.map((step) => {
          const isActive = step.value === currentStep;
          
          return (
            <DropdownMenuItem
              key={step.value}
              onClick={() => {
                onChange(step.value);
                setOpen(false);
              }}
              className={cn(
                "text-[13px] cursor-pointer",
                isActive && "bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]/10 text-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]"
              )}
            >
              <span className="flex-1">{step.label}</span>
              {isActive && (
                <Check className="h-4 w-4 shrink-0 text-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
