import React, { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeleteDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftKey: string;
  onConfirm: () => Promise<void>;
  isPending: boolean;
}

export function DeleteDraftModal({
  open,
  onOpenChange,
  draftKey,
  onConfirm,
  isPending,
}: DeleteDraftModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  // Reset acknowledgment when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setAcknowledged(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!acknowledged) return;
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-[hsl(var(--danger))]" />
            Delete draft {draftKey}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            This will remove the draft from active lists. Audit logs are retained.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="audit-acknowledgment"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
              disabled={isPending}
            />
            <Label
              htmlFor="audit-acknowledgment"
              className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
            >
              I understand this action is recorded for audit.
            </Label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!acknowledged || isPending}
            className={cn(
              "bg-[hsl(var(--danger))] text-white hover:bg-[hsl(var(--danger))]/90",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteDraftModal;
