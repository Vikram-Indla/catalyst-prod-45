// Bulk Delete Dialog - Delete selected items with confirmation
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { BulkOperationConfig, BulkOperationSummary } from '../types';
import { BulkResultsSummary } from '../BulkResultsSummary';

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: BulkOperationConfig;
  selectedIds: string[];
  selectedItems: Array<{ id: string; title?: string; request_key?: string }>;
  onExecute: () => Promise<BulkOperationSummary>;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  config,
  selectedIds,
  selectedItems,
  onExecute,
}: BulkDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<BulkOperationSummary | null>(null);

  const confirmRequired = `DELETE ${selectedIds.length}`;
  const isConfirmed = confirmText === confirmRequired;

  const handleExecute = async () => {
    if (!isConfirmed) return;
    
    setIsExecuting(true);
    try {
      const result = await onExecute();
      setResults(result);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    setResults(null);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete {selectedIds.length} {selectedIds.length === 1 ? config.entityLabel : config.entityLabelPlural}
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The following items will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {results ? (
          <BulkResultsSummary 
            results={results} 
            entityLabel={config.entityLabel}
            onClose={handleClose}
          />
        ) : (
          <>
            {/* Items to delete */}
            <div className="my-4">
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                Items to delete:
              </Label>
              <ScrollArea className="h-32 border rounded-md p-2">
                <div className="space-y-1">
                  {selectedItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 text-sm py-1">
                      <Trash2 className="h-3 w-3 text-destructive flex-shrink-0" />
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.request_key || item.id.slice(0, 8)}
                      </span>
                      <span className="truncate">{item.title || 'Untitled'}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Confirmation input */}
            <div className="space-y-2 mb-4">
              <Label htmlFor="confirm-delete" className="text-sm">
                Type <span className="font-mono font-bold text-destructive">{confirmRequired}</span> to confirm:
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmRequired}
                className="font-mono"
              />
            </div>

            <AlertDialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose} disabled={isExecuting}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleExecute} 
                disabled={!isConfirmed || isExecuting}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'items'}
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
