/**
 * DeleteIncidentDialog — Confirmation dialog for incident deletion
 */

import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/catalyst-toast';

interface DeleteIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentId: string;
  incidentKey: string;
}

export function DeleteIncidentDialog({
  open,
  onOpenChange,
  incidentId,
  incidentKey,
}: DeleteIncidentDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Soft delete via RPC (avoids RLS edge cases)
      const { error } = await supabase.rpc('soft_delete_incident', {
        p_incident_id: incidentId,
      });

      if (error) throw error;

      toast.success(`Incident ${incidentKey} deleted`, {
        description: 'The incident has been removed from the list.',
      });

      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['open-incident-count'] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Failed to delete incident', {
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <AlertDialogTitle className="text-lg">Delete {incidentKey}?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            This action cannot be undone. The incident will be permanently removed from the system
            along with all associated comments, attachments, and history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel asChild>
            <Button variant="outline" size="sm" className="h-9">
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              size="sm"
              className="h-9"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {isDeleting ? 'Deleting...' : 'Delete Incident'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
