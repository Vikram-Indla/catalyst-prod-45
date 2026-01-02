/**
 * EXECUTION DRAWER
 * Full workspace for executing a test case with step-by-step results,
 * actual results, notes, evidence, and defect creation.
 */

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Bug,
  FileText,
  User,
  Calendar,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Save,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ExecutionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executionId: string | null;
  projectId: string;
  onDefectCreated?: (defectId: string) => void;
}

interface StepResult {
  id?: string;
  step_order: number;
  step_description: string;
  expected_result?: string;
  status: 'not_executed' | 'passed' | 'failed' | 'blocked';
  actual_result?: string;
  comments?: string;
}

export function ExecutionDrawer({ 
  open, 
  onOpenChange, 
  executionId, 
  projectId,
  onDefectCreated 
}: ExecutionDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [executionNotes, setExecutionNotes] = useState('');
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [createDefectOpen, setCreateDefectOpen] = useState(false);
  const [defectTitle, setDefectTitle] = useState('');
  const [defectDescription, setDefectDescription] = useState('');

  // Fetch execution details with test case and steps
  const { data: execution, isLoading } = useQuery({
    queryKey: ['execution-detail', executionId],
    queryFn: async () => {
      if (!executionId) return null;
      
      const { data, error } = await supabase
        .from('test_cycle_executions')
        .select(`
          *,
          test_case:test_cases(
            id, title, description, priority, test_type,
            test_case_steps(id, step_number, description, expected_result, test_data)
          ),
          test_cycle:test_cycles(id, name, key),
          assigned_user:profiles!test_cycle_executions_assigned_to_fkey(id, full_name),
          executed_by_user:profiles!test_cycle_executions_executed_by_fkey(id, full_name)
        `)
        .eq('id', executionId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open && !!executionId,
  });

  // Fetch existing step results
  const { data: existingStepResults } = useQuery({
    queryKey: ['execution-step-results', executionId],
    queryFn: async () => {
      if (!executionId) return [];
      
      const { data, error } = await supabase
        .from('test_execution_step_results')
        .select('*')
        .eq('execution_id', executionId)
        .order('step_order');

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!executionId,
  });

  // Initialize step results when execution loads
  useEffect(() => {
    if (execution?.test_case?.test_case_steps && existingStepResults !== undefined) {
      const steps = execution.test_case.test_case_steps
        .sort((a: any, b: any) => a.step_number - b.step_number);
      
      const initialResults: StepResult[] = steps.map((step: any) => {
        const existing = existingStepResults?.find(
          (r: any) => r.step_order === step.step_number
        );
        
        const status = existing?.status || 'not_executed';
        const validStatus = ['not_executed', 'passed', 'failed', 'blocked'].includes(status)
          ? status as StepResult['status']
          : 'not_executed';
        
        return {
          id: existing?.id,
          step_order: step.step_number,
          step_description: step.description,
          expected_result: step.expected_result,
          status: validStatus,
          actual_result: existing?.actual_result || '',
          comments: existing?.comments || '',
        };
      });
      
      setStepResults(initialResults);
      setExecutionNotes(execution.comments || '');
      setHasChanges(false);
    }
  }, [execution, existingStepResults]);

  // Save step results mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !executionId) throw new Error('Invalid state');

      // Upsert step results
      for (const step of stepResults) {
        if (step.id) {
          // Update existing
          await supabase
            .from('test_execution_step_results')
            .update({
              status: step.status,
              actual_result: step.actual_result || null,
              comments: step.comments || null,
              executed_at: step.status !== 'not_executed' ? new Date().toISOString() : null,
            })
            .eq('id', step.id);
        } else {
          // Insert new
          await supabase
            .from('test_execution_step_results')
            .insert({
              execution_id: executionId,
              step_order: step.step_order,
              step_description: step.step_description,
              expected_result: step.expected_result || null,
              status: step.status,
              actual_result: step.actual_result || null,
              comments: step.comments || null,
              executed_at: step.status !== 'not_executed' ? new Date().toISOString() : null,
            });
        }
      }

      // Calculate overall status
      const overallStatus = calculateOverallStatus();

      // Update execution
      const { error } = await supabase
        .from('test_cycle_executions')
        .update({
          status: overallStatus,
          comments: executionNotes || null,
          executed_at: new Date().toISOString(),
          executed_by: user.id,
        })
        .eq('id', executionId);

      if (error) throw error;

      // Log activity
      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: 'executed',
        entity_type: 'test_execution',
        entity_id: executionId,
        entity_title: execution?.test_case?.title,
        description: `Executed test case with status: ${overallStatus}`,
      });

      return overallStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-detail', executionId] });
      queryClient.invalidateQueries({ queryKey: ['execution-step-results', executionId] });
      queryClient.invalidateQueries({ queryKey: ['project-executions', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-test-summary', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-test-cycles', projectId] });
      toast.success('Execution saved');
      setHasChanges(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Create defect mutation
  const createDefectMutation = useMutation({
    mutationFn: async () => {
      if (!user || !executionId || !defectTitle.trim()) {
        throw new Error('Missing required fields');
      }

      // Generate defect ID
      const year = new Date().getFullYear();
      const { data: lastDefect } = await supabase
        .from('defects')
        .select('defect_id')
        .like('defect_id', `DEF-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1);

      const lastNum = lastDefect?.[0]?.defect_id?.match(/DEF-\d+-(\d+)/)?.[1];
      const nextNum = lastNum ? parseInt(lastNum) + 1 : 1;
      const defectId = `DEF-${year}-${nextNum.toString().padStart(4, '0')}`;

      // Create defect
      const { data: defect, error: defectError } = await supabase
        .from('defects')
        .insert({
          defect_id: defectId,
          title: defectTitle.trim(),
          description: defectDescription.trim() || null,
          severity: 'major',
          priority: 'medium',
          workflow_status: 'open',
          reporter_id: user.id,
          project_id: projectId,
          actual_result: stepResults.find(s => s.status === 'failed')?.actual_result || '',
          expected_result: stepResults.find(s => s.status === 'failed')?.expected_result || '',
          linked_story_id: execution?.test_case?.id ? null : null,
        })
        .select()
        .single();

      if (defectError) throw defectError;

      // Link defect to execution
      await supabase
        .from('test_execution_defects')
        .insert({
          execution_id: executionId,
          defect_work_item_id: defect.id,
          linked_by: user.id,
        });

      // Log to defect audit
      await supabase.from('defect_audit_log').insert({
        defect_id: defect.id,
        action: 'created',
        actor_id: user.id,
        field_name: 'status',
        new_value: 'open',
      });

      // Log to test activity
      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: 'defect_created',
        entity_type: 'test_execution',
        entity_id: executionId,
        entity_title: execution?.test_case?.title,
        description: `Created defect ${defectId} from failed execution`,
      });

      return defect;
    },
    onSuccess: (defect) => {
      queryClient.invalidateQueries({ queryKey: ['execution-detail', executionId] });
      toast.success(`Defect ${defect.defect_id} created`);
      setCreateDefectOpen(false);
      setDefectTitle('');
      setDefectDescription('');
      onDefectCreated?.(defect.id);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const calculateOverallStatus = (): string => {
    if (stepResults.length === 0) return 'not_executed';
    
    const hasBlocked = stepResults.some(s => s.status === 'blocked');
    const hasFailed = stepResults.some(s => s.status === 'failed');
    const allPassed = stepResults.every(s => s.status === 'passed');
    const allNotRun = stepResults.every(s => s.status === 'not_executed');
    
    if (allNotRun) return 'not_executed';
    if (hasBlocked) return 'blocked';
    if (hasFailed) return 'failed';
    if (allPassed) return 'passed';
    return 'not_executed'; // Partial execution
  };

  const updateStepStatus = (stepOrder: number, status: StepResult['status']) => {
    setStepResults(prev =>
      prev.map(s =>
        s.step_order === stepOrder ? { ...s, status } : s
      )
    );
    setHasChanges(true);
  };

  const updateStepField = (stepOrder: number, field: 'actual_result' | 'comments', value: string) => {
    setStepResults(prev =>
      prev.map(s =>
        s.step_order === stepOrder ? { ...s, [field]: value } : s
      )
    );
    setHasChanges(true);
  };

  const toggleStepExpanded = (stepOrder: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepOrder)) {
        next.delete(stepOrder);
      } else {
        next.add(stepOrder);
      }
      return next;
    });
  };

  const passAllSteps = () => {
    setStepResults(prev => prev.map(s => ({ ...s, status: 'passed' as const })));
    setHasChanges(true);
  };

  const resetAllSteps = () => {
    setStepResults(prev => prev.map(s => ({ ...s, status: 'not_executed' as const, actual_result: '', comments: '' })));
    setHasChanges(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle2 className="h-5 w-5 text-status-success" />;
      case 'failed': return <XCircle className="h-5 w-5 text-status-error" />;
      case 'blocked': return <AlertTriangle className="h-5 w-5 text-status-warning" />;
      default: return <Clock className="h-5 w-5 text-text-tertiary" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-status-success bg-status-success/10 border-status-success/20';
      case 'failed': return 'text-status-error bg-status-error/10 border-status-error/20';
      case 'blocked': return 'text-status-warning bg-status-warning/10 border-status-warning/20';
      default: return 'text-text-tertiary bg-surface-3 border-border-default';
    }
  };

  const overallStatus = calculateOverallStatus();
  const hasFailed = stepResults.some(s => s.status === 'failed');

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl bg-surface-1 border-border-default p-0 flex flex-col">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-60 w-full" />
            </div>
          ) : !execution ? (
            <div className="p-6 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
              <p className="text-text-secondary">Execution not found</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <SheetHeader className="p-4 border-b border-border-default">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-accent-subtle rounded-lg shrink-0">
                    <Play className="h-5 w-5 text-accent-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {execution.test_cycle?.key}
                      </Badge>
                      <Badge className={cn('text-xs capitalize', getStatusColor(overallStatus))}>
                        {overallStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                    <SheetTitle className="text-lg text-text-primary text-left truncate">
                      {execution.test_case?.title}
                    </SheetTitle>
                    <div className="flex items-center gap-4 mt-1 text-xs text-text-tertiary">
                      {execution.assigned_user && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {(execution.assigned_user as any)?.full_name}
                        </span>
                      )}
                      {execution.test_case?.priority && (
                        <Badge variant="outline" className="text-xs">
                          {execution.test_case.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={passAllSteps}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Pass All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetAllSteps}
                  >
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    Reset
                  </Button>
                  {hasFailed && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-status-error hover:bg-status-error/10"
                      onClick={() => {
                        const failedStep = stepResults.find(s => s.status === 'failed');
                        setDefectTitle(`[${execution.test_cycle?.key}] ${execution.test_case?.title}`);
                        setDefectDescription(
                          failedStep 
                            ? `Step ${failedStep.step_order} failed:\n\nExpected: ${failedStep.expected_result || 'N/A'}\nActual: ${failedStep.actual_result || 'N/A'}`
                            : ''
                        );
                        setCreateDefectOpen(true);
                      }}
                    >
                      <Bug className="h-4 w-4 mr-1.5" />
                      Create Defect
                    </Button>
                  )}
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    onClick={() => saveMutation.mutate()}
                    disabled={!hasChanges || saveMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    {saveMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </SheetHeader>

              {/* Steps */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  <h3 className="text-sm font-medium text-text-secondary">
                    Test Steps ({stepResults.length})
                  </h3>

                  {stepResults.length === 0 ? (
                    <Card className="bg-surface-2 border-border-default p-4 text-center">
                      <FileText className="h-8 w-8 mx-auto text-text-tertiary mb-2" />
                      <p className="text-text-secondary text-sm">
                        No steps defined for this test case
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {stepResults.map((step) => {
                        const isExpanded = expandedSteps.has(step.step_order);
                        
                        return (
                          <Card
                            key={step.step_order}
                            className="bg-surface-2 border-border-default overflow-hidden"
                          >
                            {/* Step header */}
                            <div
                              className="flex items-start gap-3 p-3 cursor-pointer hover:bg-surface-hover transition-colors"
                              onClick={() => toggleStepExpanded(step.step_order)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-text-tertiary mt-0.5 shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-text-tertiary mt-0.5 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium text-text-tertiary">
                                    Step {step.step_order}
                                  </span>
                                  {getStatusIcon(step.status)}
                                </div>
                                <p className="text-sm text-text-primary">
                                  {step.step_description}
                                </p>
                                {step.expected_result && (
                                  <p className="text-xs text-text-tertiary mt-1">
                                    Expected: {step.expected_result}
                                  </p>
                                )}
                              </div>
                              
                              {/* Quick status buttons */}
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={cn(
                                    'h-8 w-8',
                                    step.status === 'passed' && 'bg-status-success/20'
                                  )}
                                  onClick={() => updateStepStatus(step.step_order, 'passed')}
                                >
                                  <CheckCircle2 className={cn(
                                    'h-4 w-4',
                                    step.status === 'passed' ? 'text-status-success' : 'text-text-tertiary'
                                  )} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={cn(
                                    'h-8 w-8',
                                    step.status === 'failed' && 'bg-status-error/20'
                                  )}
                                  onClick={() => updateStepStatus(step.step_order, 'failed')}
                                >
                                  <XCircle className={cn(
                                    'h-4 w-4',
                                    step.status === 'failed' ? 'text-status-error' : 'text-text-tertiary'
                                  )} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={cn(
                                    'h-8 w-8',
                                    step.status === 'blocked' && 'bg-status-warning/20'
                                  )}
                                  onClick={() => updateStepStatus(step.step_order, 'blocked')}
                                >
                                  <AlertTriangle className={cn(
                                    'h-4 w-4',
                                    step.status === 'blocked' ? 'text-status-warning' : 'text-text-tertiary'
                                  )} />
                                </Button>
                              </div>
                            </div>

                            {/* Expanded content */}
                            {isExpanded && (
                              <div className="px-3 pb-3 pt-0 border-t border-border-default mt-0 space-y-3">
                                <div className="pt-3">
                                  <Label className="text-xs text-text-secondary mb-1.5 block">
                                    Actual Result
                                  </Label>
                                  <Textarea
                                    value={step.actual_result || ''}
                                    onChange={(e) => updateStepField(step.step_order, 'actual_result', e.target.value)}
                                    placeholder="Enter the actual result..."
                                    className="bg-surface-1 border-border-default min-h-[60px] text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-text-secondary mb-1.5 block">
                                    Comments
                                  </Label>
                                  <Textarea
                                    value={step.comments || ''}
                                    onChange={(e) => updateStepField(step.step_order, 'comments', e.target.value)}
                                    placeholder="Add any notes or comments..."
                                    className="bg-surface-1 border-border-default min-h-[60px] text-sm"
                                  />
                                </div>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  <Separator className="bg-border-default my-4" />

                  {/* Execution Notes */}
                  <div>
                    <Label className="text-sm text-text-secondary mb-2 block">
                      Execution Notes
                    </Label>
                    <Textarea
                      value={executionNotes}
                      onChange={(e) => {
                        setExecutionNotes(e.target.value);
                        setHasChanges(true);
                      }}
                      placeholder="Overall notes for this execution..."
                      className="bg-surface-2 border-border-default min-h-[80px]"
                    />
                  </div>

                  {/* Metadata */}
                  <Card className="bg-surface-2 border-border-default p-3 mt-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-text-tertiary">Executed By:</span>
                        <p className="text-text-primary">
                          {(execution.executed_by_user as any)?.full_name || 'Not executed'}
                        </p>
                      </div>
                      <div>
                        <span className="text-text-tertiary">Executed At:</span>
                        <p className="text-text-primary">
                          {execution.executed_at 
                            ? format(new Date(execution.executed_at), 'MMM d, yyyy HH:mm')
                            : 'Not executed'}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Defect Dialog */}
      <AlertDialog open={createDefectOpen} onOpenChange={setCreateDefectOpen}>
        <AlertDialogContent className="bg-surface-1 border-border-default">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-text-primary">
              <Bug className="h-5 w-5 text-status-error" />
              Create Defect from Failure
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary">
              A defect will be created and linked to this execution.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="defect-title" className="text-text-primary">
                Title <span className="text-status-error">*</span>
              </Label>
              <Textarea
                id="defect-title"
                value={defectTitle}
                onChange={(e) => setDefectTitle(e.target.value)}
                className="bg-surface-2 border-border-default min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defect-desc" className="text-text-primary">
                Description
              </Label>
              <Textarea
                id="defect-desc"
                value={defectDescription}
                onChange={(e) => setDefectDescription(e.target.value)}
                className="bg-surface-2 border-border-default min-h-[100px]"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-surface-2 border-border-default text-text-primary hover:bg-surface-hover">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => createDefectMutation.mutate()}
              disabled={!defectTitle.trim() || createDefectMutation.isPending}
              className="bg-status-error hover:bg-status-error/90"
            >
              {createDefectMutation.isPending ? 'Creating...' : 'Create Defect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
