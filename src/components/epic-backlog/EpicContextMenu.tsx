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
import { ExternalLink, Copy, ArrowUp, ArrowDown, MoveVertical, Calendar, Trash2, ParkingCircle } from '@/lib/atlaskit-icons';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';

interface EpicContextMenuProps {
  epicId: string;
  onRefetch: () => void;
  children: ReactNode;
}

export function EpicContextMenu({ epicId, onRefetch, children }: EpicContextMenuProps) {
  const { toast } = useToast();
  const [moveModal, setMoveModal] = useState(false);
  const [moveRankInput, setMoveRankInput] = useState('');
  const [dupModal, setDupModal] = useState(false);
  const [dupNameInput, setDupNameInput] = useState('');

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

  const duplicateMutation = useMutation({
    mutationFn: async (newName: string) => {
      // Check if name already exists
      const { data: existing, error: existErr } = await supabase
        .from('epics')
        .select('id')
        .eq('name', newName)
        .single();
      if (existErr && existErr.code !== 'PGRST116') throw existErr;

      if (existing) {
        throw new Error('Epic with this name already exists');
      }

      const { data: original, error: origErr } = await supabase
        .from('epics')
        .select('*')
        .eq('id', epicId)
        .single();
      if (origErr && origErr.code !== 'PGRST116') throw origErr;

      if (!original) throw new Error('Epic not found');
      
      const { error } = await supabase
        .from('epics')
        .insert({
          ...original,
          id: undefined,
          name: newName,
          epic_key: undefined,
          global_rank: original.global_rank + 1,
          created_at: undefined,
          updated_at: undefined,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      onRefetch();
      toast({ title: 'Epic duplicated successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: error.message === 'Epic with this name already exists' 
          ? 'Epic name already exists - please choose a different name' 
          : 'Failed to duplicate epic', 
        variant: 'destructive' 
      });
    },
  });

  const moveToTopMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('epics').update({ global_rank: -1 }).eq('id', epicId);
    },
    onSuccess: () => {
      onRefetch();
      toast({ title: 'Epic moved to top' });
    },
  });

  const moveToBottomMutation = useMutation({
    mutationFn: async () => {
      const { data: epics, error: rankErr } = await supabase.from('epics').select('global_rank').order('global_rank', { ascending: false }).limit(1);
      if (rankErr) throw rankErr;
      const maxRank = epics?.[0]?.global_rank || 0;
      await supabase.from('epics').update({ global_rank: maxRank + 1 }).eq('id', epicId);
    },
    onSuccess: () => {
      onRefetch();
      toast({ title: 'Epic moved to bottom' });
    },
  });

  const moveToPositionMutation = useMutation({
    mutationFn: async (position: number) => {
      await supabase.from('epics').update({ global_rank: position - 1 }).eq('id', epicId);
    },
    onSuccess: () => {
      onRefetch();
      toast({ title: 'Epic moved to position' });
    },
  });

  const moveToPIMutation = useMutation({
    mutationFn: async (piId: string | null) => {
      if (!piId) {
        // Remove from all PIs
        await supabase.from('epic_program_increments').delete().eq('epic_id', epicId);
      } else {
        // First check if already assigned
        const { data: existing, error: existErr } = await supabase
          .from('epic_program_increments')
          .select('*')
          .eq('epic_id', epicId)
          .eq('pi_id', piId)
          .single();
        if (existErr && existErr.code !== 'PGRST116') throw existErr;

        if (!existing) {
          await supabase.from('epic_program_increments').insert({ epic_id: epicId, pi_id: piId });
        }
      }
    },
    onSuccess: () => {
      onRefetch();
      toast({ title: 'Epic PI assignment updated' });
    },
  });

  const moveToRecycleBinMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('epics').update({ deleted_at: new Date().toISOString() }).eq('id', epicId);
    },
    onSuccess: () => {
      onRefetch();
      toast({ title: 'Epic moved to recycle bin' });
    },
  });

  const moveToParkingLotMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('epics').update({ parked_at: new Date().toISOString() }).eq('id', epicId);
    },
    onSuccess: () => {
      onRefetch();
      toast({ title: 'Epic moved to parking lot' });
    },
  });

  const handleMoveToPosition = () => {
    setMoveRankInput('');
    setMoveModal(true);
  };

  const handleMoveConfirm = () => {
    if (moveRankInput && !isNaN(Number(moveRankInput))) {
      moveToPositionMutation.mutate(Number(moveRankInput));
    }
    setMoveModal(false);
  };

  const handleDuplicate = () => {
    setDupNameInput('');
    setDupModal(true);
  };

  const handleDupConfirm = () => {
    if (dupNameInput.trim()) {
      duplicateMutation.mutate(dupNameInput.trim());
    }
    setDupModal(false);
  };

  return (
    <>
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem onClick={() => window.open(`/epics/${epicId}`, '_blank')}>
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
              Unassigned Backlog
            </ContextMenuItem>
            <ContextMenuSeparator />
            {programIncrements?.map((pi) => (
              <ContextMenuItem key={pi.id} onClick={() => moveToPIMutation.mutate(pi.id)}>
                {pi.name}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => moveToRecycleBinMutation.mutate()}>
          <Trash2 className="h-4 w-4 mr-2" />
          Move To Recycle Bin
        </ContextMenuItem>
        <ContextMenuItem onClick={() => moveToParkingLotMutation.mutate()}>
          <ParkingCircle className="h-4 w-4 mr-2" />
          Move To Parking Lot
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>

    {moveModal && (
      <ModalDialog onClose={() => setMoveModal(false)}>
        <ModalHeader hasCloseButton>
          <ModalTitle>Move to position</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Textfield
            autoFocus
            type="number"
            min={1}
            placeholder="Enter rank number"
            value={moveRankInput}
            onChange={(e) => setMoveRankInput((e.target as HTMLInputElement).value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={() => setMoveModal(false)}>Cancel</Button>
          <Button appearance="primary" onClick={handleMoveConfirm} isDisabled={!moveRankInput || isNaN(Number(moveRankInput))}>Move</Button>
        </ModalFooter>
      </ModalDialog>
    )}

    {dupModal && (
      <ModalDialog onClose={() => setDupModal(false)}>
        <ModalHeader hasCloseButton>
          <ModalTitle>Duplicate epic</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Textfield
            autoFocus
            placeholder="Enter name for duplicated epic"
            value={dupNameInput}
            onChange={(e) => setDupNameInput((e.target as HTMLInputElement).value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={() => setDupModal(false)}>Cancel</Button>
          <Button appearance="primary" onClick={handleDupConfirm} isDisabled={!dupNameInput.trim()}>Duplicate</Button>
        </ModalFooter>
      </ModalDialog>
    )}
    </>
  );
}
