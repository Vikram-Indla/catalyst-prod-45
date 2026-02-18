import React from 'react';
import { cn } from '@/lib/utils';
import type { Initiative } from '@/types/initiative';
import { InitiativeCard } from './InitiativeCard';
import type { GridSize } from './GridSizeToggle';
import { STATUS_DISPLAY, getPriorityLevel } from '@/types/initiative';

type GroupByOption = 'none' | 'status' | 'department' | 'quarter' | 'priority' | 'assignee';

interface CardsGridProps {
  initiatives: Initiative[];
  gridSize: GridSize;
  groupBy: GroupByOption;
  onCardClick: (id: string) => void;
}

function groupInitiatives(items: Initiative[], groupBy: GroupByOption): { key: string; label: string; items: Initiative[] }[] {
  if (groupBy === 'none') return [{ key: 'all', label: '', items }];

  const map = new Map<string, Initiative[]>();
  for (const item of items) {
    let key: string;
    switch (groupBy) {
      case 'status': key = item.status; break;
      case 'department': key = item.department_name || 'No Department'; break;
      case 'quarter': key = item.target_quarter || 'No Quarter'; break;
      case 'priority': key = getPriorityLevel(item.computed_score).level; break;
      case 'assignee': key = item.assignee_name || 'Unassigned'; break;
      default: key = 'Other';
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  return Array.from(map.entries()).map(([key, items]) => ({
    key,
    label: groupBy === 'status' ? (STATUS_DISPLAY[key as keyof typeof STATUS_DISPLAY]?.label || key) : key,
    items,
  }));
}

const GRID_CLASSES: Record<GridSize, string> = {
  small: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3',
  medium: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
  large: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5',
};

export const CardsGrid: React.FC<CardsGridProps> = ({ initiatives, gridSize, groupBy, onCardClick }) => {
  const groups = groupInitiatives(initiatives, groupBy);

  return (
    <div className="space-y-6">
      {groups.map(group => (
        <div key={group.key}>
          {group.label && (
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-semibold text-zinc-700">{group.label}</h3>
              <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                {group.items.length}
              </span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>
          )}
          <div className={cn('grid', GRID_CLASSES[gridSize])}>
            {group.items.map(init => (
              <InitiativeCard
                key={init.id}
                initiative={init}
                gridSize={gridSize}
                onClick={() => onCardClick(init.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CardsGrid;
