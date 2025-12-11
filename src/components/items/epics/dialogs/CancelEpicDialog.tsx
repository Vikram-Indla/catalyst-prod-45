import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface CancelEpicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epicId: string;
  epicName: string;
  onSuccess?: () => void;
}

export function CancelEpicDialog({
  open,
  onOpenChange,
  epicId,
  epicName,
  onSuccess
}: CancelEpicDialogProps) {
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: async () => {
      // Set deleted_at to mark as cancelled (soft delete approach)
      const { error } = await supabase
        .from('epics')
        .update({ 
          deleted_at: new Date().toISOString()
        })
        .eq('id', epicId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      queryClient.invalidateQueries({ queryKey: ['epic', epicId] });
      toast.success('Epic cancelled');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error('Failed to cancel epic');
    }
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Epic</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel "{epicName}"? 
            All linked Features will be disassociated from this Epic but will remain in the backlog.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No, keep it</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => cancelMutation.mutate()}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Yes, cancel epic'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
