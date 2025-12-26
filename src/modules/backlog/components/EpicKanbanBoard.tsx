/**
 * EpicKanbanBoard - Full Kanban board for Epic Backlog
 * Fetches epic statuses from epic_statuses table (admin configured)
 * Styled like Industry Kanban with DnD and real-time updates
 */
import { useMemo, useState, useEffect } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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

// Color mapping for semantic color names from admin
const COLOR_MAP: Record<string, string> = {
  info: '#3b82f6',      // Blue
  warning: '#f59e0b',   // Amber
  forest: '#0d9488',    // Teal (was Green)
  stone: '#6b7280',     // Gray
  success: '#0d9488',   // Teal (was Green)
  danger: '#ef4444',    // Red
  primary: '#2563eb',   // Blue (was Olive)
};

// Fallback states if fetch fails
const FALLBACK_STATES = [
  { id: 'proposed', label: 'New Epic', color: '#3b82f6' },
  { id: 'analyzing', label: 'Analysis', color: '#3b82f6' },
  { id: 'approved', label: 'Ready for Implementation', color: '#0d9488' },
  { id: 'in_progress', label: 'In Implementation', color: '#2563eb' },
  { id: 'done', label: 'Done', color: '#0d9488' },
  { id: 'cancelled', label: 'Cancelled', color: '#6b7280' },
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

  // Fetch epic statuses from database
  const { data: epicStatuses } = useQuery({
    queryKey: ['epic-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) {
        console.error('[EpicKanbanBoard] Failed to fetch statuses:', error);
        return null;
      }
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Realtime subscription for epic_statuses changes
  useEffect(() => {
    const channel = supabase
      .channel('epic-statuses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'epic_statuses',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['epic-statuses'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Build states from database or fallback
  const states = useMemo(() => {
    if (epicStatuses && epicStatuses.length > 0) {
      return epicStatuses.map((status: any) => ({
        id: status.value,
        label: status.label,
        color: COLOR_MAP[status.color] || status.color || '#6b7280',
      }));
    }
    return FALLBACK_STATES;
  }, [epicStatuses]);

  // Group items by state - handle items with states not in config
  const itemsByState = useMemo(() => {
    const grouped: Record<string, BacklogItem[]> = {};
    states.forEach(state => {
      grouped[state.id] = [];
    });
    
    items.forEach(item => {
      const itemState = item.state || 'proposed'; // Default to first state
      if (grouped[itemState]) {
        grouped[itemState].push(item);
      } else {
        // Put items with unknown states in first column
        const firstState = states[0]?.id || 'proposed';
        if (!grouped[firstState]) grouped[firstState] = [];
        grouped[firstState].push(item);
      }
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

  // Get first state for "Add Epic" button
  const firstStateId = states[0]?.id || 'proposed';

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div
        className="flex gap-3 flex-1 overflow-x-auto overflow-y-hidden px-4 pt-3"
        style={{
          minHeight: 0,
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {states.map((state, index) => (
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
            onAddEpic={index === 0 ? onAddEpic : undefined}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
