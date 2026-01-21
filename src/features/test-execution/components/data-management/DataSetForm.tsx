/**
 * Phase 5C: Data Set Form Component
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDataSets } from '../../hooks/useDataSets';
import type { TestDataSet } from '../../types/test-data-management';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  data_type: z.enum(['json', 'csv', 'sql']),
  data_content: z.string().optional(),
  is_sensitive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface DataSetFormProps {
  open: boolean;
  onClose: () => void;
  dataSet?: TestDataSet | null;
  projectId?: string;
}

export function DataSetForm({ open, onClose, dataSet, projectId }: DataSetFormProps) {
  const { createDataSet, updateDataSet, isCreating, isUpdating } = useDataSets(projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: dataSet?.name || '',
      description: dataSet?.description || '',
      data_type: dataSet?.data_type || 'json',
      data_content: dataSet?.data_content ? JSON.stringify(dataSet.data_content, null, 2) : '',
      is_sensitive: dataSet?.is_sensitive || false,
    },
  });

  React.useEffect(() => {
    if (dataSet) {
      form.reset({
        name: dataSet.name,
        description: dataSet.description || '',
        data_type: dataSet.data_type,
        data_content: dataSet.data_content ? JSON.stringify(dataSet.data_content, null, 2) : '',
        is_sensitive: dataSet.is_sensitive,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        data_type: 'json',
        data_content: '',
        is_sensitive: false,
      });
    }
  }, [dataSet, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (dataSet) {
        await updateDataSet({
          id: dataSet.id,
          name: values.name,
          description: values.description || '',
          data_type: values.data_type,
          data_content: values.data_content || '',
          is_sensitive: values.is_sensitive,
        });
      } else {
        await createDataSet({
          name: values.name,
          description: values.description || '',
          data_type: values.data_type,
          data_content: values.data_content || '',
          is_sensitive: values.is_sensitive,
          project_id: projectId,
        });
      }
      onClose();
    } catch (error) {
      console.error('Failed to save data set:', error);
    }
  };

  const isSubmitting = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {dataSet ? 'Edit Data Set' : 'Create Data Set'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., User Credentials" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the data set..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select data type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="sql">SQL</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data_content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Content</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={form.watch('data_type') === 'json' 
                        ? '{\n  "users": [...]\n}'
                        : 'Enter data content...'
                      }
                      className="font-mono text-sm min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the test data in {form.watch('data_type').toUpperCase()} format
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_sensitive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Contains Sensitive Data</FormLabel>
                    <FormDescription>
                      Mark if this data set contains PII or sensitive information
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : dataSet ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
