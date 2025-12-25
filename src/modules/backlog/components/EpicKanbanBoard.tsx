/**
 * EpicKanbanBoard - Full Kanban board for Epic Backlog
 * Styled like Industry Kanban with DnD and real-time updates
 */
import { useMemo, useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BacklogItem, BacklogMeta } from '../types';
import { EpicKanbanColumn } from './EpicKanbanColumn';
import { toast } from 'sonner';

interface EpicKanbanBoardProps {
  items: BacklogItem[];
  meta?: BacklogMeta;
  selectedItems: string[];
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
  onAddEpic?: () => void;
}

// Epic states with colors matching Industry Kanban pattern
const EPIC_STATES = [
  { id: 'not_started', label: 'Not Started', color: '#6b7280' },    // Gray
  { id: 'in_progress', label: 'In Progress', color: '#f59e0b' },   // Amber
  { id: 'accepted', label: 'Accepted', color: '#22c55e' },         // Green
  { id: 'done', label: 'Done', color: '#3b82f6' },                 // Blue
];

export function EpicKanbanBoard({
  items,
  meta,
  selectedItems,
  onItemClick,
  onItemSelect,
  onAddEpic,
}: EpicKanbanBoardProps) {
  const queryClient = useQueryClient();
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>([]);

  // Use meta states if available, otherwise fall back to defaults
  const states = useMemo(() => {
    if (meta?.states && meta.states.length > 0) {
      return meta.states.map(state => {
        const predefined = EPIC_STATES.find(s => s.id === state);
        return predefined || { 
          id: state, 
          label: state.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          color: '#6b7280'
        };
      });
    }
    return EPIC_STATES;
  }, [meta?.states]);

  // Group items by state
  const itemsByState = useMemo(() => {
    const grouped: Record<string, BacklogItem[]> = {};
    states.forEach(state => {
      grouped[state.id] = items.filter(item => item.state === state.id);
    });
    return grouped;
  }, [items, states]);

  // Mutation to update epic state
  const updateStateMutation = useMutation({
    mutationFn: async ({ itemId, newState }: { itemId: string; newState: string }) => {
      const { error } = await supabase
        .from('epics')
        .update({ 
          state: newState as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Epic state updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update state: ${error.message}`);
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceState = result.source.droppableId;
    const destState = result.destination.droppableId;

    // No change if dropped in same column
    if (sourceState === destState) return;

    const itemId = result.draggableId;
    updateStateMutation.mutate({ itemId, newState: destState });
  };

  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(c => c !== columnId)
        : [...prev, columnId]
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div
        className="flex gap-3 flex-1 overflow-x-auto overflow-y-hidden px-4 pt-3"
        style={{
          minHeight: 0,
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {states.map(state => (
          <EpicKanbanColumn
            key={state.id}
            columnId={state.id}
            label={state.label}
            color={state.color}
            items={itemsByState[state.id] || []}
            selectedItems={selectedItems}
            onItemClick={onItemClick}
            onItemSelect={onItemSelect}
            collapsed={collapsedColumns.includes(state.id)}
            onToggleCollapse={() => toggleColumnCollapse(state.id)}
            onAddEpic={state.id === 'not_started' ? onAddEpic : undefined}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
