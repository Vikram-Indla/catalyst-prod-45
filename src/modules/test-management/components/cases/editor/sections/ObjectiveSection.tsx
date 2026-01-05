/**
 * Objective Section Component
 * Rich text editor for test case objective/description
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ObjectiveSectionProps {
  objective: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ObjectiveSection({ objective, onChange, className }: ObjectiveSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className={cn(
        'bg-background rounded-xl border border-border shadow-sm overflow-hidden transition-all duration-200',
        'hover:shadow-md focus-within:border-primary/30 focus-within:shadow-md focus-within:shadow-primary/5',
        className
      )}
    >
      {/* Section Header */}
      <div
        className="flex items-center justify-between px-5 py-3 bg-gradient-to-b from-muted/50 to-muted/80 border-b border-border cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5">
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Objective
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Section Body */}
      {isExpanded && (
        <div className="p-5">
          <Textarea
            value={objective}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Describe the purpose of this test case. What functionality does it verify? What is the expected behavior?"
            className={cn(
              'min-h-[140px] p-4 resize-y',
              'border border-border rounded-lg',
              'text-sm leading-relaxed text-foreground',
              'placeholder:text-muted-foreground',
              'focus:border-primary/30 focus:ring-2 focus:ring-primary/10',
              'transition-all duration-150'
            )}
          />
        </div>
      )}
    </div>
  );
}
