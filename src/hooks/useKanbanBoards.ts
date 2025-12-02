import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  KanbanBoard,
  CreateBoardInput,
  UpdateBoardInput,
  KanbanColumn,
  CreateColumnInput,
  SwimLane,
  CreateSwimLaneInput,
  KanbanCard,
  AddCardInput,
  MoveCardInput,
  BoardUser,
  BoardUserRole,
  CardType,
  BoardSettings,
  StateMapping,
} from '@/types/kanban.types';

// Fetch all boards (filtered by team/program/portfolio if provided)
export function useKanbanBoards(filters?: {
  teamId?: string;
  programId?: string;
  portfolioId?: string;
}) {
  return useQuery({
    queryKey: ['kanban-boards', filters],
    queryFn: async () => {
      let query = supabase
        .from('kanban_boards')
        .select('*')
        .order('updated_at', { ascending: false });

      if (filters?.teamId) {
        query = query.eq('team_id', filters.teamId);
      }
      if (filters?.programId) {
        query = query.eq('program_id', filters.programId);
      }
      if (filters?.portfolioId) {
        query = query.eq('portfolio_id', filters.portfolioId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(board => ({
        ...board,
        card_types: board.card_types as any as CardType[],
        settings: board.settings as any as BoardSettings,
      })) as KanbanBoard[];
    },
  });
}

// Fetch single board
export function useKanbanBoard(boardId?: string) {
  return useQuery({
    queryKey: ['kanban-board', boardId],
    queryFn: async () => {
      if (!boardId) return null;
      const { data, error } = await supabase
        .from('kanban_boards')
        .select('*')
        .eq('id', boardId)
        .single();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        card_types: data.card_types as any as CardType[],
        settings: data.settings as any as BoardSettings,
      } as KanbanBoard;
    },
    enabled: !!boardId,
  });
}

// Create board
export function useCreateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBoardInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('kanban_boards')
        .insert({
          ...input,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as Admin
      await supabase.from('kanban_board_users').insert({
        board_id: data.id,
        user_id: user.id,
        role: 'Admin',
      });

      return {
        ...data,
        card_types: data.card_types as any as CardType[],
        settings: data.settings as any as BoardSettings,
      } as KanbanBoard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-boards'] });
      toast.success('Board created successfully');
    },
    onError: (error) => {
      console.error('Error creating board:', error);
      toast.error('Failed to create board');
    },
  });
}

// Update board
export function useUpdateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateBoardInput) => {
      const { data, error } = await supabase
        .from('kanban_boards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        card_types: data.card_types as any as CardType[],
        settings: data.settings as any as BoardSettings,
      } as KanbanBoard;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kanban-boards'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-board', data.id] });
      toast.success('Board updated successfully');
    },
    onError: (error) => {
      console.error('Error updating board:', error);
      toast.error('Failed to update board');
    },
  });
}

// Delete board
export function useDeleteBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (boardId: string) => {
      const { error } = await supabase
        .from('kanban_boards')
        .delete()
        .eq('id', boardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-boards'] });
      toast.success('Board deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting board:', error);
      toast.error('Failed to delete board');
    },
  });
}

// Fetch columns for a board
export function useKanbanColumns(boardId?: string) {
  return useQuery({
    queryKey: ['kanban-columns', boardId],
    queryFn: async () => {
      if (!boardId) return [];
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('board_id', boardId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(col => ({
        ...col,
        state_mappings: col.state_mappings as any as StateMapping[],
      })) as KanbanColumn[];
    },
    enabled: !!boardId,
  });
}

// Create column
export function useCreateColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateColumnInput) => {
      const { data, error } = await supabase
        .from('kanban_columns')
        .insert({
          ...input,
          state_mappings: input.state_mappings as any,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        state_mappings: data.state_mappings as any as StateMapping[],
      } as KanbanColumn;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kanban-columns', data.board_id] });
      toast.success('Column created successfully');
    },
    onError: (error) => {
      console.error('Error creating column:', error);
      toast.error('Failed to create column');
    },
  });
}

