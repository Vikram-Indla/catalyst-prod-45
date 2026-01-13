// ═══════════════════════════════════════════════════════════════════════════
// DELETE CONFIRM DIALOG COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({ 
  isOpen, 
  fileName, 
  onConfirm, 
  onCancel 
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl p-6 max-w-md w-full shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-destructive/10 rounded-full">
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Delete Evidence</h3>
        </div>
        
        <p className="text-muted-foreground mb-2">
          Are you sure you want to delete this evidence?
        </p>
        <p className="text-sm text-muted-foreground/70 mb-6 font-mono bg-muted px-2 py-1 rounded">
          {fileName}
        </p>
        
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};
