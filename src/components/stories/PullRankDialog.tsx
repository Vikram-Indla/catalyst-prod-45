import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { RankingContext } from '@/hooks/useWorkItemRanking';

interface PullRankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: RankingContext;
  storyCount: number;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function PullRankDialog({
  open,
  onOpenChange,
  context,
  storyCount,
  onConfirm,
  isLoading = false
}: PullRankDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Pull Rank from Parent Features</DialogTitle>
          <DialogDescription>
            Inherit ranking from parent Features in {context.label} context
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This will reorder <strong>{storyCount} stories</strong> based on their parent Feature's rank.
              Stories under the same Feature will maintain their current relative order.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              <strong>How it works:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Stories are grouped by their parent Feature</li>
              <li>Groups are ordered by Feature rank</li>
              <li>Within each group, stories keep their current order</li>
              <li>Multiple stories can inherit the same Feature rank</li>
            </ul>
          </div>

          <div className="rounded-lg border border-brand-gold/20 bg-brand-gold/5 p-3 text-sm">
            <p className="font-medium text-brand-gold">Context: {context.label}</p>
            {context.contextId && (
              <p className="text-xs text-muted-foreground mt-1">
                Context ID: {context.contextId.slice(0, 8)}...
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Applying...' : 'Apply Pull Rank'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
