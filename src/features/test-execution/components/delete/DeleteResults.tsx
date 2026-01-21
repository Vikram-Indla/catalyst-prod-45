/**
 * Module 3C-4: Delete Results Display
 */

import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, RotateCcw, Trash2 } from 'lucide-react';
import type { DeleteResult } from '../../types/batch-delete';

interface DeleteResultsProps {
  result: DeleteResult;
  onClose: () => void;
  onViewTrash?: () => void;
}

export function DeleteResults({ result, onClose, onViewTrash }: DeleteResultsProps) {
  const hasErrors = result.failed > 0;

  return (
    <div className="space-y-6 py-4">
      {/* Status Icon */}
      <div className="flex justify-center">
        {hasErrors ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <XCircle className="h-8 w-8 text-amber-600" />
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        )}
      </div>

      {/* Title */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">
          {hasErrors ? 'Delete Completed with Errors' : 'Delete Successful'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {result.deleted} of {result.total} items deleted
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div>
            <div className="text-lg font-semibold text-green-700">{result.deleted}</div>
            <div className="text-xs text-green-600">Deleted</div>
          </div>
        </div>
        {result.failed > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <div className="text-lg font-semibold text-red-700">{result.failed}</div>
              <div className="text-xs text-red-600">Failed</div>
            </div>
          </div>
        )}
      </div>

      {/* Restore Info */}
      {result.canRestore && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <RotateCcw className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-800">Items can be restored</h4>
            <p className="text-sm text-blue-600">
              Deleted items are in the trash and can be recovered within {result.expiresInDays} days.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        {result.canRestore && onViewTrash && (
          <Button variant="outline" onClick={onViewTrash}>
            <Trash2 className="mr-2 h-4 w-4" />
            View Trash
          </Button>
        )}
        <Button onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
