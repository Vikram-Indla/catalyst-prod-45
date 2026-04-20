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
import { useLinkedTickets, useReassignTickets, useDeleteProcessStep } from '@/hooks/useDeleteProcessStep';
import { DemandProcessStep } from '@/hooks/useDemandProcessSteps';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lozenge } from '@/components/ads';

interface DeleteProcessStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: DemandProcessStep | null;
  allSteps: DemandProcessStep[];
}

export function DeleteProcessStepDialog({
  open,
  onOpenChange,
  step,
  allSteps,
}: DeleteProcessStepDialogProps) {
  const [newProcessStep, setNewProcessStep] = useState<string>('');
  
  const { data: linkedData, isLoading: isLoadingTickets, refetch } = useLinkedTickets(step?.value || null);
  const reassignMutation = useReassignTickets();
  const deleteMutation = useDeleteProcessStep();

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setNewProcessStep('');
    }
  }, [open]);

  // Available steps for reassignment (excluding the one being deleted)
  const availableSteps = allSteps.filter(s => s.id !== step?.id && s.is_active);

  const hasLinkedTickets = (linkedData?.count || 0) > 0;
  const canDelete = !hasLinkedTickets;

  const handleReassign = async () => {
    if (!step || !newProcessStep) return;
    
    await reassignMutation.mutateAsync({
      fromProcessStep: step.value,
      toProcessStep: newProcessStep,
    });
    
    // Refresh linked tickets count
    refetch();
  };

  const handleDelete = async () => {
    if (!step || hasLinkedTickets) return;
    
    await deleteMutation.mutateAsync(step.id);
    onOpenChange(false);
  };

  if (!step) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Process Step
          </DialogTitle>
          <DialogDescription>
            You are about to delete the process step: <strong>{step.label}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoadingTickets ? (
            <div className="text-center text-muted-foreground py-4">
              Checking for linked tickets...
            </div>
          ) : hasLinkedTickets ? (
            <>
              {/* Warning message */}
              <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">
                    Cannot delete this process step
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    There are <strong>{linkedData?.count}</strong> ticket(s) currently using this status. 
                    You must reassign them to a different process step before deleting.
                  </p>
                </div>
              </div>

              {/* Linked tickets list */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Linked Tickets ({linkedData?.count})
                </Label>
                <ScrollArea className="h-32 border rounded-md p-2">
                  <div className="space-y-1">
                    {linkedData?.tickets.map((ticket) => (
                      <div 
                        key={ticket.id} 
                        className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted/50"
                      >
                        <Lozenge appearance="default">
                          {ticket.request_key || 'N/A'}
                        </Lozenge>
                        <span className="truncate text-muted-foreground">
                          {ticket.title}
                        </span>
                      </div>
                    ))}
                    {(linkedData?.count || 0) > 50 && (
                      <p className="text-xs text-muted-foreground italic pt-2">
                        ... and {(linkedData?.count || 0) - 50} more tickets
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Reassign section */}
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="new-process-step" className="text-sm font-medium">
                  Reassign all tickets to:
                </Label>
                <div className="flex gap-2">
                  <Select value={newProcessStep} onValueChange={setNewProcessStep}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select new process step..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSteps.map((s) => (
                        <SelectItem key={s.id} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="secondary" 
                    onClick={handleReassign}
                    disabled={!newProcessStep || reassignMutation.isPending}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${reassignMutation.isPending ? 'animate-spin' : ''}`} />
                    Reassign
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This will update all {linkedData?.count} ticket(s) to use the selected process step.
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
                  No tickets are using this process step. You can proceed with deletion.
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
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Process Step'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
