/**
 * Add Tests Footer - Cancel and Submit buttons
 */

import React from 'react';
import { Loader2, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATALYST_V5 } from '@/lib/catalyst-colors';

interface AddTestsFooterProps {
  selectedCount: number;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  dueDate: string | null;
  cycleEndDate?: string;
}

export function AddTestsFooter({
  selectedCount,
  isSubmitting,
  onCancel,
  onSubmit,
  dueDate,
  cycleEndDate,
}: AddTestsFooterProps) {
  const isDueDateAfterCycleEnd = cycleEndDate && dueDate && dueDate > cycleEndDate;
  const isLargeSelection = selectedCount > 100;
  const isDisabled = selectedCount === 0 || isSubmitting;

  return (
    <div 
      className="border-t p-4"
      style={{ borderColor: CATALYST_V5.slate[200] }}
    >
      {/* Warning Banner */}
      {isDueDateAfterCycleEnd && (
        <div 
          className="flex items-center gap-2 p-2 rounded-md mb-3 text-xs"
          style={{ 
            backgroundColor: CATALYST_V5.warningLight,
            color: CATALYST_V5.warning,
          }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Due date exceeds cycle end date. Tests may become overdue.
        </div>
      )}

      {/* Info for large selection */}
      {isLargeSelection && (
        <div 
          className="flex items-center gap-2 p-2 rounded-md mb-3 text-xs"
          style={{ 
            backgroundColor: CATALYST_V5.primaryLight,
            color: CATALYST_V5.primary,
          }}
        >
          <Info className="h-4 w-4 shrink-0" />
          Adding {selectedCount} tests. This may take a moment.
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{ color: CATALYST_V5.slate[600] }}
        >
          Cancel
        </Button>

        <Button
          onClick={onSubmit}
          disabled={isDisabled}
          style={{
            backgroundColor: isDisabled ? CATALYST_V5.slate[300] : CATALYST_V5.primary,
            color: 'white',
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            `Add ${selectedCount} Test${selectedCount !== 1 ? 's' : ''}`
          )}
        </Button>
      </div>
    </div>
  );
}
