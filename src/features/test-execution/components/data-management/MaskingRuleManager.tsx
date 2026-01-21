/**
 * Phase 5C: Masking Rule Manager Component
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMasking } from '../../hooks/useMasking';
import type { MaskingRule } from '../../types/test-data-management';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  field_pattern: z.string().min(1, 'Field pattern is required'),
  masking_type: z.enum(['redact', 'hash', 'partial', 'scramble']),
  show_first: z.number().min(0).optional(),
  show_last: z.number().min(0).optional(),
  priority: z.number().min(0),
});

type FormValues = z.infer<typeof formSchema>;

const maskingTypeLabels: Record<string, { label: string; description: string }> = {
  redact: { label: 'Redact', description: 'Replace all characters with mask' },
  hash: { label: 'Hash', description: 'Show hashed representation' },
  partial: { label: 'Partial', description: 'Show first/last N characters' },
  scramble: { label: 'Scramble', description: 'Randomize character order' },
};

export function MaskingRuleManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<MaskingRule | null>(null);
  const [testValue, setTestValue] = useState('');
  const [testField, setTestField] = useState('');
  
  const { 
    rules, 
    isLoading, 
    createRule, 
    updateRule, 
    deleteRule,
    applyMasking,
    isCreating,
    isUpdating,
    isDeleting
  } = useMasking();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      field_pattern: '',
      masking_type: 'redact',
      show_first: 0,
      show_last: 4,
      priority: 0,
    },
  });

  const filteredRules = rules.filter(rule =>
    rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.field_pattern.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (rule: MaskingRule) => {
    setEditingRule(rule);
    form.reset({
      name: rule.name,
      description: rule.description || '',
      field_pattern: rule.field_pattern,
      masking_type: rule.masking_type,
      show_first: (rule.masking_config as { show_first?: number })?.show_first || 0,
      show_last: (rule.masking_config as { show_last?: number })?.show_last || 4,
      priority: rule.priority,
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteRule(id);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingRule(null);
    form.reset();
  };

  const onSubmit = async (values: FormValues) => {
    const data = {
      name: values.name,
      description: values.description || '',
      field_pattern: values.field_pattern,
      masking_type: values.masking_type,
      masking_config: values.masking_type === 'partial' 
        ? { show_first: values.show_first, show_last: values.show_last }
        : {},
      priority: values.priority,
    };

    try {
      if (editingRule) {
        await updateRule({ id: editingRule.id, ...data });
      } else {
        await createRule(data);
      }
      handleFormClose();
    } catch (error) {
      console.error('Failed to save rule:', error);
    }
  };

  const maskedTestValue = testField && testValue 
    ? applyMasking(testField, testValue)
    : '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>PII Masking Rules</CardTitle>
          </div>
          <Button onClick={() => setIsFormOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Masking */}
        <div className="rounded-lg border p-4 bg-muted/50">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Test Masking
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <Input
              placeholder="Field name (e.g., email)"
              value={testField}
              onChange={(e) => setTestField(e.target.value)}
            />
            <Input
              placeholder="Test value"
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
            />
            <div className="flex items-center gap-2 px-3 rounded-md bg-background border">
              <EyeOff className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-sm truncate">
                {maskedTestValue || 'Masked output'}
              </span>
            </div>
          </div>
        </div>

        {/* Rules List */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="secondary">{filteredRules.length} rules</Badge>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading rules...</div>
        ) : filteredRules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No rules match your search' : 'No masking rules created yet'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Pattern</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      {rule.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {rule.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {rule.field_pattern}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {maskingTypeLabels[rule.masking_type]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{rule.priority}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(rule.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Edit Masking Rule' : 'Create Masking Rule'}
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
                        <Input placeholder="e.g., Email Masking" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="field_pattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Field Pattern (Regex)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., email|e-mail" {...field} />
                      </FormControl>
                      <FormDescription>
                        Regular expression to match field names
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="masking_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Masking Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(maskingTypeLabels).map(([key, { label, description }]) => (
                            <SelectItem key={key} value={key}>
                              <div>
                                <div>{label}</div>
                                <div className="text-xs text-muted-foreground">{description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('masking_type') === 'partial' && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="show_first"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Show First N</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0}
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="show_last"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Show Last N</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0}
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Lower numbers are evaluated first
                      </FormDescription>
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
                        <Textarea placeholder="Optional description..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleFormClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating || isUpdating}>
                    {(isCreating || isUpdating) ? 'Saving...' : editingRule ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
