import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCreateDataRow, useUpdateDataRow, useTestDataRows } from '@/hooks/useTestData';
import { useToast } from '@/hooks/use-toast';
import type { TestParameter } from '@/types/testData.types';

interface DataRowEditorProps {
  testCaseId: string;
  parameters: TestParameter[];
  rowId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DataRowEditor: React.FC<DataRowEditorProps> = ({
  testCaseId,
  parameters,
  rowId,
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const { data: dataRows = [] } = useTestDataRows(testCaseId);
  const createMutation = useCreateDataRow();
  const updateMutation = useUpdateDataRow();

  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (rowId) {
      const existingRow = dataRows.find(r => r.id === rowId);
      if (existingRow) {
        setFormData(existingRow.row_data);
      }
    } else {
      // Initialize with empty values based on parameter types
      const initialData: Record<string, any> = {};
      parameters.forEach(param => {
        switch (param.parameter_type) {
          case 'boolean':
            initialData[param.parameter_name] = false;
            break;
          case 'number':
            initialData[param.parameter_name] = 0;
            break;
          case 'date':
            initialData[param.parameter_name] = new Date().toISOString().split('T')[0];
            break;
          default:
            initialData[param.parameter_name] = '';
        }
      });
      setFormData(initialData);
    }
  }, [rowId, dataRows, parameters]);

  const handleChange = (paramName: string, value: any, type: string) => {
    let processedValue = value;

    // Type conversion
    if (type === 'number') {
      processedValue = value === '' ? 0 : Number(value);
    } else if (type === 'boolean') {
      processedValue = Boolean(value);
    }

    setFormData(prev => ({
      ...prev,
      [paramName]: processedValue,
    }));
  };

  const handleSave = async () => {
    try {
      if (rowId) {
        await updateMutation.mutateAsync({
          id: rowId,
          testCaseId,
          row_data: formData,
        });
        toast({
          title: 'Success',
          description: 'Data row updated successfully',
        });
      } else {
        await createMutation.mutateAsync({
          test_case_id: testCaseId,
          row_data: formData,
        });
        toast({
          title: 'Success',
          description: 'Data row created successfully',
        });
      }
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save data row',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {rowId ? 'Edit Data Row' : 'Add Data Row'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {parameters.map((param) => (
            <div key={param.id} className="space-y-2">
              <Label htmlFor={param.parameter_name}>
                {param.parameter_name}
                <span className="ml-2 text-xs text-muted-foreground">({param.parameter_type})</span>
              </Label>

              {param.parameter_type === 'boolean' ? (
                <div className="flex items-center space-x-2">
                  <Switch
                    id={param.parameter_name}
                    checked={formData[param.parameter_name] || false}
                    onCheckedChange={(checked) => handleChange(param.parameter_name, checked, param.parameter_type)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData[param.parameter_name] ? 'True' : 'False'}
                  </span>
                </div>
              ) : (
                <Input
                  id={param.parameter_name}
                  type={
                    param.parameter_type === 'number'
                      ? 'number'
                      : param.parameter_type === 'date'
                      ? 'date'
                      : 'text'
                  }
                  value={formData[param.parameter_name] ?? ''}
                  onChange={(e) => handleChange(param.parameter_name, e.target.value, param.parameter_type)}
                  placeholder={`Enter ${param.parameter_name}`}
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="bg-brand-gold text-white hover:bg-brand-gold-hover"
          >
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
