import { Button } from '@/components/ui/button';
import { ImportResult, downloadErrorReport } from '@/services/importService';
import { CheckCircle, AlertCircle, Download, Eye } from 'lucide-react';

interface ImportStep6SummaryProps {
  result: ImportResult;
  onClose: () => void;
}

export function ImportStep6Summary({ result, onClose }: ImportStep6SummaryProps) {
  const hasErrors = result.errorCount > 0 || result.skippedCount > 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        {hasErrors ? (
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
        ) : (
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
        )}
        
        <h3 className="text-lg font-medium mb-2">
          {hasErrors ? 'Import Completed with Issues' : 'Import Complete!'}
        </h3>
        
        <p className="text-muted-foreground">
          Successfully processed {result.createdCount + result.updatedCount} test cases
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between p-2 rounded bg-green-50">
          <span>Created:</span>
          <span className="font-medium">{result.createdCount} new cases</span>
        </div>
        <div className="flex justify-between p-2 rounded bg-blue-50">
          <span>Updated:</span>
          <span className="font-medium">{result.updatedCount} existing cases</span>
        </div>
        {result.skippedCount > 0 && (
          <div className="flex justify-between p-2 rounded bg-orange-50">
            <span>Skipped:</span>
            <span className="font-medium">{result.skippedCount} rows</span>
          </div>
        )}
        {result.errorCount > 0 && (
          <div className="flex justify-between p-2 rounded bg-red-50">
            <span>Errors:</span>
            <span className="font-medium">{result.errorCount} rows failed</span>
          </div>
        )}
      </div>

      {hasErrors && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadErrorReport(result.errors)}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Error Report
          </Button>
        </div>
      )}

      {result.createdCount > 0 && (
        <div className="rounded-lg bg-muted p-3 text-xs">
          <div className="font-medium mb-1">Created Cases:</div>
          <div className="text-muted-foreground">
            {result.created.slice(0, 5).join(', ')}
            {result.created.length > 5 && ` ... and ${result.created.length - 5} more`}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {result.createdCount > 0 && (
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            View Imported Cases
          </Button>
        )}
        <Button
          onClick={onClose}
          className="bg-[#c69c6d] text-[#1a1a1a] hover:bg-[#b8905f]"
        >
          Close
        </Button>
      </div>
    </div>
  );
}
