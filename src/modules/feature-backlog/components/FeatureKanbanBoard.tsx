/**
 * FeatureKanbanBoard - Full Kanban board for Feature Backlog
 * Styled like Industry Kanban with DnD and real-time updates
 */
import { useMemo, useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FeatureBacklogItem } from '../types';
import { FeatureKanbanColumn } from './FeatureKanbanColumn';
import { toast } from 'sonner';

interface FeatureKanbanBoardProps {
  items: FeatureBacklogItem[];
  programId: string;
  selectedItems: string[];
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
  onAddFeature?: () => void;
}

// Feature statuses with Catalyst-approved colors
const FEATURE_STATUSES = [
  { id: 'funnel', label: 'Funnel', color: '#c8ccd0' },           // Grey (Catalyst)
  { id: 'analyzing', label: 'Analyzing', color: '#c69c6d' },     // Gold (Catalyst)
  { id: 'backlog', label: 'Backlog', color: '#5c7c5c' },         // Olive (Catalyst)
  { id: 'implementing', label: 'Implementing', color: '#f59e0b' }, // Amber (status)
  { id: 'validating', label: 'Validating', color: '#22c55e' },   // Green (status)
  { id: 'deploying', label: 'Deploying', color: '#22c55e' },     // Green (status)
  { id: 'done', label: 'Done', color: '#22c55e' },               // Green (status)
];

export function FeatureKanbanBoard({
  items,
  programId,
  selectedItems,
  onItemClick,
  onItemSelect,
  onAddFeature,
}: FeatureKanbanBoardProps) {
  const queryClient = useQueryClient();
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>([]);

  // Get unique statuses from items and merge with defaults
  const statuses = useMemo(() => {
    const itemStatuses = new Set(items.map(item => item.status).filter(Boolean));
    const allStatuses = new Set([...FEATURE_STATUSES.map(s => s.id), ...itemStatuses]);
    
    return Array.from(allStatuses).map(status => {
      const predefined = FEATURE_STATUSES.find(s => s.id === status);
      return predefined || {
        id: status!,
        label: status!.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        color: '#6b7280'
      };
    });
  }, [items]);

  // Group items by status
  const itemsByStatus = useMemo(() => {
    const grouped: Record<string, FeatureBacklogItem[]> = {};
    statuses.forEach(status => {
      grouped[status.id] = items.filter(item => item.status === status.id);
    });
    return grouped;
  }, [items, statuses]);

  // Mutation to update feature status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ itemId, newStatus }: { itemId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('features')
        .update({ 
          status: newStatus as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program', programId, 'feature-backlog'] });
      toast.success('Feature status updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceStatus = result.source.droppableId;
    const destStatus = result.destination.droppableId;

    // No change if dropped in same column
    if (sourceStatus === destStatus) return;

    const itemId = result.draggableId;
    updateStatusMutation.mutate({ itemId, newStatus: destStatus });
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
        {statuses.map(status => (
          <FeatureKanbanColumn
            key={status.id}
            columnId={status.id}
            label={status.label}
            color={status.color}
            items={itemsByStatus[status.id] || []}
            selectedItems={selectedItems}
            onItemClick={onItemClick}
            onItemSelect={onItemSelect}
            collapsed={collapsedColumns.includes(status.id)}
            onToggleCollapse={() => toggleColumnCollapse(status.id)}
            onAddFeature={status.id === 'funnel' ? onAddFeature : undefined}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
