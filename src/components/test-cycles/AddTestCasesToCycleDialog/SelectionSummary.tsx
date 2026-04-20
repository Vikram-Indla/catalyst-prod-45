/**
 * Selection Summary Component
 * Shows count, estimated time, and priority breakdown
 */

import React from 'react';
import { Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import { formatDuration } from './utils';

interface SelectionSummaryProps {
  count: number;
  estimatedTime: number;
  priorityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  onClearAll: () => void;
}

export function SelectionSummary({
  count,
  estimatedTime,
  priorityBreakdown,
  onClearAll,
}: SelectionSummaryProps) {
  return (
    <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-600">
            Total: <span className="font-semibold text-slate-900">{count} tests</span>
          </span>
          <span className="text-slate-600 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Est: <span className="font-semibold text-slate-900">{formatDuration(estimatedTime)}</span>
          </span>
        </div>
        {count > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={onClearAll}>
            <Trash2 className="w-3 h-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {priorityBreakdown.critical > 0 && (
          <Lozenge appearance="removed">{priorityBreakdown.critical} Critical</Lozenge>
        )}
        {priorityBreakdown.high > 0 && (
          <Lozenge appearance="moved">{priorityBreakdown.high} High</Lozenge>
        )}
        {priorityBreakdown.medium > 0 && (
          <Lozenge appearance="default">{priorityBreakdown.medium} Medium</Lozenge>
        )}
        {priorityBreakdown.low > 0 && (
          <Lozenge appearance="default">{priorityBreakdown.low} Low</Lozenge>
        )}
      </div>
    </div>
  );
}
