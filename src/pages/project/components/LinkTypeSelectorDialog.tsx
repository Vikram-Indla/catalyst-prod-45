/**
 * LinkTypeSelectorDialog - Step 1: Choose link type (Dependency or Risk)
 */

import { Link2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LinkTypeSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDependency: () => void;
  onSelectRisk: () => void;
  risksAvailable?: boolean;
}

export function LinkTypeSelectorDialog({
  open,
  onOpenChange,
  onSelectDependency,
  onSelectRisk,
  risksAvailable = true,
}: LinkTypeSelectorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Add link</DialogTitle>
          <DialogDescription>What type of link?</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 mt-2">
          <button
            type="button"
            className="flex items-center gap-3 p-3 rounded-md border border-border bg-background hover:bg-accent transition-colors text-left"
            onClick={() => {
              onOpenChange(false);
              onSelectDependency();
            }}
          >
            <div className="flex items-center justify-center w-9 h-9 rounded bg-primary/10 text-primary">
              <Link2 size={18} />
            </div>
            <div>
              <div className="font-medium text-foreground">Dependency</div>
              <div className="text-xs text-muted-foreground">Link to another feature or work item</div>
            </div>
          </button>

          <button
            type="button"
            className="flex items-center gap-3 p-3 rounded-md border border-border bg-background hover:bg-accent transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              if (risksAvailable) {
                onOpenChange(false);
                onSelectRisk();
              }
            }}
            disabled={!risksAvailable}
            title={!risksAvailable ? 'Risk linking coming soon' : undefined}
          >
            <div className="flex items-center justify-center w-9 h-9 rounded bg-destructive/10 text-destructive">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="font-medium text-foreground">Risk</div>
              <div className="text-xs text-muted-foreground">
                {risksAvailable ? 'Link to an existing risk' : 'Risk linking coming soon'}
              </div>
            </div>
          </button>
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
