/**
 * Test Case Data Tab
 * Phase 2: View & Edit test data on the detail page
 * Features: Inline editing, add/delete columns & rows, CSV import/export
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Upload, 
  Download, 
  Sparkles, 
  ScanSearch,
  Grid3X3,
  Loader2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  useTestDataParameters,
  useTestDataRows,
  useSaveTestData,
  type TestDataParameter,
  type TestDataRow,
} from '@/hooks/test-management/useTestData';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { extractVariablesFromSteps } from '@/lib/variable-substitution';

interface TestCaseDataTabProps {
  testCaseId: string;
}

interface LocalRow {
  id: string;
  values: Record<string, string>;
}

export function TestCaseDataTab({ testCaseId }: TestCaseDataTabProps) {
  // Fetch data from DB
  const { 
    data: dbParameters = [], 
    isLoading: parametersLoading,
    error: parametersError,
  } = useTestDataParameters(testCaseId);
  
  const { 
    data: dbRows = [], 
    isLoading: rowsLoading,
    error: rowsError,
  } = useTestDataRows(testCaseId);
  
  const saveTestData = useSaveTestData();
  
  // Local state for editing
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<LocalRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Dialogs
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [showDeleteColumnDialog, setShowDeleteColumnDialog] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
  const [showDeleteRowDialog, setShowDeleteRowDialog] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<string | null>(null);
  const [showImportConfirmDialog, setShowImportConfirmDialog] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<{ headers: string[]; rows: LocalRow[] } | null>(null);
  
  // File input ref for CSV import
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Sync DB data to local state
  useEffect(() => {
    if (!parametersLoading && !rowsLoading) {
      const dbHeaders = dbParameters.map(p => p.parameter_name);
      setHeaders(dbHeaders);
      
      const localRows: LocalRow[] = dbRows.map(row => ({
        id: row.id,
        values: row.row_data || {},
      }));
      setRows(localRows);
      
      // Get the most recent updated_at
      const allDates = [
        ...dbParameters.map(p => new Date(p.updated_at)),
        ...dbRows.map(r => new Date(r.updated_at)),
      ];
      if (allDates.length > 0) {
        setLastUpdated(new Date(Math.max(...allDates.map(d => d.getTime()))));
      }
      
      setIsDirty(false);
    }
  }, [dbParameters, dbRows, parametersLoading, rowsLoading]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!isDirty) return;
    
    try {
      await saveTestData.mutateAsync({
        testCaseId,
        parameterHeaders: headers,
        rows,
      });
      
      setIsDirty(false);
      setLastUpdated(new Date());
      toast.success('Test data saved');
    } catch (error) {
      toast.error('Failed to save test data', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [testCaseId, headers, rows, isDirty, saveTestData]);

  // Cell edit handler - auto-save on blur/Enter
  const handleCellChange = useCallback((rowId: string, column: string, value: string) => {
    setRows(prev => prev.map(row => 
      row.id === rowId 
        ? { ...row, values: { ...row.values, [column]: value } }
        : row
    ));
    setIsDirty(true);
  }, []);

  const handleCellBlur = useCallback(async () => {
    if (isDirty) {
      await handleSave();
    }
  }, [isDirty, handleSave]);

  // Add column
  const handleAddColumn = useCallback(async () => {
    const trimmedName = newColumnName.trim();
    if (!trimmedName) {
      toast.error('Column name is required');
      return;
    }
    
    if (headers.includes(trimmedName)) {
      toast.error('Column already exists');
      return;
    }
    
    const newHeaders = [...headers, trimmedName];
    const newRows = rows.map(row => ({
      ...row,
      values: { ...row.values, [trimmedName]: '' },
    }));
    
    try {
      await saveTestData.mutateAsync({
        testCaseId,
        parameterHeaders: newHeaders,
        rows: newRows,
      });
      
      setHeaders(newHeaders);
      setRows(newRows);
      setNewColumnName('');
      setShowAddColumnDialog(false);
      setLastUpdated(new Date());
      toast.success(`Column "${trimmedName}" added`);
    } catch (error) {
      toast.error('Failed to add column', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [testCaseId, headers, rows, newColumnName, saveTestData]);

  // Delete column
  const confirmDeleteColumn = useCallback((columnName: string) => {
    setColumnToDelete(columnName);
    setShowDeleteColumnDialog(true);
  }, []);

  const handleDeleteColumn = useCallback(async () => {
    if (!columnToDelete) return;
    
    const newHeaders = headers.filter(h => h !== columnToDelete);
    const newRows = rows.map(row => {
      const { [columnToDelete]: _, ...restValues } = row.values;
      return { ...row, values: restValues };
    });
    
    try {
      await saveTestData.mutateAsync({
        testCaseId,
        parameterHeaders: newHeaders,
        rows: newRows,
      });
      
      setHeaders(newHeaders);
      setRows(newRows);
      setShowDeleteColumnDialog(false);
      setColumnToDelete(null);
      setLastUpdated(new Date());
      toast.success(`Column deleted`);
    } catch (error) {
      toast.error('Failed to delete column', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [testCaseId, headers, rows, columnToDelete, saveTestData]);

  // Add row
  const handleAddRow = useCallback(async () => {
    const newRow: LocalRow = {
      id: crypto.randomUUID(),
      values: headers.reduce((acc, h) => ({ ...acc, [h]: '' }), {}),
    };
    
    const newRows = [...rows, newRow];
    
    try {
      await saveTestData.mutateAsync({
        testCaseId,
        parameterHeaders: headers,
        rows: newRows,
      });
      
      setRows(newRows);
      setLastUpdated(new Date());
      toast.success('Row added');
    } catch (error) {
      toast.error('Failed to add row', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [testCaseId, headers, rows, saveTestData]);

  // Delete row
  const confirmDeleteRow = useCallback((rowId: string) => {
    setRowToDelete(rowId);
    setShowDeleteRowDialog(true);
  }, []);

  const handleDeleteRow = useCallback(async () => {
    if (!rowToDelete) return;
    
    const newRows = rows.filter(r => r.id !== rowToDelete);
    
    try {
      await saveTestData.mutateAsync({
        testCaseId,
        parameterHeaders: headers,
        rows: newRows,
      });
      
      setRows(newRows);
      setSelectedRows(prev => {
        const next = new Set(prev);
        next.delete(rowToDelete);
        return next;
      });
      setShowDeleteRowDialog(false);
      setRowToDelete(null);
      setLastUpdated(new Date());
      toast.success('Row deleted');
    } catch (error) {
      toast.error('Failed to delete row', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [testCaseId, headers, rows, rowToDelete, saveTestData]);

  // CSV Export
  const handleExportCSV = useCallback(() => {
    if (headers.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        headers.map(h => {
          const value = row.values[h] || '';
          // Escape quotes and wrap in quotes if contains comma
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      ),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `test-data-${testCaseId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('CSV exported');
  }, [testCaseId, headers, rows]);

  // CSV Import
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 1) {
        toast.error('CSV file is empty');
        return;
      }
      
      // Parse headers (first row)
      const importedHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      // Parse rows
      const importedRows: LocalRow[] = lines.slice(1).map((line, index) => {
        const values: Record<string, string> = {};
        // Simple CSV parsing (doesn't handle all edge cases but good for basic use)
        const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        importedHeaders.forEach((header, i) => {
          values[header] = cells[i] || '';
        });
        return { id: crypto.randomUUID(), values };
      });
      
      // Show confirmation if data exists
      if (headers.length > 0 || rows.length > 0) {
        setPendingImportData({ headers: importedHeaders, rows: importedRows });
        setShowImportConfirmDialog(true);
      } else {
        // No existing data, import directly
        performImport(importedHeaders, importedRows);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
  }, [headers, rows]);

  const performImport = useCallback(async (importHeaders: string[], importRows: LocalRow[]) => {
    try {
      await saveTestData.mutateAsync({
        testCaseId,
        parameterHeaders: importHeaders,
        rows: importRows,
      });
      
      setHeaders(importHeaders);
      setRows(importRows);
      setShowImportConfirmDialog(false);
      setPendingImportData(null);
      setLastUpdated(new Date());
      toast.success(`Imported ${importRows.length} rows`);
    } catch (error) {
      toast.error('Failed to import CSV', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [testCaseId, saveTestData]);

  const confirmImport = useCallback(() => {
    if (pendingImportData) {
      performImport(pendingImportData.headers, pendingImportData.rows);
    }
  }, [pendingImportData, performImport]);

  // Select all toggle
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(rows.map(r => r.id)));
    } else {
      setSelectedRows(new Set());
    }
  }, [rows]);

  // Loading state
  if (parametersLoading || rowsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (parametersError || rowsError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive mb-2">Failed to load test data</p>
        <p className="text-sm text-muted-foreground">
          {parametersError?.message || rowsError?.message}
        </p>
      </div>
    );
  }

  // Empty state
  const isEmpty = headers.length === 0;

  return (
    <div className="space-y-4">
      {isEmpty ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-border rounded-xl bg-card"
        >
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Grid3X3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No test data yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md">
              Add test data to run this test case with different input values. 
              Define columns for your parameters and add rows for each test scenario.
            </p>
            <div className="flex items-center gap-3">
              <Button onClick={() => setShowAddColumnDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Column
              </Button>
              <Button variant="outline" onClick={handleImportClick}>
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Data Table */
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Test Data</h2>
              <p className="text-sm text-muted-foreground">
                {rows.length} data set{rows.length !== 1 ? 's' : ''}
                {lastUpdated && ` · Last updated ${formatDistanceToNow(lastUpdated, { addSuffix: true })}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Auto-detect variables from test steps */}
              <Button variant="outline" size="sm" onClick={async () => {
                try {
                  const { data: steps } = await supabase
                    .from('tm_test_steps')
                    .select('action, expected_result, test_data')
                    .eq('test_case_id', testCaseId)
                    .order('step_number');
                  
                  if (!steps || steps.length === 0) {
                    toast.info('No steps found for this test case');
                    return;
                  }

                  const detected = extractVariablesFromSteps(steps);
                  if (detected.length === 0) {
                    toast.info('No {{variables}} found in steps');
                    return;
                  }

                  const newVars = detected.filter(v => !headers.includes(v));
                  if (newVars.length === 0) {
                    toast.info('All variables already have columns');
                    return;
                  }

                  const newHeaders = [...headers, ...newVars];
                  const newRows = rows.map(row => ({
                    ...row,
                    values: { ...row.values, ...Object.fromEntries(newVars.map(v => [v, ''])) },
                  }));

                  await saveTestData.mutateAsync({
                    testCaseId,
                    parameterHeaders: newHeaders,
                    rows: newRows,
                  });

                  setHeaders(newHeaders);
                  setRows(newRows);
                  setLastUpdated(new Date());
                  toast.success(`Added ${newVars.length} variable column${newVars.length !== 1 ? 's' : ''}: ${newVars.join(', ')}`);
                } catch (error) {
                  toast.error('Failed to detect variables');
                }
              }}>
                <ScanSearch className="w-4 h-4 mr-2" />
                Auto-Detect Variables
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => setShowAddColumnDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Column
              </Button>
              
              <Button size="sm" onClick={handleAddRow} disabled={saveTestData.isPending}>
                {saveTestData.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add Row
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="w-12 px-3 py-3 text-center">
                    <Checkbox
                      checked={selectedRows.size === rows.length && rows.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="w-12 px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">
                    #
                  </th>
                  {headers.map((header) => (
                    <th key={header} className="px-3 py-3 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground uppercase">
                          {header}
                        </span>
                        <button
                          onClick={() => confirmDeleteColumn(header)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="w-12 px-3 py-3">
                    <button
                      onClick={() => setShowAddColumnDialog(true)}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {rows.map((row, rowIndex) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="hover:bg-muted/30 group"
                    >
                      <td className="px-3 py-2 text-center">
                        <Checkbox
                          checked={selectedRows.has(row.id)}
                          onCheckedChange={(checked) => {
                            setSelectedRows(prev => {
                              const next = new Set(prev);
                              if (checked) {
                                next.add(row.id);
                              } else {
                                next.delete(row.id);
                              }
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {rowIndex + 1}
                        </span>
                      </td>
                      {headers.map((header) => (
                        <td key={`${row.id}-${header}`} className="px-3 py-2">
                          <Input
                            value={row.values[header] || ''}
                            onChange={(e) => handleCellChange(row.id, header, e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            placeholder={row.values[header] === '' ? '(empty)' : undefined}
                            className={cn(
                              "w-full px-2 py-1.5 text-sm border-transparent bg-transparent",
                              "hover:border-input focus:border-primary focus:ring-1 focus:ring-primary",
                              !row.values[header] && "text-muted-foreground italic"
                            )}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <button
                          onClick={() => confirmDeleteRow(row.id)}
                          className="w-7 h-7 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleImportClick}>
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Tip: Use</span>
              <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{'{'}username{'}'}</code>
              <span>in steps to reference data columns</span>
            </div>
          </div>

          {/* Saving indicator */}
          <AnimatePresence>
            {saveTestData.isPending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="fixed bottom-4 right-4 flex items-center gap-2 bg-background border border-border rounded-lg px-4 py-2 shadow-lg"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Saving...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Hidden file input for CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Add Column Dialog */}
      <Dialog open={showAddColumnDialog} onOpenChange={setShowAddColumnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Column</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="Column name (e.g., username)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddColumn();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddColumnDialog(false);
              setNewColumnName('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddColumn} disabled={saveTestData.isPending || !newColumnName.trim()}>
              {saveTestData.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Column Confirmation */}
      <AlertDialog open={showDeleteColumnDialog} onOpenChange={setShowDeleteColumnDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Column</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the column "{columnToDelete}"? 
              This will remove all data in this column from all rows.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setColumnToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteColumn}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Column
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Row Confirmation */}
      <AlertDialog open={showDeleteRowDialog} onOpenChange={setShowDeleteRowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Row</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this row? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRowToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRow}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Row
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Confirmation */}
      <AlertDialog open={showImportConfirmDialog} onOpenChange={setShowImportConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Existing Data?</AlertDialogTitle>
            <AlertDialogDescription>
              Importing this CSV will replace all existing test data ({headers.length} columns, {rows.length} rows).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPendingImportData(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>
              Replace Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
