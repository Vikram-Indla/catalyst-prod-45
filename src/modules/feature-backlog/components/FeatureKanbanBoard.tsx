/**
 * FeatureKanbanBoard - Full Kanban board for Feature Backlog.
 *
 * Phase 9: DnD engine migrated from @hello-pangea/dnd → Atlaskit Pragmatic
 * drag-and-drop. Dynamically fetches statuses from feature_statuses table
 * with real-time sync. Column collapse + selection + per-column Add button
 * all preserved from the legacy surface.
 */
import { useEffect, useMemo, useState } from 'react';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FeatureBacklogItem } from '../types';
import { FeatureKanbanColumn } from './FeatureKanbanColumn';
import { catalystToast } from '@/lib/catalystToast';

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
  info: 'var(--ds-border, #DFE1E6)',      // Grey
  warning: 'var(--ds-text-warning, #f59e0b)',   // Amber
  success: 'var(--ds-chart-teal-bold, #0d9488)',   // Teal
  danger: 'var(--ds-text-danger, #ef4444)',    // Red
  forest: 'var(--ds-chart-teal-bold, #0d9488)',    // Teal (done)
  // Catalyst brand colors
  blue: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))',
  teal: 'var(--ds-chart-teal-bold, #0d9488)',
  olive: 'var(--ds-chart-teal-bold, #0d9488)',     // Changed to teal
  bronze: 'var(--ds-text-subtlest, #626F86)',    // Changed to gray
  grey: 'var(--ds-border, #DFE1E6)',
  // Fallbacks
  default: 'var(--ds-border, #DFE1E6)',
};

// Fallback statuses if DB fetch fails
const FALLBACK_STATUSES = [
  { id: 'funnel', label: 'Funnel', color: 'var(--ds-border, #DFE1E6)' },
  { id: 'analyzing', label: 'Analyzing', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))' },
  { id: 'backlog', label: 'Backlog', color: 'var(--ds-chart-teal-bold, #0d9488)' },
  { id: 'implementing', label: 'Implementing', color: 'var(--ds-text-warning, #f59e0b)' },
  { id: 'done', label: 'Done', color: 'var(--ds-chart-teal-bold, #0d9488)' },
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
      .channel(`feature-statuses-realtime`)
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program', programId, 'feature-backlog'] });
      catalystToast.success('Feature status updated');
    },
    onError: (error: any) => {
      catalystToast.error(`Failed to update status: ${error.message}`);
    },
  });

  /* ═════ Pragmatic DnD board-scope monitor — reconciles every drop. ═════ */
  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => source.data.type === 'card',
      onDrop: ({ source, location }) => {
        const destColumn = location.current.dropTargets.find(
          (t) => t.data.type === 'column',
        );
        if (!destColumn) return;
        const fromColumn = source.data.fromColumn as string | undefined;
        const toColumn = destColumn.data.columnId as string;
        const cardId = source.data.cardId as string;
        // No-op if dropped back into the same column.
        if (!toColumn || !cardId || fromColumn === toColumn) return;
        updateStatusMutation.mutate({ itemId: cardId, newStatus: toColumn });
      },
    });
  }, [updateStatusMutation]);

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
  );
}
