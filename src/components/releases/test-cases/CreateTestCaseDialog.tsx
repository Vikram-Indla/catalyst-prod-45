/**
 * CreateTestCaseDialog — God-tier modal for creating new test cases
 * Features:
 * - Form validation with Zod
 * - "Create another" option
 * - Keyboard accessible
 * - Template pre-fill support
 */

import { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { PrefilledTestCase } from './utils';

// Zod schema for validation
const createTestCaseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(5000, 'Description must be less than 5000 characters').optional(),
  type: z.enum(['functional', 'regression', 'smoke', 'integration', 'e2e', 'performance', 'security', 'usability']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  release: z.string().optional(),
  assignee: z.string().optional(),
  folder: z.string().optional(),
});

type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>;

interface CreateTestCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (testCase: CreateTestCaseInput & { id: string }) => void;
  prefillData?: PrefilledTestCase | null;
}

export function CreateTestCaseDialog({ 
  open, 
  onOpenChange,
  onSuccess,
  prefillData,
}: CreateTestCaseDialogProps) {
  const [createAnother, setCreateAnother] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateTestCaseInput>({
    resolver: zodResolver(createTestCaseSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'functional',
      priority: 'medium',
      release: '',
      assignee: '',
      folder: '',
    },
  });

  // Reset form when dialog closes, or pre-fill when data is provided
  useEffect(() => {
    if (!open) {
      form.reset();
    } else if (prefillData) {
      form.reset({
        title: prefillData.title || '',
        description: prefillData.description || '',
        type: prefillData.type || 'functional',
        priority: prefillData.priority || 'medium',
        release: '',
        assignee: '',
        folder: prefillData.folder || '',
      });
    }
  }, [open, prefillData, form]);

  const onSubmit = async (data: CreateTestCaseInput) => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newTestCase = {
      ...data,
      id: `TC-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`,
    };
    
    toast.success(`Test case ${newTestCase.id} created`, {
      description: data.title,
    });
    
    onSuccess?.(newTestCase);
    
    if (createAnother) {
      form.reset();
      form.setFocus('title');
    } else {
      onOpenChange(false);
    }
    
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {prefillData ? `Create from Template: ${prefillData.title}` : 'Create Test Case'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Verify user login with valid credentials"
              {...form.register('title')}
              className={form.formState.errors.title ? 'border-destructive' : ''}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this test case validates..."
              rows={3}
              {...form.register('description')}
            />
          </div>

          {/* Type & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.watch('type')}
                onValueChange={(value) => form.setValue('type', value as CreateTestCaseInput['type'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="functional">Functional</SelectItem>
                  <SelectItem value="regression">Regression</SelectItem>
                  <SelectItem value="smoke">Smoke</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                  <SelectItem value="e2e">End-to-End</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="usability">Usability</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Priority <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.watch('priority')}
                onValueChange={(value) => form.setValue('priority', value as CreateTestCaseInput['priority'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Critical
                    </span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      High
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      Low
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Folder & Assignee Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Folder</Label>
              <Select
                value={form.watch('folder')}
                onValueChange={(value) => form.setValue('folder', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select folder..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="authentication">Authentication</SelectItem>
                  <SelectItem value="payments">Payments</SelectItem>
                  <SelectItem value="api-tests">API Tests</SelectItem>
                  <SelectItem value="user-management">User Management</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="core-features">Core Features</SelectItem>
                  <SelectItem value="ecommerce">E-Commerce</SelectItem>
                  <SelectItem value="ui-ux">UI/UX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assignee</Label>
              <Select
                value={form.watch('assignee')}
                onValueChange={(value) => form.setValue('assignee', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user-vs">Vikram Singh</SelectItem>
                  <SelectItem value="user-aa">Ahmed Al-Rashid</SelectItem>
                  <SelectItem value="user-sk">Sara Khan</SelectItem>
                  <SelectItem value="user-mr">Mohammed Rahman</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Release */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Release</Label>
            <Select
              value={form.watch('release')}
              onValueChange={(value) => form.setValue('release', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select release..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REL-26.01.01">REL-26.01.01 - Investment Portal Q1</SelectItem>
                <SelectItem value="REL-26.01.02">REL-26.01.02 - Licensing Module v2</SelectItem>
                <SelectItem value="REL-25.12.01">REL-25.12.01 - Security Patch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Create Another Checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="createAnother"
              checked={createAnother}
              onCheckedChange={(checked) => setCreateAnother(!!checked)}
            />
            <Label htmlFor="createAnother" className="text-sm text-muted-foreground cursor-pointer">
              Create another after saving
            </Label>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Test Case'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
