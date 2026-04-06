import React from 'react';
import { ChevronDown, Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GridSizeToggle, type GridSize } from './GridSizeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type GroupByOption = 'none' | 'status' | 'department' | 'quarter' | 'priority' | 'assignee';
type SortOption = 'score' | 'title' | 'created' | 'target' | 'progress';

const GROUP_OPTIONS: { value: GroupByOption; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'status', label: 'Status' },
  { value: 'department', label: 'Department' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignee', label: 'Assignee' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'score', label: 'Score' },
  { value: 'title', label: 'Title' },
  { value: 'created', label: 'Created' },
  { value: 'target', label: 'Target Date' },
  { value: 'progress', label: 'Progress' },
];

interface CardsToolbarProps {
  groupBy: GroupByOption;
  onGroupByChange: (v: GroupByOption) => void;
  sortBy: SortOption;
  onSortByChange: (v: SortOption) => void;
  gridSize: GridSize;
  onGridSizeChange: (v: GridSize) => void;
  onExport?: () => void;
  onNewInitiative?: () => void;
}

export const CardsToolbar: React.FC<CardsToolbarProps> = ({
  groupBy,
  onGroupByChange,
  sortBy,
  onSortByChange,
  gridSize,
  onGridSizeChange,
  onExport,
  onNewInitiative,
}) => {
  const activeGroupLabel = GROUP_OPTIONS.find(o => o.value === groupBy)?.label ?? 'None';
  const activeSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Score';

  return (
    <div className="flex items-center justify-between px-5 py-2 border-b border-zinc-200 dark:border-[#2E2E2E] bg-white dark:bg-transparent">
      {/* Left */}
      <div className="flex items-center gap-2">
        {/* Group dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium text-zinc-700 border-zinc-300">
              Group: {activeGroupLabel}
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {GROUP_OPTIONS.map(o => (
              <DropdownMenuItem key={o.value} onClick={() => onGroupByChange(o.value)}>
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium text-zinc-700 border-zinc-300">
              Sort: {activeSortLabel}
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {SORT_OPTIONS.map(o => (
              <DropdownMenuItem key={o.value} onClick={() => onSortByChange(o.value)}>
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Grid size toggle */}
        <GridSizeToggle value={gridSize} onChange={onGridSizeChange} />
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium text-zinc-700 border-zinc-300"
          onClick={onExport}
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          Export
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          onClick={onNewInitiative}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          New Initiative
        </Button>
      </div>
    </div>
  );
};

export default CardsToolbar;
