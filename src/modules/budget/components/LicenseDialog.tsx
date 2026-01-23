/**
 * License Create/Edit Dialog - Simplified
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
  FormDescription,
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
import type { SoftwareLicenseWithAllocation, LicenseType } from '../types';

const licenseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  license_type: z.enum(['annual', 'monthly']),
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
        license_type: license.license_type === 'monthly' ? 'monthly' : 'annual',
        user_count: license.user_count,
        annual_cost: license.annual_cost,
        start_date: license.start_date ? new Date(license.start_date) : new Date(),
        renewal_date: license.renewal_date ? new Date(license.renewal_date) : null,
      });
    } else {
      form.reset({
        name: '',
        license_type: 'annual',
        user_count: null,
        annual_cost: 0,
        start_date: new Date(),
        renewal_date: null,
      });
    }
  }, [license, form]);

  const licenseType = form.watch('license_type');
  const annualCost = form.watch('annual_cost');
  const monthlyCost = annualCost / 12;

  const onSubmit = async (data: LicenseFormData) => {
    const payload = {
      name: data.name,
      vendor: '', // Not used but kept for DB compatibility
      category: null,
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit License' : 'Add License'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Software Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Jira, Figma, Salesforce" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="license_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Cycle</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="user_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Seats</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Optional"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormDescription>Leave empty for unlimited or usage-based</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="annual_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{licenseType === 'monthly' ? 'Monthly Cost (SAR)' : 'Annual Cost (SAR)'}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="0"
                        className="pr-12"
                        {...field}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          // If monthly, store as annual (×12)
                          field.onChange(licenseType === 'monthly' ? value * 12 : value);
                        }}
                        value={licenseType === 'monthly' ? (field.value / 12).toFixed(0) : field.value}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        SAR
                      </span>
                    </div>
                  </FormControl>
                  {licenseType === 'annual' && annualCost > 0 && (
                    <FormDescription>
                      ~{formatSAR(monthlyCost)}/month
                    </FormDescription>
                  )}
                  {licenseType === 'monthly' && annualCost > 0 && (
                    <FormDescription>
                      {formatSAR(annualCost)}/year total
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date fields in a row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
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
                            {field.value ? format(field.value, 'MMM d, yyyy') : 'Select date'}
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
                          className={cn("p-3 pointer-events-auto")}
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
                            {field.value ? format(field.value, 'MMM d, yyyy') : 'Select date'}
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
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-2">
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
