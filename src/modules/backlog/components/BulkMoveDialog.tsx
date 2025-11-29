import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoveRight } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BulkMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: string[];
  itemType: string;
  onComplete: () => void;
}

export function BulkMoveDialog({
  open,
  onOpenChange,
  selectedItems,
  itemType,
  onComplete,
}: BulkMoveDialogProps) {
  const [selectedPiId, setSelectedPiId] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch available PIs
  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('id, name, start_date')
        .order('start_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });

  const moveMutation = useMutation({
    mutationFn: async (piId: string) => {
      const tableName = itemType === 'epic' ? 'epics' : 'features';
      
      // For epics, use the join table
      if (itemType === 'epic') {
        // First remove existing assignments
        await supabase
          .from('epic_program_increments')
          .delete()
          .in('epic_id', selectedItems);

        // Then add new assignments
        const assignments = selectedItems.map(epicId => ({
          epic_id: epicId,
          pi_id: piId,
        }));

        const { error } = await supabase
          .from('epic_program_increments')
          .insert(assignments);

        if (error) throw error;
      } else {
        // For features, direct update
        const { error } = await supabase
          .from(tableName)
          .update({ pi_id: piId })
          .in('id', selectedItems);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success(`Moved ${selectedItems.length} item(s) to PI`);
      onComplete();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Move failed: ${error.message}`);
    },
  });

  const handleMove = () => {
    if (selectedPiId) {
      moveMutation.mutate(selectedPiId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move to Program Increment</DialogTitle>
          <DialogDescription>
            Move {selectedItems.length} selected item(s) to a Program Increment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Program Increment</Label>
            <Select value={selectedPiId} onValueChange={setSelectedPiId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose PI..." />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {programIncrements?.map((pi) => (
                  <SelectItem key={pi.id} value={pi.id}>
                    {pi.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Items to move:</p>
            <p className="text-muted-foreground">
              {selectedItems.length} {itemType}(s) selected
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={moveMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleMove} 
            disabled={!selectedPiId || moveMutation.isPending}
          >
            {moveMutation.isPending ? (
              <>Moving...</>
            ) : (
              <>
                <MoveRight className="h-4 w-4 mr-2" />
                Move to PI
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
