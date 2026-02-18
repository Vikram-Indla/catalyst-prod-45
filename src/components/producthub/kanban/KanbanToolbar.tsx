import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Table2, Kanban, Clock, LayoutGrid, ArrowUpDown,
  Rows3, Download, Plus, ChevronDown,
} from 'lucide-react';

const VIEWS = [
  { key: 'table', label: 'Table', icon: Table2, route: '/producthub/backlog' },
  { key: 'board', label: 'Board', icon: Kanban, route: '/producthub/kanban' },
  { key: 'timeline', label: 'Timeline', icon: Clock, route: '/producthub/roadmap' },
  { key: 'cards', label: 'Cards', icon: LayoutGrid, route: '' },
] as const;

const SORT_OPTIONS = [
  { key: 'score', label: 'Score' },
  { key: 'title', label: 'Title' },
  { key: 'created', label: 'Date Created' },
  { key: 'target', label: 'Target Date' },
];

interface KanbanToolbarProps {
  sortBy: string;
  onSortChange: (sort: string) => void;
  onNewInitiative: () => void;
}

export const KanbanToolbar: React.FC<KanbanToolbarProps> = ({
  sortBy,
  onSortChange,
  onNewInitiative,
}) => {
  const navigate = useNavigate();
  const [showSort, setShowSort] = useState(false);

  const sortLabel = SORT_OPTIONS.find(s => s.key === sortBy)?.label ?? 'Score';

  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-b border-zinc-200 bg-white">
      {/* Left: View Switcher + Tools */}
      <div className="flex items-center gap-3">
        {/* View Switcher */}
        <div className="flex items-center bg-zinc-100 rounded-lg p-1 gap-0.5">
          {VIEWS.map(v => (
            <button
              key={v.key}
              onClick={() => {
                if (v.route && v.key !== 'board') navigate(v.route);
              }}
              disabled={v.key === 'cards'}
              className={cn(
                'flex items-center gap-1.5 px-3 h-8 text-sm rounded-md transition-all',
                v.key === 'board'
                  ? 'bg-white text-zinc-900 font-semibold shadow-sm'
                  : v.key === 'cards'
                    ? 'text-zinc-400 cursor-not-allowed'
                    : 'text-zinc-600 font-medium hover:text-zinc-800 hover:bg-zinc-50'
              )}
            >
              <v.icon className="w-4 h-4" />
              <span>{v.label}</span>
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-zinc-300" />

        {/* Swimlane (placeholder) */}
        <button className="flex items-center gap-1.5 px-3 h-8 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 hover:border-zinc-400 transition-colors">
          <Rows3 className="w-4 h-4 text-zinc-500" />
          <span>Swimlane: None</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
        </button>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setShowSort(!showSort)}
            className="flex items-center gap-1.5 px-3 h-8 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 hover:border-zinc-400 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4 text-zinc-500" />
            <span>Sort: {sortLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>
          {showSort && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
              <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 py-1">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => { onSortChange(opt.key); setShowSort(false); }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors',
                      sortBy === opt.key ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-zinc-700'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Export + New */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 h-8 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 hover:border-zinc-400 transition-colors">
          <Download className="w-4 h-4 text-zinc-500" />
          <span>Export</span>
        </button>
        <button
          onClick={onNewInitiative}
          className="flex items-center gap-1.5 px-4 h-9 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Initiative</span>
        </button>
      </div>
    </div>
  );
};
