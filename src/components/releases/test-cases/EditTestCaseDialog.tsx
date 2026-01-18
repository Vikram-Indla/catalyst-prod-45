/**
 * EditTestCaseDialog — Dialog for editing test case details
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TestCase, TestCaseStep as TestStep } from '@/data/testCasesData';

// Hook for updating test cases
function useUpdateTestCaseApi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      description?: string;
      preconditions?: string;
      status?: string;
      tags?: string[];
      steps?: { step_number: number; action: string; expected_result: string; test_data?: string }[];
    }) => {
      const { id, ...updates } = data;
      const { data: result, error } = await supabase
        .from('test_cases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (updatedCase) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success('Test case updated');
    },
    onError: (error) => {
      toast.error('Failed to update test case');
    },
  });
}

interface EditTestCaseDialogProps {
  testCase: TestCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditTestCaseDialog({
  testCase,
  open,
  onOpenChange,
  onSuccess,
}: EditTestCaseDialogProps) {
  const updateTestCase = useUpdateTestCaseApi();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preconditions, setPreconditions] = useState('');
  const [status, setStatus] = useState<'draft' | 'ready' | 'approved' | 'deprecated'>('draft');
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [type, setType] = useState<'functional' | 'regression' | 'smoke' | 'integration' | 'e2e'>('functional');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [activeTab, setActiveTab] = useState('details');

  // Reset form when test case changes
  useEffect(() => {
    if (testCase) {
      setTitle(testCase.title);
      setDescription(testCase.description || '');
      setPreconditions(testCase.preconditions || '');
      setStatus(testCase.status);
      setPriority(testCase.priority);
      setType(testCase.type);
      setTags(testCase.tags || []);
      // Mock steps for now - would come from testCase.steps
      setSteps([
        { id: '1', step: 1, action: 'Navigate to the page', expectedResult: 'Page loads successfully' },
        { id: '2', step: 2, action: 'Perform the action', expectedResult: 'Expected result occurs' },
      ]);
      setActiveTab('details');
    }
  }, [testCase, open]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagsInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagsInput.trim())) {
        setTags([...tags, tagsInput.trim()]);
      }
      setTagsInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddStep = () => {
    const newStep: TestStep = {
      id: `step-${Date.now()}`,
      step: steps.length + 1,
      action: '',
      expectedResult: '',
    };
    setSteps([...steps, newStep]);
  };

  const handleUpdateStep = (id: string, field: keyof TestStep, value: string) => {
    setSteps(steps.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleRemoveStep = (id: string) => {
    const filtered = steps.filter(s => s.id !== id);
    setSteps(filtered.map((s, idx) => ({ ...s, step: idx + 1 })));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(steps);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    setSteps(items.map((s, idx) => ({ ...s, step: idx + 1 })));
  };

  const handleSave = async () => {
    if (!testCase || !title.trim()) {
      toast.error('Title is required');
      return;
    }

    updateTestCase.mutate(
      {
        id: testCase.id,
        title: title.trim(),
        description: description.trim() || undefined,
        preconditions: preconditions.trim() || undefined,
        status,
        tags: tags.length > 0 ? tags : undefined,
        steps: steps.map(s => ({
          step_number: s.step,
          action: s.action,
          expected_result: s.expectedResult,
          test_data: s.testData,
        })),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  if (!testCase) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-mono text-muted-foreground">{testCase.id}</span>
              <DialogTitle className="mt-1">Edit Test Case</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4">
            <TabsList className="grid grid-cols-2 w-64">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="steps">Steps ({steps.length})</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-6 py-4">
            <TabsContent value="details" className="mt-0 space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter test case title"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this test case covers..."
                  rows={3}
                />
              </div>

              {/* Status, Priority, Type */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
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

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
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

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="functional">Functional</SelectItem>
                      <SelectItem value="regression">Regression</SelectItem>
                      <SelectItem value="smoke">Smoke</SelectItem>
                      <SelectItem value="integration">Integration</SelectItem>
                      <SelectItem value="e2e">End-to-End</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preconditions */}
              <div className="space-y-2">
                <Label htmlFor="preconditions">Preconditions</Label>
                <Textarea
                  id="preconditions"
                  value={preconditions}
                  onChange={(e) => setPreconditions(e.target.value)}
                  placeholder="Any setup or conditions required before running this test..."
                  rows={2}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  id="tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Type a tag and press Enter..."
                />
              </div>
            </TabsContent>

            <TabsContent value="steps" className="mt-0">
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="steps">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={provided.innerRef}
                      className="space-y-3"
                    >
                      {steps.map((step, index) => (
                        <Draggable key={step.id} draggableId={step.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "p-4 rounded-lg border bg-card",
                                snapshot.isDragging && "shadow-lg ring-2 ring-primary"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  {...provided.dragHandleProps}
                                  className="mt-2 cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                                </div>
                                
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                                  {step.step}
                                </div>
                                
                                <div className="flex-1 space-y-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Action</Label>
                                    <Textarea
                                      value={step.action}
                                      onChange={(e) => handleUpdateStep(step.id, 'action', e.target.value)}
                                      placeholder="Describe the action..."
                                      rows={2}
                                    />
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Expected Result</Label>
                                    <Textarea
                                      value={step.expectedResult}
                                      onChange={(e) => handleUpdateStep(step.id, 'expectedResult', e.target.value)}
                                      placeholder="What should happen..."
                                      rows={2}
                                    />
                                  </div>
                                </div>
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground hover:text-destructive"
                                  onClick={() => handleRemoveStep(step.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={handleAddStep}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </Button>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateTestCase.isPending}>
            {updateTestCase.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
