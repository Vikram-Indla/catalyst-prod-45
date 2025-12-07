// Bulk Results Summary - Shows operation results with success/failure counts
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { BulkOperationSummary } from './types';
import { cn } from '@/lib/utils';

interface BulkResultsSummaryProps {
  results: BulkOperationSummary;
  entityLabel: string;
  onClose: () => void;
}

export function BulkResultsSummary({ results, entityLabel, onClose }: BulkResultsSummaryProps) {
  const [showDetails, setShowDetails] = useState(results.failureCount > 0);

  const { total, successCount, failureCount, skippedCount } = results;
  const hasErrors = failureCount > 0 || skippedCount > 0;

  return (
    <div className="py-4 space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div>
            <div className="text-lg font-semibold text-emerald-700">{successCount}</div>
            <div className="text-xs text-emerald-600">Successful</div>
          </div>
        </div>
        
        {failureCount > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <div className="text-lg font-semibold text-red-700">{failureCount}</div>
              <div className="text-xs text-red-600">Failed</div>
            </div>
          </div>
        )}
        
        {skippedCount > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <div className="text-lg font-semibold text-amber-700">{skippedCount}</div>
              <div className="text-xs text-amber-600">Skipped</div>
            </div>
          </div>
        )}
        
        {!hasErrors && (
          <div className="col-span-2 flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <div className="text-sm text-muted-foreground">
              All {total} items processed successfully
            </div>
          </div>
        )}
      </div>

      {/* Details Toggle */}
      {hasErrors && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full justify-between text-muted-foreground hover:text-foreground"
        >
          <span>{showDetails ? 'Hide' : 'Show'} failure details</span>
          {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      )}

      {/* Detailed Results */}
      {showDetails && hasErrors && (
        <ScrollArea className="h-40 border rounded-md">
          <div className="p-2 space-y-1">
            {results.results
              .filter(r => r.status !== 'success')
              .map(result => (
                <div 
                  key={result.id} 
                  className={cn(
                    "flex items-start gap-2 p-2 rounded text-sm",
                    result.status === 'failed' ? 'bg-red-50' : 'bg-amber-50'
                  )}
                >
                  {result.status === 'failed' ? (
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {result.title || result.id.slice(0, 8)}
                    </div>
                    {result.reason && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {result.reason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </ScrollArea>
      )}

      {/* Close Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={onClose} className="bg-brand-gold hover:bg-brand-gold/90 text-white">
          Done
        </Button>
      </div>
    </div>
  );
}
