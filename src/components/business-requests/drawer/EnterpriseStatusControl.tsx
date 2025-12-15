/**
 * EnterpriseStatusControl - Interactive status lozenge with dropdown behavior
 * Replaces the plain text status with a proper interactive control
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

// Status colors using semantic tokens
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  new_request: { 
    bg: 'rgba(156, 163, 175, 0.15)', 
    text: 'var(--text-2)', 
    border: 'rgba(156, 163, 175, 0.3)' 
  },
  new_demand: { 
    bg: 'rgba(59, 130, 246, 0.15)', 
    text: 'rgb(59, 130, 246)', 
    border: 'rgba(59, 130, 246, 0.3)' 
  },
  in_review: { 
    bg: 'rgba(168, 85, 247, 0.15)', 
    text: 'rgb(168, 85, 247)', 
    border: 'rgba(168, 85, 247, 0.3)' 
  },
  approved: { 
    bg: 'rgba(34, 197, 94, 0.15)', 
    text: 'rgb(34, 197, 94)', 
    border: 'rgba(34, 197, 94, 0.3)' 
  },
  in_progress: { 
    bg: 'rgba(198, 156, 109, 0.15)', 
    text: 'var(--accent-color)', 
    border: 'rgba(198, 156, 109, 0.3)' 
  },
  on_hold: { 
    bg: 'rgba(234, 179, 8, 0.15)', 
    text: 'rgb(202, 138, 4)', 
    border: 'rgba(234, 179, 8, 0.3)' 
  },
  completed: { 
    bg: 'rgba(92, 124, 92, 0.15)', 
    text: 'var(--secondary-green)', 
    border: 'rgba(92, 124, 92, 0.3)' 
  },
  cancelled: { 
    bg: 'rgba(239, 68, 68, 0.15)', 
    text: 'rgb(239, 68, 68)', 
    border: 'rgba(239, 68, 68, 0.3)' 
  },
};

function getStatusStyle(step: string) {
  const normalizedStep = step.toLowerCase().replace(/\s+/g, '_');
  return STATUS_STYLES[normalizedStep] || STATUS_STYLES.new_request;
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
  
  const style = getStatusStyle(currentStep);
  const displayLabel = formatStepLabel(currentStep || 'new_request');

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
            "transition-all duration-150 cursor-pointer",
            "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={{
            background: style.bg,
            color: style.text,
            border: `1px solid ${style.border}`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.text }} />
          <span>{displayLabel}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-48"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border-color)' }}
      >
        {processSteps.map((step) => {
          const stepStyle = getStatusStyle(step.value);
          const isActive = step.value === currentStep;
          
          return (
            <DropdownMenuItem
              key={step.value}
              onClick={() => {
                onChange(step.value);
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 cursor-pointer",
                isActive && "bg-accent"
              )}
            >
              <span 
                className="w-2 h-2 rounded-full shrink-0" 
                style={{ background: stepStyle.text }} 
              />
              <span className="flex-1 text-sm" style={{ color: 'var(--text-1)' }}>
                {step.label}
              </span>
              {isActive && (
                <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--accent-color)' }} />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
