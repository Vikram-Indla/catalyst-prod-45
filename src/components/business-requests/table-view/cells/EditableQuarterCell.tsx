/**
 * EditableQuarterCell — Inline editable quarter cell with dropdown picker
 */

import { useState } from 'react';
import { Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface EditableQuarterCellProps {
  quarter: string | null;
  requestId: string;
  onSave: (requestId: string, quarter: string[] | null) => Promise<void>;
  disabled?: boolean;
}

// Generate quarter options for current year and next 2 years
function getQuarterOptions(): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const quarters: string[] = [];
  
  for (let year = currentYear; year <= currentYear + 2; year++) {
    for (let q = 1; q <= 4; q++) {
      quarters.push(`Q${q} ${year}`);
    }
  }
  
  return quarters;
}

function formatQuarter(quarter: string): string {
  return quarter.toUpperCase().replace(/[-_]/g, ' ').trim().replace(/\s+/g, ' ');
}

function checkIsCurrentQuarter(quarter: string): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentQ = Math.ceil(currentMonth / 3);
  const currentQStr = `Q${currentQ} ${currentYear}`;
  
  const formatted = formatQuarter(quarter);
  return formatted === currentQStr;
}

export function EditableQuarterCell({ quarter, requestId, onSave, disabled = false }: EditableQuarterCellProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const quarterOptions = getQuarterOptions();
  const isCurrent = quarter ? checkIsCurrentQuarter(quarter) : false;

  const handleSelect = async (selectedQuarter: string | null) => {
    if (disabled || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(requestId, selectedQuarter ? [selectedQuarter] : null);
      setOpen(false);
    } catch (error) {
      console.error('Failed to save quarter:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const quarterDisplay = quarter ? (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity",
        "bg-brand-primary/15 text-brand-primary border border-brand-primary/30",
        "dark:bg-brand-primary/20 dark:border-brand-primary/40",
        !disabled && "hover:opacity-80"
      )}
    >
      {formatQuarter(quarter)}
    </span>
  ) : (
    <span className={cn(
      "text-muted-foreground text-sm cursor-pointer",
      !disabled && "hover:text-foreground"
    )}>
      —
    </span>
  );

  if (disabled) {
    return quarterDisplay;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button onClick={(e) => e.stopPropagation()}>
          {quarterDisplay}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-44 p-0 shadow-lg z-[100] bg-popover border-border"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-h-60 overflow-y-auto py-1">
          {quarter && (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left hover:bg-muted"
              onClick={() => handleSelect(null)}
              disabled={isSaving}
            >
              <span className="text-muted-foreground">Clear</span>
            </button>
          )}
          
          {quarterOptions.map((q) => {
            const isSelected = quarter && formatQuarter(quarter) === q;
            const isCurrentQ = checkIsCurrentQuarter(q);
            
            return (
              <button
                key={q}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors text-left',
                  'hover:bg-muted',
                  isSelected && 'bg-muted'
                )}
                onClick={() => handleSelect(q)}
                disabled={isSaving}
              >
                <span className={cn(
                  "text-foreground",
                  isCurrentQ && "font-medium text-brand-primary"
                )}>
                  {q}
                  {isCurrentQ && <span className="ml-1 text-xs">(Current)</span>}
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