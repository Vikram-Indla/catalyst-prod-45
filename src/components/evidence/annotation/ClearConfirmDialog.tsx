// ═══════════════════════════════════════════════════════════════════════════
// CLEAR ALL CONFIRMATION DIALOG
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

interface ClearConfirmDialogProps {
  isOpen: boolean;
  annotationCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ClearConfirmDialog: React.FC<ClearConfirmDialogProps> = ({
  isOpen,
  annotationCount,
  onCancel,
  onConfirm
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear all annotations?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove {annotationCount} annotation{annotationCount !== 1 ? 's' : ''}. 
            This action can be undone with Ctrl+Z.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Clear All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
