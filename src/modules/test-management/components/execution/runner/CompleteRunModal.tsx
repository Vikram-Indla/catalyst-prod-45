/**
 * Complete Run Modal - Modal for completing a test run with status selection
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  SkipForward,
  X,
} from 'lucide-react';
import type { ExecutionStatus } from '../../../api/types';

interface CompleteRunModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (status: ExecutionStatus, notes?: string) => void;
  isLoading?: boolean;
  defaultStatus?: ExecutionStatus;
}

const statusOptions: Array<{
  value: ExecutionStatus;
  label: string;
  icon: React.ReactNode;
  className: string;
  hoverClassName: string;
  selectedClassName: string;
}> = [
  {
    value: 'passed',
    label: 'Passed',
    icon: <CheckCircle2 className="h-6 w-6" />,
    className: 'bg-emerald-600 text-white',
    hoverClassName: 'hover:border-emerald-600 hover:bg-emerald-50',
    selectedClassName: 'border-emerald-600 bg-emerald-50',
  },
  {
    value: 'failed',
    label: 'Failed',
    icon: <XCircle className="h-6 w-6" />,
    className: 'bg-red-500 text-white',
    hoverClassName: 'hover:border-red-500 hover:bg-red-50',
    selectedClassName: 'border-red-500 bg-red-50',
  },
  {
    value: 'blocked',
    label: 'Blocked',
    icon: <AlertTriangle className="h-6 w-6" />,
    className: 'bg-amber-500 text-white',
    hoverClassName: 'hover:border-amber-500 hover:bg-amber-50',
    selectedClassName: 'border-amber-500 bg-amber-50',
  },
  {
    value: 'skipped',
    label: 'Skipped',
    icon: <SkipForward className="h-6 w-6" />,
    className: 'bg-gray-400 text-white',
    hoverClassName: 'hover:border-gray-400 hover:bg-gray-50',
    selectedClassName: 'border-gray-400 bg-gray-50',
  },
];

export function CompleteRunModal({
  open,
  onOpenChange,
  onComplete,
  isLoading = false,
  defaultStatus = 'passed',
}: CompleteRunModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<ExecutionStatus>(defaultStatus);
  const [notes, setNotes] = useState('');

  const handleComplete = () => {
    onComplete(selectedStatus, notes || undefined);
    setNotes('');
  };

  const handleClose = () => {
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Complete Test Run</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Set the overall status for this test run and add any notes.
          </DialogDescription>
        </DialogHeader>

        {/* Status Selection Grid */}
        <div className="grid grid-cols-2 gap-3 py-4">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedStatus(option.value)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all cursor-pointer',
                selectedStatus === option.value
                  ? option.selectedClassName
                  : 'border-border bg-background',
                selectedStatus !== option.value && option.hoverClassName
              )}
            >
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                option.className
              )}>
                {option.icon}
              </div>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>

        {/* Notes Section */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Run Notes (Optional)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this test run..."
            className="resize-none"
            rows={3}
          />
        </div>

        <DialogFooter className="bg-muted/50 -mx-6 -mb-6 px-6 py-4 mt-4 border-t">
          <div className="flex justify-end gap-3 w-full">
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? 'Completing...' : 'Complete Run'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
