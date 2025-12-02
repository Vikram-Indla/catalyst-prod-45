/**
 * Bulk Execute Modal - Set status for multiple test cases
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  SkipForward,
  Clock,
  PlayCircle,
  Zap,
} from 'lucide-react';
import type { ExecutionStatus } from '@/types/executionGrid';

interface BulkExecuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (status: ExecutionStatus, comment?: string) => void;
  selectedCount: number;
  isLoading?: boolean;
}

const STATUS_OPTIONS: Array<{ value: ExecutionStatus; label: string; icon: React.ReactNode; color: string }> = [
  { value: 'passed', label: 'Passed', icon: <CheckCircle2 className="h-5 w-5" />, color: 'bg-green-500 hover:bg-green-600' },
  { value: 'failed', label: 'Failed', icon: <XCircle className="h-5 w-5" />, color: 'bg-red-500 hover:bg-red-600' },
  { value: 'blocked', label: 'Blocked', icon: <AlertCircle className="h-5 w-5" />, color: 'bg-orange-500 hover:bg-orange-600' },
  { value: 'skipped', label: 'Skipped', icon: <SkipForward className="h-5 w-5" />, color: 'bg-blue-500 hover:bg-blue-600' },
  { value: 'in_progress', label: 'In Progress', icon: <PlayCircle className="h-5 w-5" />, color: 'bg-yellow-500 hover:bg-yellow-600' },
  { value: 'not_executed', label: 'Reset', icon: <Clock className="h-5 w-5" />, color: 'bg-gray-500 hover:bg-gray-600' },
];

export const BulkExecuteModal: React.FC<BulkExecuteModalProps> = ({
  isOpen,
  onClose,
  onExecute,
  selectedCount,
  isLoading = false,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<ExecutionStatus | null>(null);
  const [comment, setComment] = useState('');

  const handleExecute = () => {
    if (selectedStatus) {
      onExecute(selectedStatus, comment || undefined);
      setSelectedStatus(null);
      setComment('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-brand-gold" />
            Bulk Execute
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Update status for {selectedCount} selected test case(s)
          </div>

          <div className="space-y-2">
            <Label>Select Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={selectedStatus === option.value ? 'default' : 'outline'}
                  className={`justify-start gap-2 ${
                    selectedStatus === option.value
                      ? `${option.color} text-white`
                      : ''
                  }`}
                  onClick={() => setSelectedStatus(option.value)}
                >
                  {option.icon}
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment (Optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment for all executions..."
              rows={3}
            />
          </div>

          {selectedStatus && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm">
                <span className="font-medium">{selectedCount}</span> test case(s) will be marked as{' '}
                <Badge
                  className={`ml-1 ${STATUS_OPTIONS.find(o => o.value === selectedStatus)?.color} text-white`}
                >
                  {STATUS_OPTIONS.find(o => o.value === selectedStatus)?.label}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleExecute}
            disabled={isLoading || !selectedStatus}
            className="bg-brand-gold hover:bg-brand-gold-hover text-brand-dark"
          >
            {isLoading ? 'Executing...' : 'Execute'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
