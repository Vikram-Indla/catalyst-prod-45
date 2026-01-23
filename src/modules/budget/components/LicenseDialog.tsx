/**
 * License Create/Edit Dialog
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useCreateLicense, useUpdateLicense } from '../hooks/useSoftwareLicenses';
import { formatSAR } from '../hooks/useResourceCost';
import type { SoftwareLicenseWithAllocation, LicenseCategory, LicenseType } from '../types';
import { LICENSE_CATEGORIES, LICENSE_TYPES } from '../types';

const licenseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  vendor: z.string().min(1, 'Vendor is required'),
  category: z.string().nullable(),
  license_type: z.enum(['annual', 'monthly', 'consumption', 'perpetual']),
  user_count: z.number().nullable(),
  annual_cost: z.number().min(0, 'Cost must be positive'),
  start_date: z.date(),
  renewal_date: z.date().nullable(),
});

type LicenseFormData = z.infer<typeof licenseSchema>;

interface LicenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  license: SoftwareLicenseWithAllocation | null;
}

export function LicenseDialog({ open, onOpenChange, license }: LicenseDialogProps) {
  const createLicense = useCreateLicense();
  const updateLicense = useUpdateLicense();
  const isEditing = !!license;

  const form = useForm<LicenseFormData>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      name: '',
      vendor: '',
      category: null,
      license_type: 'annual',
      user_count: null,
      annual_cost: 0,
      start_date: new Date(),
      renewal_date: null,
    },
  });

  useEffect(() => {
    if (license) {
      form.reset({
        name: license.name,
        vendor: license.vendor,
        category: license.category,
        license_type: license.license_type,
        user_count: license.user_count,
        annual_cost: license.annual_cost,
        start_date: new Date(license.start_date),
        renewal_date: license.renewal_date ? new Date(license.renewal_date) : null,
      });
    } else {
      form.reset({
        name: '',
        vendor: '',
        category: null,
        license_type: 'annual',
        user_count: null,
        annual_cost: 0,
        start_date: new Date(),
        renewal_date: null,
      });
    }
  }, [license, form]);

  const annualCost = form.watch('annual_cost');
  const monthlyCost = annualCost / 12;

  const onSubmit = async (data: LicenseFormData) => {
    const payload = {
      name: data.name,
      vendor: data.vendor,
      category: data.category as LicenseCategory | null,
      license_type: data.license_type as LicenseType,
      user_count: data.user_count,
      annual_cost: data.annual_cost,
      start_date: format(data.start_date, 'yyyy-MM-dd'),
      renewal_date: data.renewal_date ? format(data.renewal_date, 'yyyy-MM-dd') : null,
    };

    if (isEditing) {
      await updateLicense.mutateAsync({ id: license.id, data: payload });
    } else {
      await createLicense.mutateAsync(payload);
    }
    
    onOpenChange(false);
  };

  const isPending = createLicense.isPending || updateLicense.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit License' : 'Add License'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Software Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Jira Align Enterprise" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vendor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Atlassian" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      value={field.value || ''} 
                      onValueChange={(value) => field.onChange(value || null)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LICENSE_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="license_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Type *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LICENSE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="user_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Users / Seats</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Leave empty for usage-based"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="annual_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual Cost (SAR) *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="0"
                        className="pr-12"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        SAR
                      </span>
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Monthly: {formatSAR(monthlyCost)}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="renewal_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Renewal Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={(date) => field.onChange(date || null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add License'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
