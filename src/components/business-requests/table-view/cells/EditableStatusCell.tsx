/**
 * EditableStatusCell — Inline editable status cell with dropdown picker
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
import { STATUS_CONFIG } from './StatusCell';

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

  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_') || 'new';
  const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.new_request;

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

  const statusDisplay = (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
      "text-xs font-medium cursor-pointer transition-opacity",
      config.lightClass,
      config.darkClass,
      !disabled && "hover:opacity-80"
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        config.dotLight,
        config.dotDark
      )} />
      {config.label}
    </span>
  );

  if (disabled) {
    return statusDisplay;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button onClick={(e) => e.stopPropagation()}>
          {statusDisplay}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn(
          "w-56 p-0 shadow-lg z-[100]",
          "bg-popover border-border"
        )}
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-h-60 overflow-y-auto py-1">
          {processSteps.map((step) => {
            const stepConfig = STATUS_CONFIG[step.value] || STATUS_CONFIG.new_request;
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
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                  stepConfig.lightClass,
                  stepConfig.darkClass
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    stepConfig.dotLight,
                    stepConfig.dotDark
                  )} />
                  {step.label}
                </span>
                {isSelected && (
                  <Check className="h-4 w-4 text-brand-primary flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}