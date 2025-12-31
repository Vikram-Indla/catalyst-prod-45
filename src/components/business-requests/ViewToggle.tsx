import { List, LayoutGrid, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'list' | 'kanban' | 'table';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  showTable?: boolean;
}

export function ViewToggle({ currentView, onViewChange, showTable = false }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center p-1 bg-muted/40 rounded-xl border border-border/50">
      <button
        onClick={() => onViewChange('list')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
          currentView === 'list'
            ? 'bg-card text-foreground shadow-md ring-1 ring-border/30'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        <List className="w-4 h-4" />
        List
      </button>
      <button
        onClick={() => onViewChange('kanban')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
          currentView === 'kanban'
            ? 'bg-card text-foreground shadow-md ring-1 ring-border/30'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        <LayoutGrid className="w-4 h-4" />
        Board
      </button>
      {showTable && (
        <button
          onClick={() => onViewChange('table')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
            currentView === 'table'
              ? 'bg-card text-foreground shadow-md ring-1 ring-border/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Table2 className="w-4 h-4" />
          Table
        </button>
      )}
    </div>
  );
}
