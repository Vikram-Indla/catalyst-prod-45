/**
 * EnterpriseStatusControl - Olive pill status control with dropdown
 * Catalyst Design System: Primary Olive (#5C7C5C)
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
            "cursor-pointer transition-colors",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={{
            background: '#5C7C5C',
            color: 'white',
            boxShadow: '0 2px 4px rgba(92, 124, 92, 0.25)',
          }}
        >
          <span 
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: 'white' }}
          />
          {displayLabel}
          <ChevronDown className="h-3 w-3 opacity-80" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-44 z-[400]"
        style={{ background: 'var(--surface-bg, hsl(var(--background)))', borderColor: 'var(--border-default, hsl(var(--border)))' }}
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
              className="text-[13px] cursor-pointer"
              style={{
                background: isActive ? 'rgba(92, 124, 92, 0.08)' : 'transparent',
                color: isActive ? '#5C7C5C' : 'var(--text-primary, hsl(var(--foreground)))',
              }}
            >
              <span className="flex-1">{step.label}</span>
              {isActive && (
                <Check className="h-4 w-4 shrink-0" style={{ color: '#5C7C5C' }} />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
