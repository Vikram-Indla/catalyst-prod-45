import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

/**
 * Map Kanban column IDs (7 UI statuses) → valid DB enum values.
 */
const UI_TO_DB_STATUS: Record<string, string> = {
  new: 'new_demand',
  portfolio_review: 'under_review',
  technical_validation: 'under_review',
  estimate: 'under_review',
  demand_approved: 'approved',
  under_implementation: 'in_progress',
  done: 'closed',
};

export function useKanbanDragDrop(initiatives: Initiative[]) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InitiativeStatus }) => {
      const dbStatus = UI_TO_DB_STATUS[status] || 'new_demand';
      const { error } = await supabase
        .from('ph_initiatives')
        .update({ status: dbStatus as any, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['ph-initiatives'] });
      await queryClient.cancelQueries({ queryKey: ['mdt-backlog'] });

      const prevReal = queryClient.getQueryData(['ph-initiatives']);
      const prevMdt = queryClient.getQueryData(['mdt-backlog']);

      const updater = (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((i: Initiative) =>
            i.id === id ? { ...i, status } : i
          ),
        };
      };

      queryClient.setQueryData(['ph-initiatives'], updater);
      queryClient.setQueryData(['mdt-backlog'], updater);

      return { prevReal, prevMdt };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevReal) queryClient.setQueryData(['ph-initiatives'], context.prevReal);
      if (context?.prevMdt) queryClient.setQueryData(['mdt-backlog'], context.prevMdt);
      toast.error('Failed to update status');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
    },
  });

  const onDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const onDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const initiativeId = String(active.id);
    const targetStatus = String(over.id) as InitiativeStatus;
    const initiative = initiatives.find(i => i.id === initiativeId);
    if (!initiative || initiative.status === targetStatus) return;

    mutation.mutate({ id: initiativeId, status: targetStatus });
  }, [initiatives, mutation]);

  const activeInitiative = activeId ? initiatives.find(i => i.id === activeId) : null;

  return { activeId, activeInitiative, onDragStart, onDragEnd };
}
