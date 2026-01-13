// ═══════════════════════════════════════════════════════════════════════════
// DISCARD CHANGES CONFIRMATION DIALOG
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
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

interface DiscardChangesDialogProps {
  isOpen: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export const DiscardChangesDialog: React.FC<DiscardChangesDialogProps> = ({
  isOpen,
  onKeepEditing,
  onDiscard
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onKeepEditing()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved annotations. Are you sure you want to discard them?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onKeepEditing}>
            Keep Editing
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onDiscard} 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
