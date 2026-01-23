// =====================================================
// VIEW TOGGLE - Grid/List Switch Component
// Phase 2 Execution Package
// =====================================================

import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ view, onViewChange, className }: ViewToggleProps) {
  return (
    <div 
      className={cn(
        'inline-flex items-center rounded-md border border-border bg-muted/50 p-0.5',
        className
      )}
    >
      <button
        onClick={() => onViewChange('list')}
        className={cn(
          'flex items-center justify-center w-8 h-7 rounded transition-all',
          view === 'list'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="List view"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => onViewChange('grid')}
        className={cn(
          'flex items-center justify-center w-8 h-7 rounded transition-all',
          view === 'grid'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="Grid view"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
    </div>
  );
}
