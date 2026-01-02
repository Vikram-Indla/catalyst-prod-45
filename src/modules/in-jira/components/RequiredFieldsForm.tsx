import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface ScreenField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'user';
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  description?: string;
}

interface RequiredFieldsFormProps {
  fields: ScreenField[];
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function RequiredFieldsForm({
  fields,
  initialValues = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Submit',
}: RequiredFieldsFormProps) {
  // Build dynamic schema based on fields
  const schemaShape: Record<string, z.ZodTypeAny> = {};
  
  fields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;
    
    switch (field.type) {
      case 'number':
        fieldSchema = z.coerce.number();
        break;
      case 'date':
        fieldSchema = z.string();
        break;
      default:
        fieldSchema = z.string();
    }

    if (field.required) {
      if (field.type === 'number') {
        fieldSchema = fieldSchema.refine((val) => val !== undefined && !isNaN(val as number), {
          message: `${field.name} is required`,
        });
      } else {
        fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.name} is required`);
      }
    } else {
      fieldSchema = fieldSchema.optional();
    }

    schemaShape[field.id] = fieldSchema;
  });

  const schema = z.object(schemaShape);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: fields.reduce((acc, field) => {
      acc[field.id] = initialValues[field.id] ?? '';
      return acc;
    }, {} as Record<string, unknown>),
  });

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit(values);
  });

  const renderField = (field: ScreenField) => {
    switch (field.type) {
      case 'textarea':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.name}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={field.placeholder}
                    {...formField}
                    value={formField.value as string}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'select':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.name}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <Select
                  onValueChange={formField.onChange}
                  defaultValue={formField.value as string}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder || `Select ${field.name}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'number':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.name}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={field.placeholder}
                    {...formField}
                    value={formField.value as number}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'date':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.name}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...formField}
                    value={formField.value as string}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      default:
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.name}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={field.placeholder}
                    {...formField}
                    value={formField.value as string}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map(renderField)}

        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
