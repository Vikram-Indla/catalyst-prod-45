import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  executeImport,
  ColumnMapping,
  ImportOptions,
  ImportResult,
} from '@/services/importService';

interface ImportStep5ProgressProps {
  file: File;
  mapping: ColumnMapping;
  options: ImportOptions;
  programId: string;
  onComplete: (result: ImportResult) => void;
  onCancel: () => void;
}

export function ImportStep5Progress({
  file,
  mapping,
  options,
  programId,
  onComplete,
  onCancel,
}: ImportStep5ProgressProps) {
  const [progress, setProgress] = useState(0);
  const [counts, setCounts] = useState({
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  });
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    performImport();
  }, []);

  const performImport = async () => {
    try {
      const result = await executeImport(
        file,
        mapping,
        options,
        programId,
        (prog, counts) => {
          if (!isCancelled) {
            setProgress(prog);
            setCounts({
              created: counts.createdCount || 0,
              updated: counts.updatedCount || 0,
              skipped: counts.skippedCount || 0,
              errors: counts.errorCount || 0,
            });
          }
        }
      );
      
      if (!isCancelled) {
        onComplete(result);
      }
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const handleCancel = () => {
    setIsCancelled(true);
    onCancel();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-4">Importing Test Cases...</h3>
        
        <div className="mb-6">
          <Progress value={progress} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">{Math.round(progress)}%</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-2xl font-bold text-green-600">{counts.created}</div>
            <div className="text-muted-foreground">Created</div>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-2xl font-bold text-blue-600">{counts.updated}</div>
            <div className="text-muted-foreground">Updated</div>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-2xl font-bold text-orange-600">{counts.skipped}</div>
            <div className="text-muted-foreground">Skipped</div>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-2xl font-bold text-red-600">{counts.errors}</div>
            <div className="text-muted-foreground">Errors</div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={handleCancel}>
          Cancel Import
        </Button>
      </div>
    </div>
  );
}
