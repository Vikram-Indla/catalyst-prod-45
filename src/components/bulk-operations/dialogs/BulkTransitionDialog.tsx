// Bulk Transition Dialog - Change workflow status for selected items
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowRight } from 'lucide-react';
import { BulkOperationConfig, BulkOperationSummary } from '../types';
import { BulkResultsSummary } from '../BulkResultsSummary';

interface BulkTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: BulkOperationConfig;
  selectedIds: string[];
  selectedItems: Array<{ id: string; title?: string; request_key?: string; process_step?: string }>;
  onExecute: (targetStatus: string, comment?: string) => Promise<BulkOperationSummary>;
}

export function BulkTransitionDialog({
  open,
  onOpenChange,
  config,
  selectedIds,
  selectedItems,
  onExecute,
}: BulkTransitionDialogProps) {
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [comment, setComment] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<BulkOperationSummary | null>(null);

  const handleExecute = async () => {
    if (!targetStatus) return;
    
    setIsExecuting(true);
    try {
      const result = await onExecute(targetStatus, comment || undefined);
      setResults(result);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClose = () => {
    setTargetStatus('');
    setComment('');
    setResults(null);
    onOpenChange(false);
  };

  // Group items by current status
  const statusGroups = selectedItems.reduce((acc, item) => {
    const status = item.process_step || 'Unknown';
    if (!acc[status]) acc[status] = [];
    acc[status].push(item);
    return acc;
  }, {} as Record<string, typeof selectedItems>);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Status Transition</DialogTitle>
          <DialogDescription>
            Change the workflow status for {selectedIds.length} selected {selectedIds.length === 1 ? config.entityLabel.toLowerCase() : config.entityLabelPlural.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <BulkResultsSummary 
            results={results} 
            entityLabel={config.entityLabel}
            onClose={handleClose}
          />
        ) : (
          <>
            <div className="space-y-4 py-4">
              {/* Current status summary */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <Label className="text-sm font-medium text-muted-foreground">Current Status Distribution</Label>
                <div className="mt-2 space-y-1">
                  {Object.entries(statusGroups).map(([status, items]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground">{items.length} items</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target status */}
              <div className="space-y-2">
                <Label htmlFor="target-status">Target Status</Label>
                <Select value={targetStatus} onValueChange={setTargetStatus}>
                  <SelectTrigger id="target-status">
                    <SelectValue placeholder="Select target status" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.transitionField?.options?.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Optional comment */}
              <div className="space-y-2">
                <Label htmlFor="transition-comment">Comment (optional)</Label>
                <Textarea
                  id="transition-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment about this bulk transition..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose} disabled={isExecuting}>
                Cancel
              </Button>
              <Button 
                onClick={handleExecute} 
                disabled={!targetStatus || isExecuting}
                className="bg-brand-gold hover:bg-brand-gold/90 text-white"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Transition {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'items'}</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
