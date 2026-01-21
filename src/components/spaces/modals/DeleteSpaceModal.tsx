// ════════════════════════════════════════════════════════════════════════════
// DELETE SPACE MODAL
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSpaceStore } from '@/stores/spaceStore';
import { AlertTriangle } from 'lucide-react';

interface DeleteSpaceModalProps {
  spaceName?: string;
  spaceKey?: string;
  onConfirm: () => void;
}

export function DeleteSpaceModal({ spaceName = 'this space', spaceKey, onConfirm }: DeleteSpaceModalProps) {
  const { isDeleteModalOpen, closeDeleteModal } = useSpaceStore();
  const [confirmText, setConfirmText] = useState('');
  
  const expectedText = spaceKey || 'DELETE';
  const isConfirmEnabled = confirmText === expectedText;

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
      setConfirmText('');
      closeDeleteModal();
    }
  };

  const handleClose = () => {
    setConfirmText('');
    closeDeleteModal();
  };

  return (
    <AlertDialog open={isDeleteModalOpen} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Delete {spaceName}?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            This action cannot be undone. This will permanently delete the space
            and all associated data including work items, members, and settings.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="confirm-delete">
            Type <span className="font-mono font-semibold text-destructive">{expectedText}</span> to confirm
          </Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={expectedText}
            className="font-mono"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmEnabled}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            Delete Space
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
