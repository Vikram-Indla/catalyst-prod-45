/**
 * FeatureKanbanBoard - Full Kanban board for Feature Backlog
 * Dynamically fetches statuses from feature_statuses table with real-time sync
 */
import { useMemo, useState, useEffect } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

// Catalyst-approved color mapping from semantic color names
const COLOR_MAP: Record<string, string> = {
  // Status colors
  info: '#c8ccd0',      // Grey
  warning: '#f59e0b',   // Amber  
  success: '#0d9488',   // Teal
  danger: '#ef4444',    // Red
  forest: '#0d9488',    // Teal (done)
  // Catalyst brand colors
  blue: '#2563eb',
  teal: '#0d9488',
  olive: '#5c7c5c',
  bronze: '#8b7355',
  grey: '#c8ccd0',
  // Fallbacks
  default: '#c8ccd0',
};

// Fallback statuses if DB fetch fails
const FALLBACK_STATUSES = [
  { id: 'funnel', label: 'Funnel', color: '#c8ccd0' },
  { id: 'analyzing', label: 'Analyzing', color: '#2563eb' },
  { id: 'backlog', label: 'Backlog', color: '#5c7c5c' },
  { id: 'implementing', label: 'Implementing', color: '#f59e0b' },
  { id: 'done', label: 'Done', color: '#0d9488' },
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

  // Fetch feature statuses from database
  const { data: dbStatuses, isLoading: statusesLoading } = useQuery({
    queryKey: ['feature-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Real-time subscription for feature_statuses changes
  useEffect(() => {
    const channel = supabase
      .channel('feature-statuses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_statuses',
        },
        () => {
          // Invalidate query to refetch statuses when admin changes them
          queryClient.invalidateQueries({ queryKey: ['feature-statuses'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Map DB statuses to kanban format with Catalyst colors
  const statuses = useMemo(() => {
    if (!dbStatuses || dbStatuses.length === 0) {
      return FALLBACK_STATUSES;
    }

    return dbStatuses.map(status => ({
      id: status.value,
      label: status.label,
      color: COLOR_MAP[status.color] || COLOR_MAP.default,
    }));
  }, [dbStatuses]);

  // Group items by status
  const itemsByStatus = useMemo(() => {
    const grouped: Record<string, FeatureBacklogItem[]> = {};
    statuses.forEach(status => {
      grouped[status.id] = items.filter(item => item.status === status.id);
    });
    
    // Handle items with statuses not in current config (place in first column)
    const knownStatuses = new Set(statuses.map(s => s.id));
    const orphanedItems = items.filter(item => item.status && !knownStatuses.has(item.status));
    if (orphanedItems.length > 0 && statuses.length > 0) {
      grouped[statuses[0].id] = [...(grouped[statuses[0].id] || []), ...orphanedItems];
    }
    
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

  if (statusesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div
        className="flex gap-3 flex-1 overflow-x-auto overflow-y-hidden px-4 pt-3"
        style={{
          minHeight: 0,
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {statuses.map((status, index) => (
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
            onAddFeature={index === 0 ? onAddFeature : undefined}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
