import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApplyWSJFToRankEpics } from '@/hooks/useApplyWSJFToRank';
import { Loader2 } from 'lucide-react';

interface ApplyWSJFToRankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  piId?: string;
}

export function ApplyWSJFToRankDialog({ open, onOpenChange, onSuccess, piId }: ApplyWSJFToRankDialogProps) {
  const applyWSJFMutation = useApplyWSJFToRankEpics(piId);

  const handleApply = () => {
    applyWSJFMutation.mutate(undefined, {
      onSuccess: () => {
        onOpenChange(false);
        onSuccess();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply WSJF to Rank</DialogTitle>
          <DialogDescription>
            This will reorder all epics based on their WSJF (Weighted Shortest Job First) scores.
            Epics with higher WSJF scores will be ranked first.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Only epics with WSJF scores will be reordered. The global rank will be updated for each epic.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={applyWSJFMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={applyWSJFMutation.isPending}
          >
            {applyWSJFMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply WSJF to Rank
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}