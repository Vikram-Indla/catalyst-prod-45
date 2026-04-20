import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Lozenge } from '@/components/ads';
import { AlertTriangle, History, Trash2 } from 'lucide-react';

interface QualityGate {
  id: string;
  name: string;
  description?: string;
  type: string;
  category: string;
}

interface DeleteGateConfirmationDialogProps {
  open: boolean;
  gate: QualityGate | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DeleteGateConfirmationDialog({ 
  open, 
  gate, 
  onOpenChange, 
  onConfirm 
}: DeleteGateConfirmationDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Mock evaluation count
  const evaluationCount = Math.floor(Math.random() * 50) + 10;
  
  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-destructive/10 rounded-full">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            Delete Quality Gate
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-700">Warning</p>
                  <p className="text-amber-600 mt-1">
                    Deleting this gate will remove all evaluation history. This action cannot be undone.
                  </p>
                </div>
              </div>
              
              {gate && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{gate.name}</span>
                    <span className="capitalize">
                      <Lozenge appearance="default">{gate.category}</Lozenge>
                    </span>
                  </div>
                  
                  {gate.description && (
                    <p className="text-sm text-muted-foreground">{gate.description}</p>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                    <History className="w-4 h-4" />
                    <span>{evaluationCount} evaluations will be deleted</span>
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Gate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
