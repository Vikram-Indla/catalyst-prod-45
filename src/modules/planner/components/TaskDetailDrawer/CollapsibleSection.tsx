// ============================================================
// COLLAPSIBLE SECTION - LINEAR-INSPIRED
// Auto-collapses when empty, clean expand/collapse behavior
// ============================================================

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  onAdd?: () => void;
}

export function CollapsibleSection({ 
  title, 
  count, 
  icon,
  children,
  defaultOpen = false,
  onAdd,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || count > 0);

  // Auto-collapse when count becomes 0
  useEffect(() => {
    if (count === 0 && !defaultOpen) {
      setIsOpen(false);
    }
  }, [count, defaultOpen]);

  // Collapsed state - minimal footprint for empty sections
  if (!isOpen && count === 0) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between px-3 py-2 -mx-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4" />
          {icon}
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">({count})</span>
        </div>
        {onAdd && (
          <Plus 
            className="w-4 h-4 opacity-0 group-hover:opacity-100" 
            onClick={(e) => { 
              e.stopPropagation(); 
              onAdd(); 
              setIsOpen(true);
            }} 
          />
        )}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 -mx-3 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-foreground">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {icon}
          <span className="text-sm font-semibold">{title}</span>
          {count > 0 && (
            <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-semibold text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        {onAdd && (
          <Plus 
            className={cn(
              "w-4 h-4 text-muted-foreground hover:text-foreground transition-colors",
              isOpen ? "opacity-100" : "opacity-0"
            )}
            onClick={(e) => { 
              e.stopPropagation(); 
              onAdd(); 
            }} 
          />
        )}
      </button>
      
      {/* Content */}
      {isOpen && (
        <div className="pl-6">
          {children}
        </div>
      )}
    </div>
  );
}
