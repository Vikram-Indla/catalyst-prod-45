/**
 * Resource Cost & Budget Section for Edit User Modal
 * Collapsible section for managing resource costs
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, DollarSign, History } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { 
  useResourceCostHistory, 
  useResourceCurrentCost, 
  useAddResourceCost,
  formatSAR 
} from '../hooks/useResourceCost';
import type { ResourceCostFormData } from '../types';

const costSchema = z.object({
  resource_type: z.enum(['fixed', 'variable']),
  monthly_cost: z.number().min(0, 'Cost must be positive'),
  effective_from: z.date(),
});

interface ResourceCostSectionProps {
  resourceId: string;
  onCostChange?: (monthlyCost: number, resourceType: 'fixed' | 'variable') => void;
}

export function ResourceCostSection({ resourceId, onCostChange }: ResourceCostSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const { data: costHistory = [], isLoading: historyLoading } = useResourceCostHistory(resourceId);
  const { data: currentCost, isLoading: currentLoading } = useResourceCurrentCost(resourceId);
  const addCost = useAddResourceCost();

  const form = useForm<z.infer<typeof costSchema>>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      resource_type: 'variable',
      monthly_cost: 0,
      effective_from: new Date(),
    },
  });

  // Sync form with current cost when loaded
  useEffect(() => {
    if (currentCost) {
      form.reset({
        resource_type: currentCost.resource_type,
        monthly_cost: currentCost.monthly_cost,
        effective_from: new Date(),
      });
    }
  }, [currentCost, form]);

  const watchedMonthlyCost = form.watch('monthly_cost');
  const watchedResourceType = form.watch('resource_type');
  const annualCost = watchedMonthlyCost * 12;

  // Notify parent of cost changes
  useEffect(() => {
    onCostChange?.(watchedMonthlyCost, watchedResourceType);
  }, [watchedMonthlyCost, watchedResourceType, onCostChange]);

  const onSubmit = async (data: z.infer<typeof costSchema>) => {
    await addCost.mutateAsync({
      resourceId,
      data: {
        resource_type: data.resource_type,
        monthly_cost: data.monthly_cost,
        effective_from: format(data.effective_from, 'yyyy-MM-dd'),
      },
    });
  };

  const isLoading = historyLoading || currentLoading;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-4 h-auto">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-medium">Cost & Budget</span>
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  Finance
                </Badge>
              </div>
              {currentCost && (
                <p className="text-sm text-muted-foreground">
                  {formatSAR(currentCost.monthly_cost)}/mo • {currentCost.resource_type === 'fixed' ? 'Fixed' : 'Variable'}
                </p>
              )}
            </div>
          </div>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Resource Type */}
            <div className="space-y-3">
              <Label>Resource Type</Label>
              <RadioGroup
                value={watchedResourceType}
                onValueChange={(value) => form.setValue('resource_type', value as 'fixed' | 'variable')}
                className="grid grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="fixed"
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-lg border-2 p-4 cursor-pointer transition-colors',
                    watchedResourceType === 'fixed' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="fixed" id="fixed" />
                    <span className="font-medium">Fixed</span>
                    <Badge className="bg-blue-100 text-blue-700 text-xs">Project</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    Dedicated to specific project, locked budget
                  </p>
                </Label>

                <Label
                  htmlFor="variable"
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-lg border-2 p-4 cursor-pointer transition-colors',
                    watchedResourceType === 'variable' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="variable" id="variable" />
                    <span className="font-medium">Variable</span>
                    <Badge className="bg-amber-100 text-amber-700 text-xs">Pool</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    Shared across projects, contract-based
                  </p>
                </Label>
              </RadioGroup>
            </div>

            {/* Monthly Cost */}
            <div className="space-y-2">
              <Label htmlFor="monthly_cost">Monthly Cost</Label>
              <div className="relative">
                <Input
                  id="monthly_cost"
                  type="number"
                  placeholder="0"
                  className="pr-12"
                  {...form.register('monthly_cost', { valueAsNumber: true })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  SAR
                </span>
              </div>
              {form.formState.errors.monthly_cost && (
                <p className="text-sm text-destructive">{form.formState.errors.monthly_cost.message}</p>
              )}
            </div>

            {/* Annual Cost (Calculated) */}
            <div className="space-y-2">
              <Label>Annual Cost</Label>
              <div className="p-3 bg-muted rounded-lg">
                <span className="text-lg font-semibold">{formatSAR(annualCost)}</span>
                <span className="text-sm text-muted-foreground ml-2">/ year</span>
              </div>
            </div>

            {/* Cost Effective From */}
            <div className="space-y-2">
              <Label>Cost Effective From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !form.watch('effective_from') && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch('effective_from') 
                      ? format(form.watch('effective_from'), 'PPP') 
                      : 'Select date'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch('effective_from')}
                    onSelect={(date) => date && form.setValue('effective_from', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Save Button */}
            <Button type="submit" className="w-full" disabled={addCost.isPending}>
              {addCost.isPending ? 'Saving...' : 'Save Cost Record'}
            </Button>
          </form>
        )}

        {/* Cost History */}
        {costHistory.length > 0 && (
          <Collapsible open={showHistory} onOpenChange={setShowHistory}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  <span>Cost History</span>
                  <Badge variant="secondary" className="text-xs">{costHistory.length}</Badge>
                </div>
                {showHistory ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {costHistory.map((record, index) => (
                  <div 
                    key={record.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg',
                      index === 0 ? 'bg-green-50 border border-green-200' : 'bg-muted'
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {format(new Date(record.effective_from), 'dd MMM yyyy')} – {' '}
                        {record.effective_to 
                          ? format(new Date(record.effective_to), 'dd MMM yyyy')
                          : 'Current'
                        }
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {record.resource_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatSAR(record.monthly_cost)}/mo</span>
                      {index === 0 && (
                        <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
