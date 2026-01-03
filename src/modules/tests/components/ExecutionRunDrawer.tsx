/**
 * EXECUTION RUN DRAWER
 * Full workspace for executing a test case step-by-step with evidence and defect creation
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
import { Input } from '@/components/ui/input';
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
  Upload,
  User,
  AlertCircle,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Paperclip,
  Image,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ExecutionRunDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executionId: string | null;
  onComplete?: () => void;
}

interface StepResult {
  id?: string;
  step_id: string;
  step_order: number;
  step_description: string;
  expected_result?: string;
  status: 'not_executed' | 'passed' | 'failed' | 'blocked';
  actual_result?: string;
}

export function ExecutionRunDrawer({
  open,
  onOpenChange,
  executionId,
  onComplete,
}: ExecutionRunDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [executionNotes, setExecutionNotes] = useState('');
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [createDefectOpen, setCreateDefectOpen] = useState(false);
  const [defectTitle, setDefectTitle] = useState('');
  const [defectDescription, setDefectDescription] = useState('');

  // Fetch execution details
  const { data: execution, isLoading } = useQuery({
    queryKey: ['execution-run-detail', executionId],
    queryFn: async () => {
      if (!executionId) return null;

      const { data, error } = await supabase
        .from('test_cycle_executions')
        .select(`
          *,
          test_case:test_cases(
            id, title, description, priority, test_type, preconditions,
            test_steps(id, step_number, description, expected_result, test_data)
          ),
          test_cycle:test_cycles(id, name, key),
          assigned_user:profiles!test_cycle_executions_assigned_to_fkey(id, full_name)
        `)
        .eq('id', executionId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open && !!executionId,
  });

  // Fetch existing step results
  const { data: existingResults } = useQuery({
    queryKey: ['execution-step-results', executionId],
    queryFn: async () => {
      if (!executionId) return [];

      const { data, error } = await supabase
        .from('test_execution_steps')
        .select('*')
        .eq('test_execution_id', executionId)
        .order('created_at');

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!executionId,
  });

  // Initialize step results
  useEffect(() => {
    if (execution?.test_case?.test_steps) {
      const steps = [...(execution.test_case.test_steps || [])]
        .sort((a: any, b: any) => a.step_number - b.step_number);

      const results: StepResult[] = steps.map((step: any) => {
        const existing = existingResults?.find((r: any) => r.test_step_id === step.id);
        return {
          id: existing?.id,
          step_id: step.id,
          step_order: step.step_number,
          step_description: step.description,
          expected_result: step.expected_result,
          status: (existing?.status as StepResult['status']) || 'not_executed',
          actual_result: existing?.actual_result || '',
        };
      });

      setStepResults(results);
      setExecutionNotes(execution.comments || '');
      setHasChanges(false);
    }
  }, [execution, existingResults]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !executionId) throw new Error('Invalid state');

      // Save step results
      for (const step of stepResults) {
        // Map internal status to DB enum
        const dbStatus = step.status === 'not_executed' ? 'skipped' : step.status;
        
        if (step.id) {
          // Update existing
          await supabase
            .from('test_execution_steps')
            .update({
              status: dbStatus as any,
              actual_result: step.actual_result || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', step.id);
        } else if (step.status !== 'not_executed' || step.actual_result) {
          // Insert new
          await supabase.from('test_execution_steps').insert({
            test_execution_id: executionId,
            test_step_id: step.step_id,
            status: dbStatus as any,
            actual_result: step.actual_result || null,
          } as any);
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
        description: `Executed test with status: ${overallStatus}`,
      });

      return overallStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-run-detail', executionId] });
      queryClient.invalidateQueries({ queryKey: ['execution-step-results', executionId] });
      queryClient.invalidateQueries({ queryKey: ['global-test-executions'] });
      toast.success('Execution saved');
      setHasChanges(false);
      onComplete?.();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Create defect mutation
  const createDefectMutation = useMutation({
    mutationFn: async () => {
      if (!user || !executionId || !defectTitle.trim()) {
        throw new Error('Missing required fields');
      }

      // Create defect
      const { data: defect, error: defectError } = await supabase
        .from('defects')
        .insert({
          defect_id: `DEF-${Date.now()}`,
          title: defectTitle.trim(),
          description: defectDescription.trim() || null,
          severity: 'major',
          priority: 'medium',
          workflow_status: 'open',
          reporter_id: user.id,
          actual_result: stepResults.find(s => s.status === 'failed')?.actual_result || '',
          expected_result: stepResults.find(s => s.status === 'failed')?.expected_result || '',
        })
        .select()
        .single();

      if (defectError) throw defectError;

      // Link defect to execution
      await supabase.from('test_execution_defects').insert({
        execution_id: executionId,
        defect_work_item_id: defect.id,
        linked_by: user.id,
      });

      // Log activity
      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: 'defect_created',
        entity_type: 'test_execution',
        entity_id: executionId,
        entity_title: execution?.test_case?.title,
        description: `Created defect from failed execution`,
      });

      return defect;
    },
    onSuccess: (defect) => {
      toast.success(`Defect created: ${defect.defect_id}`);
      setCreateDefectOpen(false);
      setDefectTitle('');
      setDefectDescription('');
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
    return 'not_executed';
  };

  const updateStepStatus = (stepOrder: number, status: StepResult['status']) => {
    setStepResults(prev =>
      prev.map(s => s.step_order === stepOrder ? { ...s, status } : s)
    );
    setHasChanges(true);
  };

  const updateStepActualResult = (stepOrder: number, value: string) => {
    setStepResults(prev =>
      prev.map(s => s.step_order === stepOrder ? { ...s, actual_result: value } : s)
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
    setStepResults(prev => prev.map(s => ({ ...s, status: 'not_executed' as const, actual_result: '' })));
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
                    {execution.assigned_user && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-text-tertiary">
                        <User className="h-3 w-3" />
                        {(execution.assigned_user as any)?.full_name}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3">
                  <Button size="sm" variant="outline" onClick={passAllSteps}>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Pass All
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetAllSteps}>
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

              {/* Content */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Preconditions */}
                  {execution.test_case?.preconditions && (
                    <Card className="bg-surface-2 border-border-default p-3">
                      <h4 className="text-sm font-medium text-text-secondary mb-1">Preconditions</h4>
                      <p className="text-sm text-text-primary">{execution.test_case.preconditions}</p>
                    </Card>
                  )}

                  {/* Steps */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-text-secondary">Test Steps</h4>
                    {stepResults.length === 0 ? (
                      <p className="text-text-tertiary text-sm py-4 text-center">
                        No test steps defined
                      </p>
                    ) : (
                      stepResults.map((step) => {
                        const isExpanded = expandedSteps.has(step.step_order);
                        return (
                          <Card key={step.step_order} className="bg-surface-2 border-border-default overflow-hidden">
                            {/* Step header */}
                            <div
                              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surface-hover"
                              onClick={() => toggleStepExpanded(step.step_order)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-text-tertiary shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />
                              )}
                              <span className="text-sm font-medium text-text-tertiary w-6">
                                {step.step_order}
                              </span>
                              <p className="flex-1 text-sm text-text-primary">{step.step_description}</p>

                              {/* Status buttons */}
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={cn('h-8 w-8', step.status === 'passed' && 'bg-status-success/10')}
                                  onClick={() => updateStepStatus(step.step_order, 'passed')}
                                >
                                  <CheckCircle2 className={cn('h-4 w-4', step.status === 'passed' ? 'text-status-success' : 'text-text-tertiary')} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={cn('h-8 w-8', step.status === 'failed' && 'bg-status-error/10')}
                                  onClick={() => updateStepStatus(step.step_order, 'failed')}
                                >
                                  <XCircle className={cn('h-4 w-4', step.status === 'failed' ? 'text-status-error' : 'text-text-tertiary')} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={cn('h-8 w-8', step.status === 'blocked' && 'bg-status-warning/10')}
                                  onClick={() => updateStepStatus(step.step_order, 'blocked')}
                                >
                                  <AlertTriangle className={cn('h-4 w-4', step.status === 'blocked' ? 'text-status-warning' : 'text-text-tertiary')} />
                                </Button>
                              </div>
                            </div>

                            {/* Expanded content */}
                            {isExpanded && (
                              <div className="px-3 pb-3 space-y-3 border-t border-border-default pt-3">
                                {step.expected_result && (
                                  <div>
                                    <Label className="text-xs text-text-tertiary">Expected Result</Label>
                                    <p className="text-sm text-text-primary mt-1">{step.expected_result}</p>
                                  </div>
                                )}
                                <div>
                                  <Label className="text-xs text-text-tertiary">Actual Result</Label>
                                  <Textarea
                                    value={step.actual_result || ''}
                                    onChange={(e) => updateStepActualResult(step.step_order, e.target.value)}
                                    placeholder="Enter actual result..."
                                    className="mt-1 bg-surface-1 border-border-default min-h-[60px]"
                                  />
                                </div>
                                {/* Evidence attachment */}
                                <div>
                                  <Label className="text-xs text-text-tertiary flex items-center gap-1">
                                    <Paperclip className="h-3 w-3" /> Attach Evidence
                                  </Label>
                                  <div className="flex gap-2 mt-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs gap-1.5"
                                      onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.onchange = async (e) => {
                                          const file = (e.target as HTMLInputElement).files?.[0];
                                          if (file && step.id) {
                                            try {
                                              const fileName = `${executionId}/${step.step_order}/${Date.now()}_${file.name}`;
                                              const { error: uploadError } = await supabase.storage
                                                .from('test-evidence')
                                                .upload(fileName, file);
                                              if (uploadError) throw uploadError;
                                              
                                              // Save evidence record
                                              await supabase.from('test_evidence').insert({
                                                execution_step_id: step.id,
                                                file_name: file.name,
                                                file_type: 'screenshot',
                                                file_path: fileName,
                                                file_size: file.size,
                                                mime_type: file.type,
                                                uploaded_by: user?.id,
                                              });
                                              toast.success('Screenshot attached');
                                            } catch (err: any) {
                                              toast.error(err.message || 'Failed to upload');
                                            }
                                          }
                                        };
                                        input.click();
                                      }}
                                    >
                                      <Image className="h-3 w-3" /> Screenshot
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs gap-1.5"
                                      onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = '.pdf,.doc,.docx,.txt,.log';
                                        input.onchange = async (e) => {
                                          const file = (e.target as HTMLInputElement).files?.[0];
                                          if (file && step.id) {
                                            try {
                                              const fileName = `${executionId}/${step.step_order}/${Date.now()}_${file.name}`;
                                              const { error: uploadError } = await supabase.storage
                                                .from('test-evidence')
                                                .upload(fileName, file);
                                              if (uploadError) throw uploadError;
                                              
                                              await supabase.from('test_evidence').insert({
                                                execution_step_id: step.id,
                                                file_name: file.name,
                                                file_type: 'document',
                                                file_path: fileName,
                                                file_size: file.size,
                                                mime_type: file.type,
                                                uploaded_by: user?.id,
                                              });
                                              toast.success('Document attached');
                                            } catch (err: any) {
                                              toast.error(err.message || 'Failed to upload');
                                            }
                                          }
                                        };
                                        input.click();
                                      }}
                                    >
                                      <FileText className="h-3 w-3" /> Document
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Card>
                        );
                      })
                    )}
                  </div>

                  <Separator className="bg-border-default" />

                  {/* Execution Notes */}
                  <div>
                    <Label className="text-sm font-medium text-text-secondary">Execution Notes</Label>
                    <Textarea
                      value={executionNotes}
                      onChange={(e) => {
                        setExecutionNotes(e.target.value);
                        setHasChanges(true);
                      }}
                      placeholder="Add notes about this execution..."
                      className="mt-2 bg-surface-2 border-border-default min-h-[80px]"
                    />
                  </div>
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
              Create Defect
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary">
              Create a defect from this failed execution
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-text-primary">Title</Label>
              <Input
                value={defectTitle}
                onChange={(e) => setDefectTitle(e.target.value)}
                className="bg-surface-2 border-border-default"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-text-primary">Description</Label>
              <Textarea
                value={defectDescription}
                onChange={(e) => setDefectDescription(e.target.value)}
                className="bg-surface-2 border-border-default min-h-[120px]"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-surface-2 border-border-default">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => createDefectMutation.mutate()}
              disabled={!defectTitle.trim() || createDefectMutation.isPending}
              className="bg-status-error text-white hover:bg-status-error/90"
            >
              {createDefectMutation.isPending ? 'Creating...' : 'Create Defect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
