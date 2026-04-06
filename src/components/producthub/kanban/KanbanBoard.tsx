import React, { useState, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
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
  { key: 'new',                    label: 'New',                    color: 'rgba(237,237,237,0.40)' },
  { key: 'portfolio_review',       label: 'Portfolio Review',       color: '#2563EB' },
  { key: 'technical_validation',   label: 'Technical Validation',   color: '#0EA5E9' },
  { key: 'estimate',               label: 'Estimate',               color: '#D97706' },
  { key: 'demand_approved',        label: 'Demand Approved',        color: '#16A34A' },
  { key: 'under_implementation',   label: 'In Progress',            color: '#2563EB' },
  { key: 'done',                   label: 'Done',                   color: '#0D9488' },
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
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const { activeId, activeInitiative, onDragStart, onDragEnd } = useKanbanDragDrop(initiatives);

  const sorted = sortInitiatives(initiatives, sortBy);
  const columnItems = (status: InitiativeStatus) => sorted.filter(i => i.status === status);

  const [collapsedCols, setCollapsedCols] = useState<Set<string>>(new Set());
  const toggleCollapse = useCallback((key: string) => {
    setCollapsedCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const [contextMenu, setContextMenu] = useState<{
    initiative: Initiative;
    position: { x: number; y: number };
  } | null>(null);

  const handleCardContextMenu = useCallback((e: React.MouseEvent, initiative: Initiative) => {
    setContextMenu({ initiative, position: { x: e.clientX, y: e.clientY } });
  }, []);

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
      queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const boardRef = useRef<HTMLDivElement>(null);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
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
      <div className="pk-board-wrapper">
        <div
          ref={boardRef}
          className="pk-board"
          tabIndex={0}
          aria-label="Kanban board"
          style={{ outline: 'none' }}
        >
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              config={col}
              items={columnItems(col.key)}
              onCardClick={onCardClick}
              onCardContextMenu={handleCardContextMenu}
              activeId={activeId}
              swimlane={swimlane}
              focusedCardId={null}
              isCollapsed={collapsedCols.has(col.key)}
              onToggleCollapse={() => toggleCollapse(col.key)}
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
