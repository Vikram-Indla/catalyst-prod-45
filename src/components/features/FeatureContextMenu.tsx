import { ReactNode, useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ExternalLink, Copy, ArrowUp, ArrowDown, MoveVertical, Calendar, Trash2 } from '@/lib/atlaskit-icons';
import { ConfirmDeleteDialog } from '@/components/catalyst-detail-views/shared/ConfirmDeleteDialog';

interface FeatureContextMenuProps {
  featureId: string;
  onRefetch: () => void;
  children: ReactNode;
}

export function FeatureContextMenu({ featureId, onRefetch, children }: FeatureContextMenuProps) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch PIs for Move to PI submenu
  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .order('start_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch iterations for Move to Iteration submenu
  const { data: iterations } = useQuery({
    queryKey: ['iterations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('iterations')
        .select('*')
        .order('start_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (newName: string) => {
      const { data: existing, error: existErr } = await supabase
        .from('features')
        .select('id')
        .eq('name', newName)
        .single();
      if (existErr && existErr.code !== 'PGRST116') throw existErr;

      if (existing) {
        throw new Error('Feature with this name already exists');
      }

      const { data: original, error: origErr } = await supabase
        .from('features')
        .select('*')
        .eq('id', featureId)
        .single();
      if (origErr && origErr.code !== 'PGRST116') throw origErr;

      if (!original) throw new Error('Feature not found');
      
      const { error } = await supabase
        .from('features')
        .insert({
          ...original,
          id: undefined,
          name: newName,
          display_id: undefined,
          rank_within_epic: original.rank_within_epic + 1,
          created_at: undefined,
          updated_at: undefined,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      onRefetch();
      toast({ title: 'Feature duplicated successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: error.message === 'Feature with this name already exists' 
          ? 'Feature name already exists - please choose a different name' 
          : 'Failed to duplicate feature', 
        variant: 'destructive' 
      });
    },
  });

  const moveToTopMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('features').update({ rank_within_epic: -1 }).eq('id', featureId);
    },
    onSuccess: () => {
      onRefetch();
      toast({ title: 'Feature moved to top' });
    },
  });

  const moveToBottomMutation = useMutation({
    mutationFn: async () => {
      const { data: features, error: rankErr } = await supabase.from('features').select('rank_within_epic').order('rank_within_epic', { ascending: false }).limit(1);
      if (rankErr) throw rankErr;
      const maxRank = features?.[0]?.rank_within_epic || 0;
      await supabase.from('features').update({ rank_within_epic: maxRank + 1 }).eq('id', featureId);
    },
    onSuccess: () => {
      onRefetch();
      toast({ title: 'Feature moved to bottom' });
    },
  });

  const moveToPositionMutation = useMutation({
    mutationFn: async (position: number) => {
      await supabase.from('features').update({ rank_within_epic: position - 1 }).eq('id', featureId);
    },
    onSuccess: () => {
      onRefetch();
      toast({ title: 'Feature moved to position' });
    },
  });

  const moveToPIMutation = useMutation({
    mutationFn: async (piId: string | null) => {
      await supabase.from('features').update({ pi_id: piId }).eq('id', featureId);
    },
    onSuccess: () => {
      onRefetch();
      toast({ title: 'Feature PI assignment updated' });
    },
  });

  const moveToIterationMutation = useMutation({
    mutationFn: async (iterationId: string | null) => {
      await supabase.from('features').update({ iteration_id: iterationId }).eq('id', featureId);
    },
    onSuccess: () => {
      onRefetch();
      toast({ title: 'Feature iteration assignment updated' });
    },
  });

  const deleteFeatureMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('features').delete().eq('id', featureId);
    },
    onSuccess: () => {
      onRefetch();
      toast({ title: 'Feature deleted' });
    },
  });

  const handleMoveToPosition = () => {
    const position = prompt('Enter position (rank number):');
    if (position && !isNaN(Number(position))) {
      moveToPositionMutation.mutate(Number(position));
    }
  };

  const handleDuplicate = () => {
    const newName = prompt('Enter name for duplicated feature:', '');
    if (newName && newName.trim()) {
      duplicateMutation.mutate(newName.trim());
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  return (
    <>
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem onClick={() => window.open(`/features/${featureId}`, '_blank')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open in new tab
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => moveToTopMutation.mutate()}>
          <ArrowUp className="h-4 w-4 mr-2" />
          Move To Top
        </ContextMenuItem>
        <ContextMenuItem onClick={() => moveToBottomMutation.mutate()}>
          <ArrowDown className="h-4 w-4 mr-2" />
          Move To Bottom
        </ContextMenuItem>
        <ContextMenuItem onClick={handleMoveToPosition}>
          <MoveVertical className="h-4 w-4 mr-2" />
          Move To Position...
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Calendar className="h-4 w-4 mr-2" />
            Move To Program Increment
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={() => moveToPIMutation.mutate(null)}>
              Unassigned
            </ContextMenuItem>
            <ContextMenuSeparator />
            {programIncrements?.map((pi) => (
              <ContextMenuItem key={pi.id} onClick={() => moveToPIMutation.mutate(pi.id)}>
                {pi.name}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Calendar className="h-4 w-4 mr-2" />
            Move To Iteration
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={() => moveToIterationMutation.mutate(null)}>
              Unassigned
            </ContextMenuItem>
            <ContextMenuSeparator />
            {iterations?.map((iteration) => (
              <ContextMenuItem key={iteration.id} onClick={() => moveToIterationMutation.mutate(iteration.id)}>
                {iteration.name}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>

    {showDeleteDialog && (
      <ConfirmDeleteDialog
        isOpen
        onClose={() => setShowDeleteDialog(false)}
        issueKey=""
        issueSummary="this feature"
        typeLabel="feature"
        onConfirm={() => { deleteFeatureMutation.mutate(); setShowDeleteDialog(false); }}
      />
    )}
    </>
  );
}
