/**
 * TestDataPanel — Displays current test data values during execution
 * Shows the snapshot of row data stored at execution start
 */

import { useMemo } from 'react';
import { Database, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TestDataPanelProps {
  rowSnapshot: Record<string, string> | null;
  rowNumber?: number | null;
  totalRows?: number;
  className?: string;
}

export function TestDataPanel({
  rowSnapshot,
  rowNumber,
  totalRows,
  className,
}: TestDataPanelProps) {
  const entries = useMemo(() => {
    if (!rowSnapshot) return [];
    return Object.entries(rowSnapshot).sort(([a], [b]) => a.localeCompare(b));
  }, [rowSnapshot]);

  // Don't render if no data
  if (!rowSnapshot || entries.length === 0) {
    return null;
  }

  return (
    <div className={cn("bg-muted/30 border border-border rounded-lg", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Current Test Data</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[200px] text-xs">
                These values are from the data row snapshot taken when this execution started.
                Use <code className="text-primary">{'{variable}'}</code> placeholders in your steps.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        {rowNumber && (
          <Badge variant="outline" className="text-xs">
            Data Row: {rowNumber}{totalRows ? ` of ${totalRows}` : ''}
          </Badge>
        )}
      </div>

      {/* Data Grid */}
      <div className="p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="flex flex-col px-3 py-2 bg-background rounded-md border border-border/50"
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
                {key}
              </span>
              <span className="text-sm font-mono truncate" title={value}>
                {value || <span className="text-muted-foreground italic">empty</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Placeholder hint */}
      <div className="px-4 py-2 border-t border-border bg-muted/30 rounded-b-lg">
        <p className="text-xs text-muted-foreground">
          💡 Tip: Use <code className="text-primary bg-primary/10 px-1 rounded">{'{variable_name}'}</code> in step actions to reference these values.
        </p>
      </div>
    </div>
  );
}

/**
 * Compact version for inline display
 */
export function TestDataPanelCompact({
  rowSnapshot,
  rowNumber,
  className,
}: Omit<TestDataPanelProps, 'totalRows'>) {
  if (!rowSnapshot || Object.keys(rowSnapshot).length === 0) {
    return null;
  }

  const entries = Object.entries(rowSnapshot).slice(0, 4);
  const remaining = Object.keys(rowSnapshot).length - 4;

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <Badge variant="outline" className="gap-1.5">
        <Database className="h-3 w-3" />
        {rowNumber ? `Row ${rowNumber}` : 'Test Data'}
      </Badge>
      {entries.map(([key, value]) => (
        <Badge 
          key={key} 
          variant="secondary" 
          className="text-xs font-normal max-w-[180px]"
        >
          <span className="font-medium">{key}:</span>
          <span className="ml-1 truncate">{value || '—'}</span>
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="secondary" className="text-xs">
          +{remaining} more
        </Badge>
      )}
    </div>
  );
}
