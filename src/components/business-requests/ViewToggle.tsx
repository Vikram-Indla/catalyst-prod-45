import { List, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'list' | 'kanban';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 border border-border rounded-lg bg-muted/30">
      <button
        onClick={() => onViewChange('list')}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors',
          currentView === 'list'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <List className="w-4 h-4" />
        List
      </button>
      <button
        onClick={() => onViewChange('kanban')}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors',
          currentView === 'kanban'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <LayoutGrid className="w-4 h-4" />
        Kanban
      </button>
    </div>
  );
}
