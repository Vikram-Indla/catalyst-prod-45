/**
 * Create Test Case Modal - Per T2 Test Case Creation spec
 * Includes steps, preconditions, expected results
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useCreateTestCase } from '@/hooks/useTestManagement';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { TestFolder } from '@/types/test-management';

interface TestStepInput {
  id: string;
  action: string;
  expected_result: string;
}

interface CreateTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: TestFolder[];
}

export const CreateTestCaseModal: React.FC<CreateTestCaseModalProps> = ({
  isOpen,
  onClose,
  folders
}) => {
  const { toast } = useToast();
  const createMutation = useCreateTestCase();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    preconditions: '',
    expected_result: '',
    test_type: 'manual' as 'manual' | 'automated' | 'bdd',
    priority: 'medium' as 'critical' | 'high' | 'medium' | 'low',
    status: 'draft' as 'draft' | 'approved' | 'deprecated',
    folder_id: ''
  });

  const [steps, setSteps] = useState<TestStepInput[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('details');

  const addStep = () => {
    setSteps([
      ...steps,
      { id: crypto.randomUUID(), action: '', expected_result: '' }
    ]);
  };

  const updateStep = (id: string, field: 'action' | 'expected_result', value: string) => {
    setSteps(steps.map(step =>
      step.id === id ? { ...step, [field]: value } : step
    ));
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(step => step.id !== id));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      preconditions: '',
      expected_result: '',
      test_type: 'manual',
      priority: 'medium',
      status: 'draft',
      folder_id: ''
    });
    setSteps([]);
    setErrors({});
    setActiveTab('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (formData.title.length > 500) {
      newErrors.title = 'Title must be less than 500 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setActiveTab('details');
      return;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to create test cases',
          variant: 'destructive'
        });
        return;
      }

      // Create test case
      const newCase = await createMutation.mutateAsync({
        ...formData,
        folder_id: formData.folder_id || undefined,
        created_by: user.id
      });

      // Create steps if any
      if (steps.length > 0 && newCase) {
        const stepsToInsert = steps
          .filter(s => s.action.trim())
          .map((step, index) => ({
            test_case_id: newCase.id,
            step_order: index + 1,
            action: step.action.trim(),
            expected_result: step.expected_result.trim() || null
          }));

        if (stepsToInsert.length > 0) {
          await supabase.from('test_steps').insert(stepsToInsert);
        }
      }

      toast({
        title: 'Success',
        description: 'Test case created successfully'
      });

      resetForm();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create test case',
        variant: 'destructive'
      });
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="bg-brand-dark text-white p-6 -m-6 mb-0">
          <DialogTitle>Create New Test Case</DialogTitle>
          <DialogDescription className="text-gray-300">
            Fill in the details to create a new test case
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="steps">Steps ({steps.length})</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto py-4">
              <TabsContent value="details" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Enter test case title"
                    maxLength={500}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Enter test case description"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preconditions">Preconditions</Label>
                  <Textarea
                    id="preconditions"
                    value={formData.preconditions}
                    onChange={(e) =>
                      setFormData({ ...formData, preconditions: e.target.value })
                    }
                    placeholder="Enter preconditions required before executing this test"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="test_type">Test Type</Label>
                    <Select
                      value={formData.test_type}
                      onValueChange={(value: 'manual' | 'automated' | 'bdd') =>
                        setFormData({ ...formData, test_type: value })
                      }
                    >
                      <SelectTrigger id="test_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="automated">Automated</SelectItem>
                        <SelectItem value="bdd">BDD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: 'critical' | 'high' | 'medium' | 'low') =>
                        setFormData({ ...formData, priority: value })
                      }
                    >
                      <SelectTrigger id="priority">
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

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: 'draft' | 'approved' | 'deprecated') =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="deprecated">Deprecated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="folder">Folder</Label>
                  <Select
                    value={formData.folder_id || 'none'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, folder_id: value === 'none' ? '' : value })
                    }
                  >
                    <SelectTrigger id="folder">
                      <SelectValue placeholder="Select a folder (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No folder</SelectItem>
                      {folders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="steps" className="space-y-4 mt-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Add step-by-step instructions for this test case
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addStep}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Step
                  </Button>
                </div>

                {steps.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-2">No steps added yet</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addStep}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Add First Step
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {steps.map((step, index) => (
                      <div
                        key={step.id}
                        className="flex gap-3 p-3 border rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <GripVertical className="h-4 w-4 cursor-grab" />
                          <span className="font-medium text-sm w-6">
                            {index + 1}.
                          </span>
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input
                            value={step.action}
                            onChange={(e) => updateStep(step.id, 'action', e.target.value)}
                            placeholder="Step action (e.g., Click the login button)"
                          />
                          <Input
                            value={step.expected_result}
                            onChange={(e) => updateStep(step.id, 'expected_result', e.target.value)}
                            placeholder="Expected result (optional)"
                            className="text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStep(step.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-gold text-brand-dark hover:bg-brand-gold-hover"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Saving...' : 'Save Test Case'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
