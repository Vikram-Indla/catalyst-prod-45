/**
 * CATALYST TESTS - Archive Cycle Modal
 * Archive cycles with reason selection
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Archive, AlertTriangle } from 'lucide-react';
import { archiveCycles } from '@/services/cycleManagementService';
import { ARCHIVE_REASONS } from '@/types/cycleManagement';

interface ArchiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleIds: string[];
  cycleNames?: string[];
}

export function ArchiveModal({ open, onOpenChange, cycleIds, cycleNames = [] }: ArchiveModalProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<string>('completed');
  const [customReason, setCustomReason] = useState('');

  const archiveMutation = useMutation({
    mutationFn: () => archiveCycles({
      cycle_ids: cycleIds,
      archive_reason: reason === 'other' ? customReason : reason,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success(`${cycleIds.length} cycle(s) archived successfully`);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = () => {
    if (reason === 'other' && !customReason.trim()) {
      toast.error('Please provide a reason for archiving');
      return;
    }
    archiveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Archive className="h-5 w-5 text-brand-gold" />
            Archive Cycle{cycleIds.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Archived cycles are hidden from the main list but can be restored later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 rounded-md bg-orange-500/10 border border-orange-500/20">
            <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-orange-500">Archive {cycleIds.length} cycle(s)?</p>
              <p className="text-muted-foreground mt-1">
                Archived cycles and their execution data will be preserved but hidden from normal views.
              </p>
            </div>
          </div>

          {/* Cycles being archived */}
          {cycleNames.length > 0 && (
            <div>
              <Label className="text-sm">Cycles to archive:</Label>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {cycleNames.slice(0, 5).map((name, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {name}
                  </Badge>
                ))}
                {cycleNames.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{cycleNames.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Archive Reason */}
          <div>
            <Label htmlFor="reason">Archive Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARCHIVE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Reason */}
          {reason === 'other' && (
            <div>
              <Label htmlFor="customReason">Specify Reason</Label>
              <Textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter the reason for archiving..."
                className="mt-1.5 min-h-[80px]"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={archiveMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={archiveMutation.isPending}
            className="bg-brand-gold hover:bg-brand-gold/90 text-background"
          >
            {archiveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
