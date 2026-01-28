// ============================================================
// COLLAPSIBLE SECTION - MATCHES REFERENCE
// Chevron + icon + title + count on right
// ALWAYS renders children (which contain add functionality)
// ============================================================

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

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
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      {/* Header Row */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 hover:bg-muted/30 rounded-lg transition-colors px-2 -mx-2"
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
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      </button>
      
      {/* Content - ALWAYS render children so add buttons work */}
      {isOpen && (
        <div className="pl-8 pb-2">
          {children}
        </div>
      )}
    </div>
  );
}
