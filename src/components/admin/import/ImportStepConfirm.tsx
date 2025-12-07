import { CheckCircle, AlertTriangle, XCircle, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ImportModuleConfig } from '@/lib/import/importModuleConfig';
import { RowValidationResult } from '@/lib/import/importValidator';
import { cn } from '@/lib/utils';

interface ImportStepConfirmProps {
  moduleConfig: ImportModuleConfig;
  validationResults: RowValidationResult[] | null;
  isImporting: boolean;
  importProgress: number;
  importResult: { success: number; failed: number } | null;
  onBeginImport: () => void;
  onDownloadPreview: () => void;
}

export function ImportStepConfirm({
  moduleConfig,
  validationResults,
  isImporting,
  importProgress,
  importResult,
  onBeginImport,
  onDownloadPreview,
}: ImportStepConfirmProps) {
  const summary = validationResults ? {
    total: validationResults.length,
    valid: validationResults.filter(r => r.errors.filter(e => e.severity === 'error').length === 0).length,
    invalid: validationResults.filter(r => r.errors.filter(e => e.severity === 'error').length > 0).length,
    warnings: validationResults.filter(r => 
      r.errors.filter(e => e.severity === 'error').length === 0 &&
      r.errors.filter(e => e.severity === 'warning').length > 0
    ).length,
  } : null;
  
  if (importResult) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Import Complete</h2>
        </div>
        
        <div className="border-t pt-6">
          <div className="text-center py-12">
            {importResult.failed === 0 ? (
              <>
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Successfully imported {importResult.success} {moduleConfig.label.toLowerCase()}
                </h3>
                <p className="text-muted-foreground">
                  All records have been created in your Catalyst database.
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Import completed with issues
                </h3>
                <p className="text-muted-foreground">
                  {importResult.success} records imported successfully, {importResult.failed} failed.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  if (isImporting) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Importing...</h2>
        </div>
        
        <div className="border-t pt-6">
          <div className="text-center py-12">
            <Upload className="h-12 w-12 text-brand-gold mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Importing {moduleConfig.label}
            </h3>
            <div className="max-w-md mx-auto">
              <Progress value={importProgress} className="h-2 mb-2" />
              <p className="text-sm text-muted-foreground">
                {Math.round(importProgress)}% complete
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Confirm Import</h2>
        <p className="text-sm text-muted-foreground">
          Review the summary and begin importing your data.
        </p>
      </div>
      
      <div className="border-t pt-6">
        {!summary ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Please complete validation before importing.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-muted/50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="h-8 w-8 text-brand-gold" />
                <div>
                  <h3 className="font-semibold text-foreground">
                    Import {moduleConfig.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {summary.total} rows detected
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-background rounded-lg p-4 border">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Valid Rows</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{summary.valid}</p>
                </div>
                
                <div className="bg-background rounded-lg p-4 border">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Warnings</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{summary.warnings}</p>
                </div>
                
                <div className="bg-background rounded-lg p-4 border">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium">Invalid Rows</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{summary.invalid}</p>
                </div>
              </div>
            </div>
            
            {/* Info */}
            {summary.invalid > 0 && (
              <div className="flex items-start gap-3 p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {summary.invalid} rows will be skipped
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Only valid rows will be imported. Invalid rows will be skipped.
                  </p>
                </div>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <Button
                onClick={onBeginImport}
                disabled={summary.valid === 0}
                className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              >
                Begin Import
              </Button>
              <Button variant="outline" onClick={onDownloadPreview}>
                Download Preview
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
