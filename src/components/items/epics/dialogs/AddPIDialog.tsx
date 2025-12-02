import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface AddPIDialogProps {
  epicId: string;
  currentPIs: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPIDialog({ epicId, currentPIs, open, onOpenChange }: AddPIDialogProps) {
  const [selectedPIs, setSelectedPIs] = useState<string[]>(currentPIs || []);
  const queryClient = useQueryClient();

  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete existing links
      await supabase
        .from('epic_program_increments')
        .delete()
        .eq('epic_id', epicId);

      // Insert new links
      if (selectedPIs.length > 0) {
        const inserts = selectedPIs.map((piId, index) => ({
          epic_id: epicId,
          pi_id: piId,
          pi_rank: index + 1,
        }));

        const { error } = await supabase
          .from('epic_program_increments')
          .insert(inserts);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic', epicId] });
      queryClient.invalidateQueries({ queryKey: ['epic-pis', epicId] });
      toast.success('Program Increments updated');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to update Program Increments');
    },
  });

  const togglePI = (piId: string) => {
    setSelectedPIs((prev) =>
      prev.includes(piId) ? prev.filter((id) => id !== piId) : [...prev, piId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Program Increments</DialogTitle>
          <DialogDescription>
            Select the Program Increments for this epic
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[300px] border rounded-md p-4">
          <div className="space-y-3">
            {programIncrements?.map((pi) => (
              <div key={pi.id} className="flex items-center space-x-3">
                <Checkbox
                  id={pi.id}
                  checked={selectedPIs.includes(pi.id)}
                  onCheckedChange={() => togglePI(pi.id)}
                />
              <Label htmlFor={pi.id} className="flex-1 cursor-pointer">
                  <div className="font-medium">{pi.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {pi.start_date} - {pi.end_date}
                  </div>
                </Label>
              </div>
            ))}
            {(!programIncrements || programIncrements.length === 0) && (
              <div className="text-center text-muted-foreground py-4">
                No Program Increments available
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
