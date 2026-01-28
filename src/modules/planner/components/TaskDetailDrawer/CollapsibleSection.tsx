// ============================================================
// COLLAPSIBLE SECTION - MATCHES REFERENCE
// Chevron + icon + title + count on right
// ============================================================

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(defaultOpen || count > 0);

  return (
    <div>
      {/* Header Row */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 hover:bg-muted/30 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          {/* Chevron */}
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          
          {/* Icon */}
          <span className="text-muted-foreground">{icon}</span>
          
          {/* Title */}
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        
        {/* Count */}
        <span className="text-sm text-muted-foreground">
          {count} items
        </span>
      </button>
      
      {/* Content */}
      {isOpen && (
        <div className="pl-8 pb-2">
          {count === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No items yet</p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}
