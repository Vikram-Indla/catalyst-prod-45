import { List, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'list' | 'kanban';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
      <button
        onClick={() => onViewChange('list')}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors',
          currentView === 'list'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-600'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-600'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        )}
      >
        <LayoutGrid className="w-4 h-4" />
        Kanban
      </button>
    </div>
  );
}
