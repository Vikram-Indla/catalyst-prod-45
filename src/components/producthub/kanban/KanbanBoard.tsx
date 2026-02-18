import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { KanbanColumn, type ColumnConfig, type SwimlaneField } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { CardContextMenu } from './CardContextMenu';
import { useKanbanDragDrop } from '@/hooks/useKanbanDragDrop';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const COLUMNS: ColumnConfig[] = [
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
  swimlane: SwimlaneField;
  onCardClick: (initiative: Initiative) => void;
  totalCount: number;
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
  swimlane,
  onCardClick,
  totalCount,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const { activeId, activeInitiative, onDragStart, onDragEnd } = useKanbanDragDrop(initiatives);

  const sorted = sortInitiatives(initiatives, sortBy);
  const columnItems = (status: InitiativeStatus) => sorted.filter(i => i.status === status);

  // Collapsed columns state
  const [collapsedCols, setCollapsedCols] = useState<Set<string>>(new Set());
  const toggleCollapse = useCallback((key: string) => {
    setCollapsedCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    initiative: Initiative;
    position: { x: number; y: number };
  } | null>(null);

  const handleCardContextMenu = useCallback((e: React.MouseEvent, initiative: Initiative) => {
    setContextMenu({ initiative, position: { x: e.clientX, y: e.clientY } });
  }, []);

  // Status change from context menu
  const queryClient = useQueryClient();
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InitiativeStatus }) => {
      const { error } = await supabase
        .from('ph_initiatives' as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives-mock'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  // Keyboard navigation
  const boardRef = useRef<HTMLDivElement>(null);
  const [focusedCol, setFocusedCol] = useState(0);
  const [focusedCard, setFocusedCard] = useState(0);

  const visibleColumns = COLUMNS.filter(c => !collapsedCols.has(c.key));
  const currentColItems = columnItems(visibleColumns[focusedCol]?.key ?? 'new_demand');
  const focusedCardId = currentColItems[focusedCard]?.id ?? null;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const cols = COLUMNS.filter(c => !collapsedCols.has(c.key));

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        setFocusedCol(prev => Math.min(prev + 1, cols.length - 1));
        setFocusedCard(0);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setFocusedCol(prev => Math.max(prev - 1, 0));
        setFocusedCard(0);
        break;
      case 'ArrowDown': {
        e.preventDefault();
        const items = columnItems(cols[focusedCol]?.key ?? 'new_demand');
        setFocusedCard(prev => Math.min(prev + 1, items.length - 1));
        break;
      }
      case 'ArrowUp':
        e.preventDefault();
        setFocusedCard(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter': {
        e.preventDefault();
        const items = columnItems(cols[focusedCol]?.key ?? 'new_demand');
        if (items[focusedCard]) onCardClick(items[focusedCard]);
        break;
      }
      case 'f':
      case 'F':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
          searchInput?.focus();
        }
        break;
      case '1': case '2': case '3': case '4': case '5': case '6': case '7': {
        const idx = parseInt(e.key) - 1;
        if (idx < cols.length) { setFocusedCol(idx); setFocusedCard(0); }
        break;
      }
    }
  }, [collapsedCols, focusedCol, focusedCard, onCardClick]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up initiative ${active.id}`,
          onDragOver: ({ active, over }) => over ? `Initiative ${active.id} is over ${over.id}` : '',
          onDragEnd: ({ active, over }) => over ? `Moved initiative ${active.id} to ${over.id}` : `Cancelled moving ${active.id}`,
          onDragCancel: ({ active }) => `Cancelled moving ${active.id}`,
        },
        screenReaderInstructions: {
          draggable: 'Press Space to pick up. Use arrow keys to move. Press Space to drop.',
        },
      }}
    >
      <div
        ref={boardRef}
        className="flex-1 overflow-x-auto p-5 outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Kanban board. Use arrow keys to navigate, Enter to open card details."
      >
        <div className="flex gap-4 min-w-min">
          {COLUMNS.map((col, colIdx) => (
            <KanbanColumn
              key={col.key}
              config={col}
              items={columnItems(col.key)}
              onCardClick={onCardClick}
              onCardContextMenu={handleCardContextMenu}
              activeId={activeId}
              swimlane={swimlane}
              focusedCardId={
                !collapsedCols.has(col.key) &&
                visibleColumns[focusedCol]?.key === col.key
                  ? focusedCardId
                  : null
              }
              isCollapsed={collapsedCols.has(col.key)}
              onToggleCollapse={() => toggleCollapse(col.key)}
            />
          ))}
        </div>

        {/* Showing X of Y */}
        <div className="mt-4 text-center">
          <span className="text-xs text-zinc-400">
            Showing {initiatives.length} of {totalCount} initiatives
          </span>
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

      {/* Context Menu */}
      {contextMenu && (
        <CardContextMenu
          initiative={contextMenu.initiative}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onEditDetails={() => { onCardClick(contextMenu.initiative); setContextMenu(null); }}
          onStatusChange={(status) => {
            statusMutation.mutate({ id: contextMenu.initiative.id, status });
            setContextMenu(null);
          }}
        />
      )}
    </DndContext>
  );
};
