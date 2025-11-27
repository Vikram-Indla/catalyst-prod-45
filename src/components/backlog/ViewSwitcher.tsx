import { useState, useRef, useEffect } from 'react';
import { List, LayoutGrid, Eye, ChevronDown } from 'lucide-react';

export type ViewMode = 'list' | 'kanban' | 'unassigned';
export type KanbanMode = 'state' | 'process' | 'column';

interface ViewSwitcherProps {
  currentView: ViewMode;
  kanbanMode: KanbanMode;
  onViewChange: (view: ViewMode) => void;
  onKanbanModeChange: (mode: KanbanMode) => void;
}

const KANBAN_OPTIONS = [
  { id: 'state' as const, label: 'State View', icon: '⊞' },
  { id: 'process' as const, label: 'Process View', icon: '📊' },
  { id: 'column' as const, label: 'Column View', icon: '▤' },
];

export function ViewSwitcher({ currentView, kanbanMode, onViewChange, onKanbanModeChange }: ViewSwitcherProps) {
  const [isKanbanMenuOpen, setIsKanbanMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsKanbanMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-1 p-1 border border-border rounded bg-background">
      <button
        onClick={() => onViewChange('list')}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
          currentView === 'list'
            ? 'bg-[#DEEBFF] text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <List className="w-4 h-4" />
        List
      </button>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => {
            if (currentView !== 'kanban') {
              onViewChange('kanban');
            } else {
              setIsKanbanMenuOpen(!isKanbanMenuOpen);
            }
          }}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
            currentView === 'kanban'
              ? 'bg-[#DEEBFF] text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Kanban
          {currentView === 'kanban' && <ChevronDown className="w-3 h-3" />}
        </button>

        {isKanbanMenuOpen && (
          <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-background border border-border rounded-lg shadow-xl z-[100] py-1">
            {KANBAN_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onKanbanModeChange(option.id);
                  setIsKanbanMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                  kanbanMode === option.id
                    ? 'text-primary'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
                {kanbanMode === option.id && <span className="ml-auto text-primary">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => onViewChange('unassigned')}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
          currentView === 'unassigned'
            ? 'bg-[#DEEBFF] text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <Eye className="w-4 h-4" />
        Unassigned Backlog
      </button>
    </div>
  );
}