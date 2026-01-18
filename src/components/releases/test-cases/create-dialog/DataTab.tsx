/**
 * Data Tab Component
 * Tab 3: Data-Driven Testing Parameters
 */

import { useCallback } from 'react';
import { Plus, Trash2, Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TestCaseFormData, TestCaseParameter } from './types';

interface DataTabProps {
  data: TestCaseFormData;
  onChange: (updates: Partial<TestCaseFormData>) => void;
}

export function DataTab({ data, onChange }: DataTabProps) {
  const { parameters, parameterHeaders } = data;

  const handleAddRow = useCallback(() => {
    const newRow: TestCaseParameter = {
      id: `param-${Date.now()}`,
      values: parameterHeaders.reduce((acc, header) => {
        acc[header] = '';
        return acc;
      }, {} as Record<string, string>),
    };
    onChange({ parameters: [...parameters, newRow] });
  }, [parameters, parameterHeaders, onChange]);

  const handleDeleteRow = useCallback((id: string) => {
    onChange({ parameters: parameters.filter((p) => p.id !== id) });
    toast.success('Row deleted');
  }, [parameters, onChange]);

  const handleUpdateCell = useCallback((id: string, header: string, value: string) => {
    onChange({
      parameters: parameters.map((p) =>
        p.id === id ? { ...p, values: { ...p.values, [header]: value } } : p
      ),
    });
  }, [parameters, onChange]);

  const handleAddColumn = useCallback(() => {
    const newHeader = `column_${parameterHeaders.length + 1}`;
    onChange({
      parameterHeaders: [...parameterHeaders, newHeader],
      parameters: parameters.map((p) => ({
        ...p,
        values: { ...p.values, [newHeader]: '' },
      })),
    });
  }, [parameters, parameterHeaders, onChange]);

  const handleUpdateHeader = useCallback((oldHeader: string, newHeader: string) => {
    if (newHeader === oldHeader) return;
    if (parameterHeaders.includes(newHeader)) {
      toast.error('Column name already exists');
      return;
    }
    onChange({
      parameterHeaders: parameterHeaders.map((h) => (h === oldHeader ? newHeader : h)),
      parameters: parameters.map((p) => {
        const { [oldHeader]: value, ...rest } = p.values;
        return { ...p, values: { ...rest, [newHeader]: value } };
      }),
    });
  }, [parameters, parameterHeaders, onChange]);

  const handleDeleteColumn = useCallback((header: string) => {
    if (parameterHeaders.length <= 1) {
      toast.error('Must have at least one column');
      return;
    }
    onChange({
      parameterHeaders: parameterHeaders.filter((h) => h !== header),
      parameters: parameters.map((p) => {
        const { [header]: _, ...rest } = p.values;
        return { ...p, values: rest };
      }),
    });
  }, [parameters, parameterHeaders, onChange]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      toast.info(`Import from ${file.name} - Feature coming soon!`);
    } else {
      toast.error('Please upload a CSV or Excel file');
    }
  }, []);

  return (
    <div className="space-y-6 py-4">
      {/* Info Box */}
      {parameters.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <FileSpreadsheet className="w-4 h-4 inline mr-2" />
            This test will run <strong>{parameters.length} times</strong> with different data sets
          </p>
        </div>
      )}

      {/* Parameters Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="w-12 px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">
                  #
                </th>
                {parameterHeaders.map((header) => (
                  <th key={header} className="px-3 py-2 text-left min-w-[150px]">
                    <div className="flex items-center gap-1">
                      <Input
                        value={header}
                        onChange={(e) => handleUpdateHeader(header, e.target.value)}
                        className="h-7 text-xs font-mono font-semibold border-transparent hover:border-slate-300 focus:border-primary"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteColumn(header)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                ))}
                <th className="w-12 px-3 py-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleAddColumn}
                    title="Add column"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((param, index) => (
                <tr key={param.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                    {index + 1}
                  </td>
                  {parameterHeaders.map((header) => (
                    <td key={header} className="px-3 py-2">
                      <Input
                        value={param.values[header] || ''}
                        onChange={(e) => handleUpdateCell(param.id, header, e.target.value)}
                        className="h-8 text-xs font-mono"
                        placeholder={`Enter ${header}...`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteRow(param.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td colSpan={parameterHeaders.length + 2} className="p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddRow}
                    className="w-full border-dashed"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Row
                  </Button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Import Section */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-all",
          "hover:border-primary hover:bg-primary/5 cursor-pointer"
        )}
      >
        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-medium mb-1">Import Test Data</h3>
        <p className="text-sm text-muted-foreground">
          Drop a CSV or Excel file to import test data
        </p>
      </div>
    </div>
  );
}
