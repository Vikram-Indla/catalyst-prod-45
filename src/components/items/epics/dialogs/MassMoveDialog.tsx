import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface MassMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEpics: string[];
  onSuccess?: () => void;
}

export function MassMoveDialog({
  open,
  onOpenChange,
  selectedEpics,
  onSuccess,
}: MassMoveDialogProps) {
  const [targetProgram, setTargetProgram] = useState('');
  const [targetPI, setTargetPI] = useState('');
  const queryClient = useQueryClient();

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data } = await supabase.from('programs').select('*').order('name');
      return data || [];
    },
    enabled: open,
  });

  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data } = await supabase.from('program_increments').select('*').order('name');
      return data || [];
    },
    enabled: open,
  });

  const massMoveMutation = useMutation({
    mutationFn: async ({ epicIds, programId, piId }: { epicIds: string[]; programId: string; piId: string }) => {
      // Update epics with new program
      const { error: epicError } = await supabase
        .from('epics')
        .update({ primary_program_id: programId })
        .in('id', epicIds);

      if (epicError) throw epicError;

      // Update PI assignments - first delete existing, then insert new
      for (const epicId of epicIds) {
        // Delete existing PI assignments
        await supabase
          .from('epic_program_increments')
          .delete()
          .eq('epic_id', epicId);

        // Insert new PI assignment
        await supabase
          .from('epic_program_increments')
          .insert({ epic_id: epicId, pi_id: piId });
      }

      return epicIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success(`Successfully moved ${count} epic(s) to new program and PI`);
      setTargetProgram('');
      setTargetPI('');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error('Failed to move epics');
    }
  });

  const handleConfirm = () => {
    if (targetProgram && targetPI && selectedEpics.length > 0) {
      massMoveMutation.mutate({ epicIds: selectedEpics, programId: targetProgram, piId: targetPI });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mass Move Epics</DialogTitle>
          <DialogDescription>
            Move {selectedEpics.length} selected epic{selectedEpics.length !== 1 ? 's' : ''} to a different program and PI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Selected Epics</Label>
            <Badge variant="secondary" className="mt-2">
              {selectedEpics.length} epic(s) selected
            </Badge>
          </div>

          <div>
            <Label>Target Program</Label>
            <Select value={targetProgram} onValueChange={setTargetProgram}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select target program" />
              </SelectTrigger>
              <SelectContent>
                {programs?.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Target Program Increment</Label>
            <Select value={targetPI} onValueChange={setTargetPI}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select target PI" />
              </SelectTrigger>
              <SelectContent>
                {programIncrements?.map((pi) => (
                  <SelectItem key={pi.id} value={pi.id}>
                    {pi.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!targetProgram || !targetPI || massMoveMutation.isPending}
          >
            {massMoveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Moving...
              </>
            ) : (
              'Move Epics'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
