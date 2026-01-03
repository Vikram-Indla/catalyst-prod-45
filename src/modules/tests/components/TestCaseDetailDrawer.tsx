/**
 * Test Case Detail Drawer
 * Full-featured drawer with Overview, Steps, Links, History tabs
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Edit,
  Save,
  ChevronRight,
  Plus,
  Trash2,
  GripVertical,
  Link2,
  History,
  FileText,
  ListOrdered,
  ExternalLink,
  Loader2,
  AlertCircle,
  Library,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  runMutationWithAudit,
  createPipelineContext,
  PipelineError,
} from '../lib/actionPipeline';
import { SharedStepPickerModal } from './SharedStepPickerModal';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface TestCaseDrawerProps {
  testCaseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMode?: boolean;
  scopeType: 'program' | 'project';
  scopeId: string;
}

interface TestStep {
  id: string;
  step_order: number;
  action: string;
  expected_result: string | null;
}

interface WorkItemLink {
  id: string;
  work_item_id: string;
  work_item_type: string;
  link_type: string;
  title?: string;
}

interface AuditEntry {
  id: string;
  activity_type: string;
  description: string | null;
  created_at: string;
  user_name?: string;
}

// ═══════════════════════════════════════════════════════════════════
// HOOK: useTestCaseDetails
// ═══════════════════════════════════════════════════════════════════

function useTestCaseDetails(testCaseId: string | null) {
  return useQuery({
    queryKey: ['test-case-detail', testCaseId],
    queryFn: async () => {
      if (!testCaseId) return null;
      const { data, error } = await supabase
        .from('test_cases')
        .select('*')
        .eq('id', testCaseId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!testCaseId,
  });
}

function useTestSteps(testCaseId: string | null) {
  return useQuery({
    queryKey: ['test-case-steps', testCaseId],
    queryFn: async () => {
      if (!testCaseId) return [];
      const { data, error } = await supabase
        .from('test_steps')
        .select('*')
        .eq('test_case_id', testCaseId)
        .order('step_order', { ascending: true });
      if (error) throw error;
      return data as TestStep[];
    },
    enabled: !!testCaseId,
  });
}

function useWorkItemLinks(testCaseId: string | null) {
  return useQuery({
    queryKey: ['test-case-links', testCaseId],
    queryFn: async () => {
      if (!testCaseId) return [];
      const { data, error } = await supabase
        .from('test_case_work_items')
        .select('*')
        .eq('test_case_id', testCaseId);
      if (error) throw error;
      return data as WorkItemLink[];
    },
    enabled: !!testCaseId,
  });
}

function useTestCaseHistory(testCaseId: string | null) {
  return useQuery({
    queryKey: ['test-case-history', testCaseId],
    queryFn: async () => {
      if (!testCaseId) return [];
      const { data, error } = await supabase
        .from('test_activity_log')
        .select('*, profiles:user_id(full_name)')
        .eq('entity_id', testCaseId)
        .eq('entity_type', 'test_cases')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        activity_type: d.activity_type,
        description: d.description,
        created_at: d.created_at,
        user_name: d.profiles?.full_name || 'Unknown',
      })) as AuditEntry[];
    },
    enabled: !!testCaseId,
  });
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function TestCaseDetailDrawer({
  testCaseId,
  open,
  onOpenChange,
  editMode = false,
  scopeType,
  scopeId,
}: TestCaseDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(editMode);
  const [activeTab, setActiveTab] = useState('overview');
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [newStep, setNewStep] = useState({ action: '', expected_result: '' });

  const { data: testCase, isLoading, error } = useTestCaseDetails(testCaseId);
  const { data: steps = [], refetch: refetchSteps } = useTestSteps(testCaseId);
  const { data: links = [] } = useWorkItemLinks(testCaseId);
  const { data: history = [] } = useTestCaseHistory(testCaseId);

  // Initialize form data when test case loads
  React.useEffect(() => {
    if (testCase) {
      setFormData({
        title: testCase.title,
        description: testCase.description || '',
        preconditions: testCase.preconditions || '',
        status: testCase.status,
        priority: testCase.priority,
        test_type: testCase.test_type,
        component: testCase.component || '',
        objective: testCase.objective || '',
        estimated_effort: testCase.estimated_effort || '',
      });
    }
  }, [testCase]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!testCaseId || !user) throw new Error('Not authenticated');
      const context = createPipelineContext(user.id, scopeType, scopeId);
      
      return runMutationWithAudit({ id: testCaseId, ...formData }, {
        context,
        action: 'edit',
        entityType: 'test_cases',
        activityType: 'updated',
        successMessage: 'Test case saved',
        queryClient,
        invalidateKeys: [
          ['test-case-detail', testCaseId],
          ['test-cases', scopeId],
        ],
        mutationFn: async (data) => {
          const { id, ...updateData } = data;
          const { data: result, error } = await supabase
            .from('test_cases')
            .update({
              ...updateData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();
          if (error) throw new PipelineError('unknown', error.message);
          return result;
        },
        getAuditInfo: (input, result) => ({
          entityId: testCaseId,
          entityTitle: result.title,
          description: `Updated test case "${result.title}"`,
        }),
      });
    },
    onSuccess: () => {
      setIsEditing(false);
    },
  });

  // Add step mutation
  const addStepMutation = useMutation({
    mutationFn: async () => {
      if (!testCaseId || !user) throw new Error('Not authenticated');
      const maxOrder = steps.length > 0 ? Math.max(...steps.map(s => s.step_order)) : 0;
      const { error } = await supabase.from('test_steps').insert({
        test_case_id: testCaseId,
        step_order: maxOrder + 1,
        action: newStep.action,
        expected_result: newStep.expected_result || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewStep({ action: '', expected_result: '' });
      refetchSteps();
      toast.success('Step added');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Delete step mutation
  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase.from('test_steps').delete().eq('id', stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchSteps();
      toast.success('Step deleted');
    },
  });

  // Reorder steps
  const handleStepReorder = async (result: any) => {
    if (!result.destination) return;
    const items = Array.from(steps);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    // Update order in DB
    await Promise.all(
      items.map((step, idx) =>
        supabase.from('test_steps').update({ step_order: idx + 1 }).eq('id', step.id)
      )
    );
    refetchSteps();
  };

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] p-0 bg-surface-1 border-border-default">
        <SheetHeader className="px-4 py-3 border-b border-border-default flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base font-semibold text-text-primary">
              {testCase?.title || 'Test Case'}
            </SheetTitle>
            {testCase && (
              <Badge variant="outline" className="text-xs">
                {testCase.status}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-7 text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="h-7 text-xs bg-accent-primary text-white"
                >
                  {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                  Save
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-7 text-xs gap-1">
                <Edit className="h-3 w-3" /> Edit
              </Button>
            )}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
          </div>
        ) : error ? (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load test case</AlertDescription>
          </Alert>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="px-4 py-2 bg-surface-2 border-b border-border-default justify-start">
              <TabsTrigger value="overview" className="text-xs gap-1.5">
                <FileText className="h-3 w-3" /> Overview
              </TabsTrigger>
              <TabsTrigger value="steps" className="text-xs gap-1.5">
                <ListOrdered className="h-3 w-3" /> Steps ({steps.length})
              </TabsTrigger>
              <TabsTrigger value="links" className="text-xs gap-1.5">
                <Link2 className="h-3 w-3" /> Links ({links.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs gap-1.5">
                <History className="h-3 w-3" /> History
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              {/* Overview Tab */}
              <TabsContent value="overview" className="p-4 space-y-4 mt-0">
                <div className="grid gap-3">
                  <div>
                    <label className="text-xs text-text-tertiary mb-1 block">Title</label>
                    {isEditing ? (
                      <Input
                        value={formData.title || ''}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="h-8 text-sm bg-surface-2"
                      />
                    ) : (
                      <p className="text-sm text-text-primary">{testCase?.title}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-text-tertiary mb-1 block">Status</label>
                      {isEditing ? (
                        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                          <SelectTrigger className="h-8 text-xs bg-surface-2"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-surface-1">
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="under_review">Under Review</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="deprecated">Deprecated</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-xs">{testCase?.status}</Badge>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-text-tertiary mb-1 block">Priority</label>
                      {isEditing ? (
                        <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                          <SelectTrigger className="h-8 text-xs bg-surface-2"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-surface-1">
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-xs">{testCase?.priority}</Badge>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-text-tertiary mb-1 block">Type</label>
                      {isEditing ? (
                        <Select value={formData.test_type} onValueChange={(v) => setFormData({ ...formData, test_type: v })}>
                          <SelectTrigger className="h-8 text-xs bg-surface-2"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-surface-1">
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="automated">Automated</SelectItem>
                            <SelectItem value="bdd">BDD</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-text-secondary">{testCase?.test_type}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-text-tertiary mb-1 block">Description</label>
                    {isEditing ? (
                      <Textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="text-sm bg-surface-2 min-h-[80px]"
                      />
                    ) : (
                      <p className="text-sm text-text-secondary">{testCase?.description || '—'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-text-tertiary mb-1 block">Preconditions</label>
                    {isEditing ? (
                      <Textarea
                        value={formData.preconditions || ''}
                        onChange={(e) => setFormData({ ...formData, preconditions: e.target.value })}
                        className="text-sm bg-surface-2 min-h-[60px]"
                      />
                    ) : (
                      <p className="text-sm text-text-secondary">{testCase?.preconditions || '—'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-text-tertiary mb-1 block">Component</label>
                      {isEditing ? (
                        <Input
                          value={formData.component || ''}
                          onChange={(e) => setFormData({ ...formData, component: e.target.value })}
                          className="h-8 text-sm bg-surface-2"
                        />
                      ) : (
                        <span className="text-sm text-text-secondary">{testCase?.component || '—'}</span>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-text-tertiary mb-1 block">Est. Effort (min)</label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={formData.estimated_effort || ''}
                          onChange={(e) => setFormData({ ...formData, estimated_effort: e.target.value })}
                          className="h-8 text-sm bg-surface-2"
                        />
                      ) : (
                        <span className="text-sm text-text-secondary">{testCase?.estimated_effort || '—'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Steps Tab */}
              <TabsContent value="steps" className="p-4 space-y-3 mt-0">
                <DragDropContext onDragEnd={handleStepReorder}>
                  <Droppable droppableId="steps">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                        {steps.map((step, idx) => (
                          <Draggable key={step.id} draggableId={step.id} index={idx}>
                            {(prov) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                className="flex gap-2 p-2 bg-surface-2 border border-border-default rounded-lg"
                              >
                                <div {...prov.dragHandleProps} className="cursor-grab pt-1">
                                  <GripVertical className="h-4 w-4 text-text-tertiary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="text-[10px] px-1.5">Step {step.step_order}</Badge>
                                    {(step as any).is_shared && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 text-accent-primary border-accent-primary/30">
                                        <Library className="h-2.5 w-2.5 mr-0.5" />
                                        Library
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-text-primary mb-1">{step.action}</p>
                                  {step.expected_result && (
                                    <p className="text-[11px] text-text-tertiary">
                                      <span className="font-medium">Expected:</span> {step.expected_result}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0"
                                  onClick={() => deleteStepMutation.mutate(step.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-status-error" />
                                </Button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>

                {/* Add step form */}
                <div className="p-3 bg-surface-3 border border-border-default rounded-lg space-y-2">
                  <p className="text-xs font-medium text-text-secondary">Add Step</p>
                  <Input
                    placeholder="Action / Step description"
                    value={newStep.action}
                    onChange={(e) => setNewStep({ ...newStep, action: e.target.value })}
                    className="h-8 text-xs bg-surface-2"
                  />
                  <Input
                    placeholder="Expected result (optional)"
                    value={newStep.expected_result}
                    onChange={(e) => setNewStep({ ...newStep, expected_result: e.target.value })}
                    className="h-8 text-xs bg-surface-2"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs flex-1"
                      disabled={!newStep.action.trim() || addStepMutation.isPending}
                      onClick={() => addStepMutation.mutate()}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Step
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setLibraryPickerOpen(true)}
                    >
                      <Library className="h-3 w-3 mr-1" /> From Library
                    </Button>
                  </div>
                </div>

                {/* Library Picker Modal */}
                {testCaseId && (
                  <SharedStepPickerModal
                    open={libraryPickerOpen}
                    onOpenChange={setLibraryPickerOpen}
                    testCaseId={testCaseId}
                    currentStepCount={steps.length}
                    onSuccess={refetchSteps}
                  />
                )}
              </TabsContent>

              {/* Links Tab */}
              <TabsContent value="links" className="p-4 space-y-3 mt-0">
                {links.length === 0 ? (
                  <p className="text-xs text-text-tertiary text-center py-8">No linked work items</p>
                ) : (
                  <div className="space-y-2">
                    {links.map(link => (
                      <div key={link.id} className="flex items-center gap-2 p-2 bg-surface-2 rounded-lg border border-border-default">
                        <Badge variant="outline" className="text-[10px]">{link.work_item_type}</Badge>
                        <span className="text-xs text-text-primary flex-1 truncate">{link.work_item_id}</span>
                        <Badge variant="secondary" className="text-[10px]">{link.link_type}</Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="p-4 space-y-2 mt-0">
                {history.length === 0 ? (
                  <p className="text-xs text-text-tertiary text-center py-8">No history entries</p>
                ) : (
                  <div className="space-y-2">
                    {history.map(entry => (
                      <div key={entry.id} className="flex gap-3 p-2 border-l-2 border-border-default pl-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-text-primary capitalize">{entry.activity_type.replace(/_/g, ' ')}</p>
                          {entry.description && (
                            <p className="text-[11px] text-text-tertiary truncate">{entry.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-text-tertiary">{entry.user_name}</p>
                          <p className="text-[10px] text-text-tertiary">
                            {format(new Date(entry.created_at), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
