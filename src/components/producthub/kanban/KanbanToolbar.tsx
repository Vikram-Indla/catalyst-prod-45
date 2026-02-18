import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ArrowUpDown,
  Rows3, Download, Plus, ChevronDown,
} from 'lucide-react';
import type { SwimlaneField } from './KanbanColumn';


const SORT_OPTIONS = [
  { key: 'score', label: 'Score' },
  { key: 'title', label: 'Title' },
  { key: 'created', label: 'Date Created' },
  { key: 'target', label: 'Target Date' },
];

const SWIMLANE_OPTIONS: { key: SwimlaneField; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'department', label: 'Department' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'priority', label: 'Priority' },
];

interface KanbanToolbarProps {
  sortBy: string;
  onSortChange: (sort: string) => void;
  swimlane: SwimlaneField;
  onSwimlaneChange: (value: SwimlaneField) => void;
  onNewInitiative: () => void;
}

export const KanbanToolbar: React.FC<KanbanToolbarProps> = ({
  sortBy,
  onSortChange,
  swimlane,
  onSwimlaneChange,
  onNewInitiative,
}) => {
  const [showSort, setShowSort] = useState(false);
  const [showSwimlane, setShowSwimlane] = useState(false);

  const sortLabel = SORT_OPTIONS.find(s => s.key === sortBy)?.label ?? 'Score';
  const swimlaneLabel = SWIMLANE_OPTIONS.find(s => s.key === swimlane)?.label ?? 'None';

  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-b border-zinc-200 bg-white">
      <div className="flex items-center gap-3">
        {/* Swimlane dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSwimlane(!showSwimlane)}
            className="flex items-center gap-1.5 px-3 h-8 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 hover:border-zinc-400 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Rows3 className="w-4 h-4 text-zinc-500" />
            <span>Swimlane: {swimlaneLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>
          {showSwimlane && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSwimlane(false)} />
              <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 py-1">
                {SWIMLANE_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => { onSwimlaneChange(opt.key); setShowSwimlane(false); }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors',
                      swimlane === opt.key ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-zinc-700'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSort(!showSort)}
            className="flex items-center gap-1.5 px-3 h-8 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 hover:border-zinc-400 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
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

      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 h-8 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 hover:border-zinc-400 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500">
          <Download className="w-4 h-4 text-zinc-500" />
          <span>Export</span>
        </button>
        <button
          onClick={onNewInitiative}
          className="flex items-center gap-1.5 px-4 h-9 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Initiative</span>
        </button>
      </div>
    </div>
  );
};
