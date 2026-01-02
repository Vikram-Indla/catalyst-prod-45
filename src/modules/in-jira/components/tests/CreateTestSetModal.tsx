/**
 * Create Test Set Modal
 * Supports regular and smart sets with criteria builder
 */

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Folder,
  Zap,
  FileText,
  Filter,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateTestSetInput, SmartSetCriteria } from '../../hooks/useTestSets';
import { useTestCases, TestCase } from '../../hooks/useTestCases';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
  objective: z.string().optional(),
  is_smart_set: z.boolean().default(false),
  is_versioned: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTestSetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  onSubmit: (input: CreateTestSetInput) => Promise<void>;
  isSubmitting?: boolean;
}

const STATUS_OPTIONS = ['draft', 'under_review', 'approved', 'published', 'deprecated'];
const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low'];

export function CreateTestSetModal({
  open,
  onOpenChange,
  programId,
  onSubmit,
  isSubmitting,
}: CreateTestSetModalProps) {
  const [smartCriteria, setSmartCriteria] = useState<SmartSetCriteria>({});
  const [activeTab, setActiveTab] = useState('details');
  
  // Fetch test cases for preview
  const { testCases } = useTestCases(programId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      objective: '',
      is_smart_set: false,
      is_versioned: false,
    },
  });

  const isSmartSet = form.watch('is_smart_set');

  // Preview matching cases for smart set
  const matchingCases = useMemo(() => {
    if (!isSmartSet || !testCases.length) return [];
    
    return testCases.filter(tc => {
      if (smartCriteria.status?.length && !smartCriteria.status.includes(tc.status)) {
        return false;
      }
      if (smartCriteria.priority?.length && !smartCriteria.priority.includes(tc.priority)) {
        return false;
      }
      if (smartCriteria.labels?.length && tc.labels) {
        const hasMatch = smartCriteria.labels.some(l => tc.labels?.includes(l));
        if (!hasMatch) return false;
      }
      if (smartCriteria.component?.length && tc.component) {
        if (!smartCriteria.component.includes(tc.component)) return false;
      }
      return true;
    });
  }, [isSmartSet, testCases, smartCriteria]);

  const toggleCriteriaValue = (field: keyof SmartSetCriteria, value: string) => {
    setSmartCriteria(prev => {
      const current = prev[field] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated.length ? updated : undefined };
    });
  };

  const handleSubmit = async (values: FormValues) => {
    await onSubmit({
      name: values.name,
      description: values.description,
      objective: values.objective,
      program_id: programId,
      is_smart_set: values.is_smart_set,
      smart_set_criteria: values.is_smart_set ? smartCriteria : undefined,
      is_versioned: values.is_versioned,
    });
    
    form.reset();
    setSmartCriteria({});
    setActiveTab('details');
    onOpenChange(false);
  };

  const handleClose = () => {
    form.reset();
    setSmartCriteria({});
    setActiveTab('details');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-accent-primary" />
            Create Test Set
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="smart" disabled={!isSmartSet}>
                  <Zap className="h-3.5 w-3.5 mr-1" />
                  Smart Criteria
                </TabsTrigger>
                <TabsTrigger value="preview" disabled={!isSmartSet}>
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Preview ({matchingCases.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="flex-1 overflow-auto space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Regression Suite" {...field} />
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
                          placeholder="Describe the purpose of this test set..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="objective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objective</FormLabel>
                      <FormControl>
                        <Input placeholder="What this set validates..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <FormField
                    control={form.control}
                    name="is_smart_set"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-3 bg-surface-2 rounded-lg border border-border-default">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-status-warning" />
                            Smart Set
                          </FormLabel>
                          <p className="text-xs text-text-tertiary">
                            Auto-include cases by criteria
                          </p>
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

                  <FormField
                    control={form.control}
                    name="is_versioned"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-3 bg-surface-2 rounded-lg border border-border-default">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-accent-primary" />
                            Versioned
                          </FormLabel>
                          <p className="text-xs text-text-tertiary">
                            Track version history
                          </p>
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
                </div>
              </TabsContent>

              <TabsContent value="smart" className="flex-1 overflow-auto py-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
                    <Filter className="h-4 w-4" />
                    Cases matching ALL selected criteria will be included
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map(status => (
                        <Badge
                          key={status}
                          variant={smartCriteria.status?.includes(status) ? 'default' : 'outline'}
                          className={cn(
                            'cursor-pointer transition-colors',
                            smartCriteria.status?.includes(status) && 'bg-accent-primary'
                          )}
                          onClick={() => toggleCriteriaValue('status', status)}
                        >
                          {status.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Priority Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Priority</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRIORITY_OPTIONS.map(priority => (
                        <Badge
                          key={priority}
                          variant={smartCriteria.priority?.includes(priority) ? 'default' : 'outline'}
                          className={cn(
                            'cursor-pointer transition-colors',
                            smartCriteria.priority?.includes(priority) && 'bg-accent-primary'
                          )}
                          onClick={() => toggleCriteriaValue('priority', priority)}
                        >
                          {priority}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Active Criteria Summary */}
                  {Object.keys(smartCriteria).length > 0 && (
                    <div className="p-3 bg-accent-subtle rounded-lg border border-accent-primary/20">
                      <p className="text-sm font-medium text-accent-primary mb-2">Active Criteria</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(smartCriteria).map(([key, values]) =>
                          values?.map(v => (
                            <Badge key={`${key}-${v}`} variant="secondary" className="text-xs">
                              {key}: {v}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 overflow-hidden py-4">
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-text-secondary">
                      {matchingCases.length} cases match your criteria
                    </p>
                  </div>
                  <ScrollArea className="flex-1 border border-border-default rounded-lg">
                    {matchingCases.length === 0 ? (
                      <div className="p-8 text-center text-text-tertiary">
                        <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No cases match the current criteria</p>
                        <p className="text-xs mt-1">Adjust your filters to include cases</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border-default">
                        {matchingCases.slice(0, 50).map(tc => (
                          <div key={tc.id} className="p-3 flex items-center gap-3">
                            <FileText className="h-4 w-4 text-accent-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">
                                {tc.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-xs">
                                  {tc.status}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {tc.priority}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                        {matchingCases.length > 50 && (
                          <div className="p-3 text-center text-text-tertiary text-sm">
                            And {matchingCases.length - 50} more...
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-4 border-t border-border-default mt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Test Set
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
