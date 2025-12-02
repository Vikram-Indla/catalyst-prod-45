import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface MoveToPIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epicId: string;
  epicName: string;
}

export function MoveToPIDialog({ open, onOpenChange, epicId, epicName }: MoveToPIDialogProps) {
  const [selectedPIs, setSelectedPIs] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: programIncrements, isLoading: loadingPIs } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: existingAssignments } = useQuery({
    queryKey: ['epic-pi-assignments', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_program_increments')
        .select('pi_id')
        .eq('epic_id', epicId);
      if (error) throw error;
      return data.map(a => a.pi_id);
    },
    enabled: open,
  });

  // Set existing assignments when loaded
  useState(() => {
    if (existingAssignments) {
      setSelectedPIs(existingAssignments);
    }
  });

  const assignMutation = useMutation({
    mutationFn: async (piIds: string[]) => {
      // First delete existing assignments
      await supabase
        .from('epic_program_increments')
        .delete()
        .eq('epic_id', epicId);

      // Then insert new ones
      if (piIds.length > 0) {
        const inserts = piIds.map(piId => ({
          epic_id: epicId,
          pi_id: piId
        }));
        
        const { error } = await supabase
          .from('epic_program_increments')
          .insert(inserts);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['epic-pi-assignments', epicId] });
      toast.success(`PI assignments updated for "${epicName}"`);
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to update PI assignments');
    }
  });

  const togglePI = (piId: string) => {
    setSelectedPIs(prev => 
      prev.includes(piId) 
        ? prev.filter(id => id !== piId)
        : [...prev, piId]
    );
  };

  const handleSave = () => {
    assignMutation.mutate(selectedPIs);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to Program Increment</DialogTitle>
          <DialogDescription>
            Assign "{epicName}" to one or more Program Increments
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {loadingPIs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : programIncrements && programIncrements.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {programIncrements.map((pi) => (
                <div key={pi.id} className="flex items-center space-x-3 p-2 rounded hover:bg-muted">
                  <Checkbox
                    id={pi.id}
                    checked={selectedPIs.includes(pi.id)}
                    onCheckedChange={() => togglePI(pi.id)}
                  />
                  <Label htmlFor={pi.id} className="flex-1 cursor-pointer">
                    <div className="font-medium">{pi.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {pi.start_date && pi.end_date 
                        ? `${new Date(pi.start_date).toLocaleDateString()} - ${new Date(pi.end_date).toLocaleDateString()}`
                        : 'No dates set'
                      }
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No Program Increments available. Create a PI first.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={assignMutation.isPending}>
            {assignMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
