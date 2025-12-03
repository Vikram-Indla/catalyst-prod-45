import React, { useState } from 'react';
import { Plus, Trash2, Upload, Download, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTestParameters, useTestDataRows, useCreateParameter, useDeleteParameter, useDeleteDataRow } from '@/hooks/useTestData';
import { DataRowEditor } from './DataRowEditor';
import { CSVImportModal } from './CSVImportModal';
import { useToast } from '@/hooks/use-toast';
import type { ParameterType } from '@/types/testData.types';
import { exportToCSV } from '@/lib/exportUtils';

interface TestDataTableProps {
  testCaseId: string;
}

export const TestDataTable: React.FC<TestDataTableProps> = ({ testCaseId }) => {
  const { toast } = useToast();
  const { data: parameters = [], isLoading: loadingParams } = useTestParameters(testCaseId);
  const { data: dataRows = [], isLoading: loadingRows } = useTestDataRows(testCaseId);
  const createParamMutation = useCreateParameter();
  const deleteParamMutation = useDeleteParameter();
  const deleteRowMutation = useDeleteDataRow();

  const [newParamName, setNewParamName] = useState('');
  const [newParamType, setNewParamType] = useState<ParameterType>('string');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleAddParameter = async () => {
    if (!newParamName.trim()) {
      toast({
        title: 'Error',
        description: 'Parameter name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createParamMutation.mutateAsync({
        test_case_id: testCaseId,
        parameter_name: newParamName.trim(),
        parameter_type: newParamType,
      });

      setNewParamName('');
      setNewParamType('string');

      toast({
        title: 'Success',
        description: 'Parameter added successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add parameter',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteParameter = async (parameterId: string) => {
    if (!confirm('Delete this parameter? All data for this column will be removed from existing rows.')) return;

    try {
      await deleteParamMutation.mutateAsync({ id: parameterId, testCaseId });
      toast({
        title: 'Success',
        description: 'Parameter deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete parameter',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!confirm('Delete this data row?')) return;

    try {
      await deleteRowMutation.mutateAsync({ id: rowId, testCaseId });
      toast({
        title: 'Success',
        description: 'Data row deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete data row',
        variant: 'destructive',
      });
    }
  };

  const handleEditRow = (rowId: string) => {
    setEditingRowId(rowId);
    setIsEditorOpen(true);
  };

  const handleAddRow = () => {
    setEditingRowId(null);
    setIsEditorOpen(true);
  };

  const handleExportCSV = () => {
    if (parameters.length === 0) {
      toast({
        title: 'Error',
        description: 'No parameters defined to export',
        variant: 'destructive',
      });
      return;
    }

    const headers = parameters.map(p => p.parameter_name);
    const rows = dataRows.map(row => 
      parameters.map(p => row.row_data[p.parameter_name] ?? '')
    );

    exportToCSV([headers, ...rows], `test-data-${testCaseId.slice(0, 8)}.csv`);

    toast({
      title: 'Success',
      description: 'CSV file exported successfully',
    });
  };

  if (loadingParams || loadingRows) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Test Data Parameters</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportOpen(true)}
            disabled={parameters.length === 0}
            className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={parameters.length === 0 || dataRows.length === 0}
            className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Add Parameter Form */}
      <div className="flex items-end gap-2 p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium text-foreground">Parameter Name</label>
          <Input
            value={newParamName}
            onChange={(e) => setNewParamName(e.target.value)}
            placeholder="e.g., username, password"
            maxLength={255}
          />
        </div>
        <div className="w-40 space-y-1">
          <label className="text-sm font-medium text-foreground">Type</label>
          <Select value={newParamType} onValueChange={(v: ParameterType) => setNewParamType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="string">String</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
              <SelectItem value="date">Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleAddParameter}
          disabled={createParamMutation.isPending}
          className="bg-brand-gold text-white hover:bg-brand-gold-hover"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Parameter
        </Button>
      </div>

      {/* Data Table */}
      {parameters.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground mb-4">No parameters defined yet</p>
          <p className="text-sm text-muted-foreground">Add parameters above to start creating test data rows</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  {parameters.map((param) => (
                    <TableHead key={param.id}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{param.parameter_name}</div>
                          <div className="text-xs text-muted-foreground">{param.parameter_type}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteParameter(param.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={parameters.length + 2} className="text-center py-8 text-muted-foreground">
                      No data rows yet. Click "Add Row" to create test data.
                    </TableCell>
                  </TableRow>
                ) : (
                  dataRows.map((row, idx) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      {parameters.map((param) => (
                        <TableCell key={param.id}>
                          {String(row.row_data[param.parameter_name] ?? '')}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRow(row.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRow(row.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 border-t border-border bg-muted/30">
            <Button
              onClick={handleAddRow}
              className="bg-brand-gold text-white hover:bg-brand-gold-hover"
              disabled={parameters.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Data Row
            </Button>
            {dataRows.length > 0 && (
              <span className="ml-4 text-sm text-muted-foreground">
                {dataRows.length} data row{dataRows.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {isEditorOpen && (
        <DataRowEditor
          testCaseId={testCaseId}
          parameters={parameters}
          rowId={editingRowId}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingRowId(null);
          }}
        />
      )}

      {isImportOpen && (
        <CSVImportModal
          testCaseId={testCaseId}
          parameters={parameters}
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
        />
      )}
    </div>
  );
};
