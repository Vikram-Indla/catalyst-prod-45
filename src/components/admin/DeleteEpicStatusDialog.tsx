import { useState, useEffect } from 'react';
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
import { AlertTriangle, Trash2, RefreshCw } from 'lucide-react';
import { useLinkedEpics, useReassignEpics, useDeleteEpicStatus, EpicStatus } from '@/hooks/useEpicStatuses';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lozenge } from '@/components/ads';

interface DeleteEpicStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: EpicStatus | null;
  allStatuses: EpicStatus[];
}

export function DeleteEpicStatusDialog({
  open,
  onOpenChange,
  status,
  allStatuses,
}: DeleteEpicStatusDialogProps) {
  const [newStatus, setNewStatus] = useState<string>('');
  
  const { data: linkedData, isLoading: isLoadingEpics, refetch } = useLinkedEpics(status?.value || null);
  const reassignMutation = useReassignEpics();
  const deleteMutation = useDeleteEpicStatus();

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setNewStatus('');
    }
  }, [open]);

  // Available statuses for reassignment (excluding the one being deleted)
  const availableStatuses = allStatuses.filter(s => s.id !== status?.id && s.is_active);

  const hasLinkedEpics = (linkedData?.count || 0) > 0;
  const canDelete = !hasLinkedEpics;

  const handleReassign = async () => {
    if (!status || !newStatus) return;
    
    await reassignMutation.mutateAsync({
      fromStatus: status.value,
      toStatus: newStatus,
    });
    
    // Refresh linked epics count
    refetch();
  };

  const handleDelete = async () => {
    if (!status || hasLinkedEpics) return;
    
    await deleteMutation.mutateAsync(status.id);
    onOpenChange(false);
  };

  if (!status) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Epic Status
          </DialogTitle>
          <DialogDescription>
            You are about to delete the status: <strong>{status.label}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoadingEpics ? (
            <div className="text-center text-muted-foreground py-4">
              Checking for linked epics...
            </div>
          ) : hasLinkedEpics ? (
            <>
              {/* Warning message */}
              <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">
                    Cannot delete this status
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    There are <strong>{linkedData?.count}</strong> epic(s) currently using this status. 
                    You must reassign them to a different status before deleting.
                  </p>
                </div>
              </div>

              {/* Linked epics list */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Linked Epics ({linkedData?.count})
                </Label>
                <ScrollArea className="h-32 border rounded-md p-2">
                  <div className="space-y-1">
                    {linkedData?.epics.map((epic) => (
                      <div 
                        key={epic.id} 
                        className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted/50"
                      >
                        <Lozenge appearance="default">
                          {epic.epic_key || 'N/A'}
                        </Lozenge>
                        <span className="truncate text-muted-foreground">
                          {epic.title}
                        </span>
                      </div>
                    ))}
                    {(linkedData?.count || 0) > 50 && (
                      <p className="text-xs text-muted-foreground italic pt-2">
                        ... and {(linkedData?.count || 0) - 50} more epics
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Reassign section */}
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="new-status" className="text-sm font-medium">
                  Reassign all epics to:
                </Label>
                <div className="flex gap-2">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select new status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatuses.map((s) => (
                        <SelectItem key={s.id} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="secondary" 
                    onClick={handleReassign}
                    disabled={!newStatus || reassignMutation.isPending}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${reassignMutation.isPending ? 'animate-spin' : ''}`} />
                    Reassign
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This will update all {linkedData?.count} epic(s) to use the selected status.
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white text-xs">✓</span>
              </div>
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">
                  Safe to delete
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  No epics are using this status. You can proceed with deletion.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={!canDelete || deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
