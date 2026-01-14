// ============================================================
// COLLAPSIBLE SECTION - ONE HEADER, COLLAPSED BY DEFAULT IF EMPTY
// ============================================================

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({ 
  title, 
  count, 
  icon,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  // Auto-expand if has items, otherwise collapsed
  const [isOpen, setIsOpen] = useState(defaultOpen || count > 0);

  return (
    <div>
      {/* SINGLE Header Row */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2.5 hover:bg-muted/30 -mx-1 px-1 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          {/* Chevron */}
          <ChevronRight 
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isOpen && "rotate-90"
            )} 
          />
          
          {/* Icon */}
          <span className="text-muted-foreground">{icon}</span>
          
          {/* Title - ONCE */}
          <span className={cn(
            "text-sm font-medium",
            count > 0 ? "text-foreground" : "text-muted-foreground"
          )}>
            {title}
          </span>
          
          {/* Count */}
          <span className="text-xs text-muted-foreground">
            ({count})
          </span>
        </div>
      </button>
      
      {/* Content - NO nested headers */}
      {isOpen && (
        <div className="pl-6 pb-2">
          {children}
        </div>
      )}
    </div>
  );
}
