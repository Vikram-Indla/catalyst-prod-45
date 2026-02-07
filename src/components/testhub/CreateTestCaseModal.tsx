/**
 * Create Test Case Modal for TestHub
 * Full-featured modal with form fields and test steps
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface CreateTestCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  folderId?: string | null;
}

interface TestStep {
  action: string;
  expected_result: string;
}

export function CreateTestCaseModal({
  open,
  onOpenChange,
  projectId,
  folderId,
}: CreateTestCaseModalProps) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    preconditions: '',
    priority: 'medium',
    type: 'functional',
    status: 'draft',
    automation_status: 'manual',
  });
  
  const [steps, setSteps] = useState<TestStep[]>([
    { action: '', expected_result: '' }
  ]);

  // Generate next case_key
  const generateCaseKey = async (): Promise<string> => {
    const { data } = await supabase
      .from('tm_test_cases')
      .select('case_key')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0 && data[0].case_key) {
      const match = data[0].case_key.match(/TC-(\d+)/);
      if (match) {
        const lastNum = parseInt(match[1], 10);
        return `TC-${String(lastNum + 1).padStart(4, '0')}`;
      }
    }
    return 'TC-0001';
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate case key
      const case_key = await generateCaseKey();
      
      // Get priority and type IDs
      const { data: priorities } = await supabase
        .from('tm_case_priorities')
        .select('id')
        .eq('project_id', projectId)
        .ilike('name', formData.priority)
        .limit(1);
      
      const { data: types } = await supabase
        .from('tm_case_types')
        .select('id')
        .eq('project_id', projectId)
        .ilike('name', formData.type)
        .limit(1);

      // Insert test case - use object format for insert
      const insertData = {
        project_id: projectId,
        case_key,
        title: formData.title,
        description: formData.description || null,
        preconditions: formData.preconditions || null,
        status: formData.status,
        automation_status: formData.automation_status,
        priority_id: priorities?.[0]?.id || null,
        case_type_id: types?.[0]?.id || null,
        folder_id: folderId || null,
        created_by: user.id,
        version: 1,
      };

      const { data: testCase, error: tcError } = await supabase
        .from('tm_test_cases')
        .insert(insertData as any)
        .select()
        .single();
      
      if (tcError) throw tcError;
      
      // Insert steps if any have content
      const stepsToInsert = steps
        .filter(s => s.action.trim())
        .map((step, index) => ({
          test_case_id: testCase.id,
          step_number: index + 1,
          action: step.action,
          expected_result: step.expected_result || '',
        }));
      
      if (stepsToInsert.length > 0) {
        const { error: stepsError } = await supabase
          .from('tm_test_steps')
          .insert(stepsToInsert);
        
        if (stepsError) throw stepsError;
      }
      
      return testCase;
    },
    onSuccess: (testCase) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders-with-counts'] });
      toast.success(`Test case ${testCase.case_key} created`);
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      console.error('Failed to create test case:', error);
      toast.error(`Failed to create test case: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      preconditions: '',
      priority: 'medium',
      type: 'functional',
      status: 'draft',
      automation_status: 'manual',
    });
    setSteps([{ action: '', expected_result: '' }]);
  };

  const addStep = () => {
    setSteps([...steps, { action: '', expected_result: '' }]);
  };

  const updateStep = (index: number, field: keyof TestStep, value: string) => {
    const updated = [...steps];
    updated[index][field] = value;
    setSteps(updated);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Test Case</DialogTitle>
          <DialogDescription>
            Add a new test case to the repository
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Main Form */}
            <div className="col-span-2 space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter a descriptive title..."
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description / Objective</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this test verify?"
                  rows={3}
                />
              </div>

              {/* Preconditions */}
              <div className="space-y-2">
                <Label htmlFor="preconditions">Preconditions</Label>
                <Textarea
                  id="preconditions"
                  value={formData.preconditions}
                  onChange={(e) => setFormData({ ...formData, preconditions: e.target.value })}
                  placeholder="List conditions that must be met..."
                  rows={2}
                />
              </div>

              {/* Test Steps */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Test Steps</Label>
                  <span className="text-xs text-muted-foreground">{steps.length} step(s)</span>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto divide-y">
                    {steps.map((step, index) => (
                      <div key={index} className="flex gap-3 p-3 bg-surface-1">
                        {/* Step Number */}
                        <div className="flex-shrink-0 pt-2">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                            {index + 1}
                          </div>
                        </div>
                        
                        {/* Step Content */}
                        <div className="flex-1 space-y-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Action</Label>
                            <Textarea
                              value={step.action}
                              onChange={(e) => updateStep(index, 'action', e.target.value)}
                              placeholder="Describe the action to perform..."
                              rows={2}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Expected Result</Label>
                            <Textarea
                              value={step.expected_result}
                              onChange={(e) => updateStep(index, 'expected_result', e.target.value)}
                              placeholder="Describe the expected outcome..."
                              rows={2}
                              className="text-sm"
                            />
                          </div>
                        </div>
                        
                        {/* Delete Button */}
                        <div className="flex-shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeStep(index)}
                            disabled={steps.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Add Step Button */}
                  <div className="p-2 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-dashed"
                      onClick={addStep}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Step
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Metadata */}
            <div className="space-y-4">
              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="functional">Functional</SelectItem>
                    <SelectItem value="regression">Regression</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="integration">Integration</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="deprecated">Deprecated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Automation */}
              <div className="space-y-2">
                <Label htmlFor="automation">Automation</Label>
                <Select
                  value={formData.automation_status}
                  onValueChange={(value) => setFormData({ ...formData, automation_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="automated">Automated</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Test Case'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
