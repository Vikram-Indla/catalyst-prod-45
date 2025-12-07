import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImportModuleConfig } from '@/lib/import/importModuleConfig';
import { validateAllRows, detectDuplicates, RowValidationResult, ValidationError } from '@/lib/import/importValidator';
import { cn } from '@/lib/utils';

interface ImportStepValidationProps {
  moduleConfig: ImportModuleConfig;
  parsedData: Record<string, string>[];
  fieldMappings: Map<string, string>;
  dateFormat: string;
  validationResults: RowValidationResult[] | null;
  onValidate: () => void;
  onDownloadErrors: () => void;
}

export function ImportStepValidation({
  moduleConfig,
  parsedData,
  fieldMappings,
  dateFormat,
  validationResults,
  onValidate,
  onDownloadErrors,
}: ImportStepValidationProps) {
  const [filter, setFilter] = useState<'all' | 'valid' | 'invalid' | 'warning'>('all');
  
  const summary = useMemo(() => {
    if (!validationResults) return null;
    
    let valid = 0;
    let invalid = 0;
    let warning = 0;
    
    validationResults.forEach(r => {
      const hasErrors = r.errors.filter(e => e.severity === 'error').length > 0;
      const hasWarnings = r.errors.filter(e => e.severity === 'warning').length > 0;
      
      if (hasErrors) invalid++;
      else if (hasWarnings) warning++;
      else valid++;
    });
    
    return { valid, invalid, warning, total: validationResults.length };
  }, [validationResults]);
  
  const filteredResults = useMemo(() => {
    if (!validationResults) return [];
    
    switch (filter) {
      case 'valid':
        return validationResults.filter(r => 
          r.errors.filter(e => e.severity === 'error').length === 0 &&
          r.errors.filter(e => e.severity === 'warning').length === 0
        );
      case 'invalid':
        return validationResults.filter(r => 
          r.errors.filter(e => e.severity === 'error').length > 0
        );
      case 'warning':
        return validationResults.filter(r => 
          r.errors.filter(e => e.severity === 'error').length === 0 &&
          r.errors.filter(e => e.severity === 'warning').length > 0
        );
      default:
        return validationResults;
    }
  }, [validationResults, filter]);
  
  // Get mapped field labels for display
  const mappedFields = useMemo(() => {
    const fields: Array<{ csvHeader: string; dbColumn: string; label: string }> = [];
    fieldMappings.forEach((dbColumn, csvHeader) => {
      if (dbColumn) {
        const fieldConfig = moduleConfig.fields.find(f => f.key === dbColumn);
        fields.push({
          csvHeader,
          dbColumn,
          label: fieldConfig?.label || dbColumn,
        });
      }
    });
    return fields;
  }, [fieldMappings, moduleConfig]);
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Validation Preview</h2>
        <p className="text-sm text-muted-foreground">
          Review your data before importing. Fix any errors or choose to skip invalid rows.
        </p>
      </div>
      
      <div className="border-t pt-6">
        {!validationResults ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Click "Validate" to check your data for errors before importing.
            </p>
            <Button onClick={onValidate} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
              Validate Data
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{summary?.total} rows detected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">{summary?.valid} valid</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm">{summary?.warning} warnings</span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm">{summary?.invalid} invalid</span>
              </div>
              
              {(summary?.invalid || 0) > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownloadErrors}
                  className="ml-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Errors
                </Button>
              )}
            </div>
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show:</span>
              {(['all', 'valid', 'warning', 'invalid'] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className={cn(
                    filter === f && 'bg-brand-gold hover:bg-brand-gold-hover'
                  )}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>
            
            {/* Results Table */}
            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    {mappedFields.slice(0, 5).map(f => (
                      <TableHead key={f.dbColumn}>{f.label}</TableHead>
                    ))}
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((result) => {
                    const hasErrors = result.errors.filter(e => e.severity === 'error').length > 0;
                    const hasWarnings = result.errors.filter(e => e.severity === 'warning').length > 0;
                    
                    return (
                      <TableRow key={result.rowIndex} className={cn(
                        hasErrors && 'bg-destructive/5',
                        hasWarnings && !hasErrors && 'bg-amber-50'
                      )}>
                        <TableCell className="font-mono text-sm">
                          {result.rowIndex + 1}
                        </TableCell>
                        <TableCell>
                          {hasErrors ? (
                            <Badge variant="destructive" className="text-xs">Invalid</Badge>
                          ) : hasWarnings ? (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">Warning</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 text-xs">Valid</Badge>
                          )}
                        </TableCell>
                        {mappedFields.slice(0, 5).map(f => (
                          <TableCell key={f.dbColumn} className="text-sm max-w-[150px] truncate">
                            {String(result.data[f.dbColumn] || '-')}
                          </TableCell>
                        ))}
                        <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                          {result.errors.map((e, i) => (
                            <div key={i} className={cn(
                              e.severity === 'error' ? 'text-destructive' : 'text-amber-600'
                            )}>
                              {e.message}
                            </div>
                          ))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
