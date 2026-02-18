import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

export function useKanbanDragDrop(initiatives: Initiative[]) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InitiativeStatus }) => {
      const { error } = await supabase
        .from('ph_initiatives')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['ph-initiatives'] });
      await queryClient.cancelQueries({ queryKey: ['ph-initiatives-mock'] });

      const prevReal = queryClient.getQueryData(['ph-initiatives']);
      const prevMock = queryClient.getQueryData(['ph-initiatives-mock']);

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
      queryClient.setQueryData(['ph-initiatives-mock'], updater);

      return { prevReal, prevMock };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevReal) queryClient.setQueryData(['ph-initiatives'], context.prevReal);
      if (context?.prevMock) queryClient.setQueryData(['ph-initiatives-mock'], context.prevMock);
      toast.error('Failed to update status');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives-mock'] });
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
