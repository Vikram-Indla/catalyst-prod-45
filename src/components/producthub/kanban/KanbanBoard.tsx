import React from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import { KanbanColumn, type ColumnConfig } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { useKanbanDragDrop } from '@/hooks/useKanbanDragDrop';

const COLUMNS: ColumnConfig[] = [
  { key: 'new_demand',   label: 'New Demand',   color: '#3B82F6', wip: 5  },
  { key: 'under_review', label: 'Under Review',  color: '#8B5CF6', wip: 4  },
  { key: 'approved',     label: 'Approved',      color: '#06B6D4', wip: 6  },
  { key: 'in_progress',  label: 'In Progress',   color: '#F59E0B', wip: 8  },
  { key: 'on_hold',      label: 'On Hold',       color: '#6B7280', wip: 3  },
  { key: 'delivered',    label: 'Delivered',      color: '#10B981', wip: null },
  { key: 'cancelled',    label: 'Cancelled',     color: '#EF4444', wip: null },
];

interface KanbanBoardProps {
  initiatives: Initiative[];
  sortBy: string;
  onCardClick: (initiative: Initiative) => void;
}

function sortInitiatives(items: Initiative[], sortBy: string): Initiative[] {
  const sorted = [...items];
  switch (sortBy) {
    case 'score':
      return sorted.sort((a, b) => (b.computed_score ?? -1) - (a.computed_score ?? -1));
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'created':
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'target':
      return sorted.sort((a, b) => {
        if (!a.target_complete) return 1;
        if (!b.target_complete) return -1;
        return new Date(a.target_complete).getTime() - new Date(b.target_complete).getTime();
      });
    default:
      return sorted.sort((a, b) => a.sort_order - b.sort_order);
  }
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  initiatives,
  sortBy,
  onCardClick,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const { activeId, activeInitiative, onDragStart, onDragEnd } = useKanbanDragDrop(initiatives);

  const sorted = sortInitiatives(initiatives, sortBy);

  const columnItems = (status: InitiativeStatus) =>
    sorted.filter(i => i.status === status);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex-1 overflow-x-auto p-5">
        <div className="flex gap-4 min-w-min">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.key}
              config={col}
              items={columnItems(col.key)}
              onCardClick={onCardClick}
              activeId={activeId}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeInitiative ? (
          <KanbanCard
            initiative={activeInitiative}
            onClick={() => {}}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
