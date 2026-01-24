/**
 * EditTestCaseDialog — Dialog for editing test case details
 * FULLY WIRED: Loads real steps from DB, persists all fields including priority/type
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  X,
  Loader2,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { CaseStatus } from '@/types/test-management';

// Use canonical hooks
import { useTestCaseSteps, useUpdateTestCase } from '@/hooks/test-management/useTestCases';
import { useCasePriorities, useCaseTypes } from '@/hooks/test-management/useAdminConfig';

interface TestStep {
  id: string;
  step_number: number;
  action: string;
  expected_result: string;
  test_data?: string;
}

// UUID validation helper
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

interface TestCase {
  id: string;       // Display key like "TES-0001"
  dbId?: string;    // Actual database UUID
  title: string;
  description?: string;
  preconditions?: string;
  status: 'draft' | 'ready' | 'approved' | 'deprecated';
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'functional' | 'regression' | 'smoke' | 'integration' | 'e2e';
  tags?: string[];
  priority_id?: string;
  type_id?: string;
  project_id?: string;
}

interface EditTestCaseDialogProps {
  testCase: TestCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  projectId?: string;
}

// Map priority labels to IDs (canonical mapping)
const PRIORITY_LABEL_TO_ID: Record<string, string> = {
  'critical': '00000000-0000-0000-0001-000000000001',
  'high': '00000000-0000-0000-0001-000000000002',
  'medium': '00000000-0000-0000-0001-000000000003',
  'low': '00000000-0000-0000-0001-000000000004',
};

// Map type labels to IDs (canonical mapping)
const TYPE_LABEL_TO_ID: Record<string, string> = {
  'functional': '00000000-0000-0000-0002-000000000001',
  'regression': '00000000-0000-0000-0002-000000000002',
  'smoke': '00000000-0000-0000-0002-000000000003',
  'integration': '00000000-0000-0000-0002-000000000004',
  'e2e': '00000000-0000-0000-0002-000000000005',
};

// Map status from UI to DB
const STATUS_UI_TO_DB: Record<string, CaseStatus> = {
  'draft': 'DRAFT',
  'ready': 'REVIEW',
  'approved': 'APPROVED',
  'deprecated': 'DEPRECATED',
};

export function EditTestCaseDialog({
  testCase,
  open,
  onOpenChange,
  onSuccess,
  projectId,
}: EditTestCaseDialogProps) {
  const queryClient = useQueryClient();
  const updateTestCaseMutation = useUpdateTestCase();
  
  // Resolve UUID: prefer dbId (actual UUID), fall back to id only if it's a valid UUID
  const caseUuid = testCase?.dbId ?? (testCase?.id && isValidUUID(testCase.id) ? testCase.id : null);
  const displayKey = testCase?.id || 'Unknown';
  
  // Load real steps from DB using UUID
  const { data: dbSteps = [], isLoading: stepsLoading } = useTestCaseSteps(caseUuid);
  
  // Load priorities and types for mapping
  const { data: priorities = [] } = useCasePriorities(projectId);
  const { data: types = [] } = useCaseTypes(projectId);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preconditions, setPreconditions] = useState('');
  const [status, setStatus] = useState<'draft' | 'ready' | 'approved' | 'deprecated'>('draft');
  const [priorityId, setPriorityId] = useState<string>('');
  const [typeId, setTypeId] = useState<string>('');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [activeTab, setActiveTab] = useState('details');
  const [stepsInitialized, setStepsInitialized] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  // Memoize priority/type lookup maps to prevent useEffect re-runs
  const priorityIdByName = useMemo(() => 
    priorities.reduce((acc, p) => {
      acc[p.name.toLowerCase()] = p.id;
      return acc;
    }, {} as Record<string, string>),
    [priorities]
  );

  const typeIdByName = useMemo(() => 
    types.reduce((acc, t) => {
      acc[t.name.toLowerCase()] = t.id;
      return acc;
    }, {} as Record<string, string>),
    [types]
  );

  // Reset form ONLY when dialog opens or test case changes - NOT on every render
  useEffect(() => {
    if (testCase && open && !formInitialized) {
      setTitle(testCase.title);
      setDescription(testCase.description || '');
      setPreconditions(testCase.preconditions || '');
      setStatus(testCase.status);
      setTags(testCase.tags || []);
      setActiveTab('details');
      setStepsInitialized(false);
      
      // Resolve priority ID
      if (testCase.priority_id) {
        setPriorityId(testCase.priority_id);
      } else if (testCase.priority) {
        const mappedId = priorityIdByName[testCase.priority] || PRIORITY_LABEL_TO_ID[testCase.priority];
        setPriorityId(mappedId || '');
      }
      
      // Resolve type ID
      if (testCase.type_id) {
        setTypeId(testCase.type_id);
      } else if (testCase.type) {
        const mappedId = typeIdByName[testCase.type] || TYPE_LABEL_TO_ID[testCase.type];
        setTypeId(mappedId || '');
      }
      
      setFormInitialized(true);
    }
    
    // Reset initialization flag when dialog closes
    if (!open) {
      setFormInitialized(false);
    }
  }, [testCase, open, formInitialized, priorityIdByName, typeIdByName]);

  // Initialize steps from DB when loaded
  useEffect(() => {
    if (!stepsLoading && dbSteps.length >= 0 && !stepsInitialized && open) {
      const mappedSteps: TestStep[] = dbSteps.map(s => ({
        id: s.id,
        step_number: s.step_number,
        action: s.action,
        expected_result: s.expected_result,
        test_data: s.test_data || undefined,
      }));
      setSteps(mappedSteps);
      setStepsInitialized(true);
    }
  }, [dbSteps, stepsLoading, stepsInitialized, open]);

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
      id: `new-step-${Date.now()}`,
      step_number: steps.length + 1,
      action: '',
      expected_result: '',
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
    setSteps(filtered.map((s, idx) => ({ ...s, step_number: idx + 1 })));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(steps);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    setSteps(items.map((s, idx) => ({ ...s, step_number: idx + 1 })));
  };

  const handleSave = async () => {
    if (!testCase || !title.trim()) {
      toast.error('Title is required');
      return;
    }

    // Validate UUID before saving
    if (!caseUuid) {
      toast.error('Cannot save: invalid test case UUID');
      return;
    }

    const resolvedProjectId = projectId || testCase.project_id;
    if (!resolvedProjectId) {
      toast.error('Project ID not available');
      return;
    }

    // Use the canonical useUpdateTestCase hook which properly persists everything
    updateTestCaseMutation.mutate(
      {
        id: caseUuid, // Use the actual UUID, not the display key
        project_id: resolvedProjectId,
        title: title.trim(),
        objective: description.trim() || undefined,
        preconditions: preconditions.trim() || undefined,
        status: STATUS_UI_TO_DB[status] || 'DRAFT',
        priority_id: priorityId || undefined,
        type_id: typeId || undefined,
        // Steps are properly persisted by useUpdateTestCase (lines 443-456 in useTestCases.ts)
        steps: steps.map(s => ({
          action: s.action,
          expected_result: s.expected_result,
          test_data: s.test_data,
        })),
      },
      {
        onSuccess: () => {
          toast.success('Test case updated');
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error) => {
          toast.error(`Failed to update: ${error.message}`);
        },
      }
    );
  };

  if (!testCase) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-mono text-muted-foreground">{displayKey}</span>
              <DialogTitle className="mt-1">Edit Test Case</DialogTitle>
              <DialogDescription className="sr-only">
                Edit test case details including title, description, status, priority, type, and steps
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4 flex-shrink-0">
            <TabsList className="grid grid-cols-2 w-64">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="steps">
                Steps ({stepsLoading ? '...' : steps.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="details" className="mt-0 space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  name="edit-title"
                  autoComplete="off"
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

              {/* Status, Priority, Type - Using IDs */}
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
                  <Select value={priorityId} onValueChange={setPriorityId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.length > 0 ? (
                        priorities.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value={PRIORITY_LABEL_TO_ID.critical}>Critical</SelectItem>
                          <SelectItem value={PRIORITY_LABEL_TO_ID.high}>High</SelectItem>
                          <SelectItem value={PRIORITY_LABEL_TO_ID.medium}>Medium</SelectItem>
                          <SelectItem value={PRIORITY_LABEL_TO_ID.low}>Low</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={typeId} onValueChange={setTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {types.length > 0 ? (
                        types.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value={TYPE_LABEL_TO_ID.functional}>Functional</SelectItem>
                          <SelectItem value={TYPE_LABEL_TO_ID.regression}>Regression</SelectItem>
                          <SelectItem value={TYPE_LABEL_TO_ID.smoke}>Smoke</SelectItem>
                          <SelectItem value={TYPE_LABEL_TO_ID.integration}>Integration</SelectItem>
                          <SelectItem value={TYPE_LABEL_TO_ID.e2e}>End-to-End</SelectItem>
                        </>
                      )}
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
              {stepsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="steps">
                      {(provided) => (
                        <div 
                          {...provided.droppableProps} 
                          ref={provided.innerRef}
                          className="space-y-3"
                        >
                          {steps.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <p className="text-sm">No steps yet. Add your first step below.</p>
                            </div>
                          ) : (
                            steps.map((step, index) => (
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
                                        {step.step_number}
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
                                            value={step.expected_result}
                                            onChange={(e) => handleUpdateStep(step.id, 'expected_result', e.target.value)}
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
                            ))
                          )}
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
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <div className="px-6 py-4 border-t border-border/60 dark:border-white/[0.035] bg-muted/30 dark:bg-white/[0.02] flex-shrink-0">
          <div className="flex flex-row items-center justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="whitespace-nowrap">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateTestCaseMutation.isPending} className="whitespace-nowrap">
              {updateTestCaseMutation.isPending ? (
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
