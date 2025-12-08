import { AlertTriangle } from 'lucide-react';

interface DeleteSkillDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  skillName: string;
  teamMemberName: string;
  isDeleting: boolean;
}

export function DeleteSkillDialog({
  open,
  onClose,
  onConfirm,
  skillName,
  teamMemberName,
  isDeleting
}: DeleteSkillDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <div className="bg-card rounded-lg w-full max-w-md border border-brand-gold-border p-6 shadow-xl">
        {/* Warning Icon */}
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-foreground text-center mb-3">
          Delete Skill Assessment
        </h3>
        <p className="text-muted-foreground text-center mb-6">
          Are you sure you want to remove <span className="text-foreground font-medium">{skillName}</span> from{' '}
          <span className="text-foreground font-medium">{teamMemberName}</span>? This action cannot be undone.
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 border border-brand-gold-border rounded-lg text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 bg-destructive hover:bg-destructive/90 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
