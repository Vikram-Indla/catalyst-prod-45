// ════════════════════════════════════════════════════════════════════════════
// ARCHIVE SPACE MODAL
// ════════════════════════════════════════════════════════════════════════════

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
import { useSpaceStore } from '@/stores/spaceStore';
import { Archive } from 'lucide-react';

interface ArchiveSpaceModalProps {
  spaceName?: string;
  onConfirm: () => void;
}

export function ArchiveSpaceModal({ spaceName = 'this space', onConfirm }: ArchiveSpaceModalProps) {
  const { isArchiveModalOpen, closeArchiveModal } = useSpaceStore();

  const handleConfirm = () => {
    onConfirm();
    closeArchiveModal();
  };

  return (
    <AlertDialog open={isArchiveModalOpen} onOpenChange={closeArchiveModal}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
              <Archive className="h-5 w-5 text-warning" />
            </div>
            <AlertDialogTitle>Archive {spaceName}?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            Archiving this space will hide it from the main directory and prevent
            new work items from being created. Existing data will be preserved
            and the space can be restored at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            Archive Space
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