// Update column
export function useUpdateColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateColumnInput>) => {
      const updateData = {
        ...updates,
        state_mappings: updates.state_mappings ? (updates.state_mappings as any) : undefined,
      };
      
      const { data, error } = await supabase
        .from('kanban_columns')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        state_mappings: data.state_mappings as any as StateMapping[],
      } as KanbanColumn;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kanban-columns', data.board_id] });
      toast.success('Column updated successfully');
    },
    onError: (error) => {
      console.error('Error updating column:', error);
      toast.error('Failed to update column');
    },
  });
}

// Delete column
export function useDeleteColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, boardId }: { id: string; boardId: string }) => {
      const { error } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { boardId };
    },
    onSuccess: ({ boardId }) => {
      queryClient.invalidateQueries({ queryKey: ['kanban-columns', boardId] });
      toast.success('Column deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting column:', error);
      toast.error('Failed to delete column');
    },
  });
}

// Fetch swim lanes for a board
export function useSwimLanes(boardId?: string) {
  return useQuery({
    queryKey: ['swim-lanes', boardId],
    queryFn: async () => {
      if (!boardId) return [];
      const { data, error } = await supabase
        .from('kanban_swim_lanes')
        .select('*')
        .eq('board_id', boardId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as SwimLane[];
    },
    enabled: !!boardId,
  });
}

// Create swim lane
export function useCreateSwimLane() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSwimLaneInput) => {
      const { data, error } = await supabase
        .from('kanban_swim_lanes')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as SwimLane;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['swim-lanes', data.board_id] });
      toast.success('Swim lane created successfully');
    },
    onError: (error) => {
      console.error('Error creating swim lane:', error);
      toast.error('Failed to create swim lane');
    },
  });
}

// Fetch cards for a board
export function useKanbanCards(boardId?: string) {
  return useQuery({
    queryKey: ['kanban-cards', boardId],
    queryFn: async () => {
      if (!boardId) return [];
      const { data, error } = await supabase
        .from('kanban_cards')
        .select('*')
        .eq('board_id', boardId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as KanbanCard[];
    },
    enabled: !!boardId,
  });
}

// Add card to board
export function useAddCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddCardInput) => {
      const { data, error } = await supabase
        .from('kanban_cards')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as KanbanCard;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kanban-cards', data.board_id] });
      toast.success('Card added to board');
    },
    onError: (error) => {
      console.error('Error adding card:', error);
      toast.error('Failed to add card');
    },
  });
}

// Move card
export function useMoveCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MoveCardInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: card, error: cardError } = await supabase
        .from('kanban_cards')
        .update({
          column_id: input.to_column_id,
          swim_lane_id: input.swim_lane_id,
        })
        .eq('id', input.card_id)
        .select()
        .single();

      if (cardError) throw cardError;

      // Log history
      await supabase.from('kanban_card_history').insert({
        card_id: input.card_id,
        from_column_id: card.column_id,
        to_column_id: input.to_column_id,
        moved_by: user?.id,
        wip_override_reason: input.wip_override_reason,
      });

      return card as KanbanCard;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kanban-cards', data.board_id] });
      toast.success('Card moved');
    },
    onError: (error) => {
      console.error('Error moving card:', error);
      toast.error('Failed to move card');
    },
  });
}

// Fetch board users
export function useBoardUsers(boardId?: string) {
  return useQuery({
    queryKey: ['board-users', boardId],
    queryFn: async () => {
      if (!boardId) return [];
      const { data, error } = await supabase
        .from('kanban_board_users')
        .select('*, profiles:user_id(id, full_name, email)')
        .eq('board_id', boardId);

      if (error) throw error;
      return data as (BoardUser & { profiles: any })[];
    },
    enabled: !!boardId,
  });
}

// Add board user
export function useAddBoardUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { board_id: string; user_id: string; role: BoardUserRole }) => {
      const { data, error } = await supabase
        .from('kanban_board_users')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as BoardUser;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['board-users', data.board_id] });
      toast.success('User added to board');
    },
    onError: (error) => {
      console.error('Error adding user:', error);
      toast.error('Failed to add user');
    },
  });
}
