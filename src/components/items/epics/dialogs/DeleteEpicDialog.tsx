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

interface DeleteEpicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epicId: string;
  epicName: string;
  onSuccess?: () => void;
}

export function DeleteEpicDialog({
  open,
  onOpenChange,
  epicId,
  epicName,
  onSuccess
}: DeleteEpicDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from('epics')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', epicId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Epic moved to recycle bin');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error('Failed to delete epic');
    }
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Epic</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{epicName}"? This will move the epic to the recycle bin.
            All linked Features will be disassociated from this Epic but will remain in the backlog.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
