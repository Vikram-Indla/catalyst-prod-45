// Delete Risk Confirmation Dialog
// Source: Implementation Spec Section 5

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteRiskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  riskTitle: string;
}

export function DeleteRiskDialog({
  isOpen,
  onClose,
  onConfirm,
  riskTitle,
}: DeleteRiskDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Risk</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{riskTitle}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90 text-white"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
