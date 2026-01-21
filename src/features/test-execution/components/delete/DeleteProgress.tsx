/**
 * Module 3C-4: Delete Progress Display
 */

import { Progress } from '@/components/ui/progress';
import { Loader2, Trash2 } from 'lucide-react';
import type { BatchDeleteStatus, DeleteType } from '../../types/batch-delete';

interface DeleteProgressProps {
  progress: number;
  status: BatchDeleteStatus;
  deleteType: DeleteType;
  totalRecords: number;
}

export function DeleteProgress({ progress, status, deleteType, totalRecords }: DeleteProgressProps) {
  const isExecuting = status === 'executing';

  return (
    <div className="space-y-6 py-8">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Trash2 className="h-12 w-12 text-destructive" />
          {isExecuting && (
            <Loader2 className="absolute -right-1 -top-1 h-5 w-5 animate-spin text-destructive" />
          )}
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">
            {isExecuting ? 'Deleting test cases...' : 'Delete Complete'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {deleteType === 'soft' 
              ? 'Moving items to trash' 
              : 'Permanently removing items'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Progress 
          value={progress} 
          className="h-3 bg-muted"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{progress}% complete</span>
          <span>{totalRecords} item{totalRecords !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}
