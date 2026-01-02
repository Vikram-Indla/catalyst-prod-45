/**
 * Test Execution Hook
 * Full execution workflow with step-level tracking, evidence, defects, datasets, and offline sync
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/hooks/usePermission';
import { logAuditEntry } from '@/lib/auditLogger';
import { toast } from 'sonner';
import { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export type StepStatus = 'not_run' | 'passed' | 'failed' | 'blocked' | 'skipped';
export type ExecutionStatus = 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked';

export interface StepResult {
  id?: string;
  execution_id: string;
  step_order: number;
  step_description: string;
  expected_result: string | null;
  status: StepStatus;
  actual_result: string | null;
  comments: string | null;
  executed_at: string | null;
  evidence: StepEvidence[];
}

export interface StepEvidence {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  thumbnail_url?: string;
}

export interface ExecutionDefect {
  id: string;
  defect_id: string;
  defect_key: string;
  title: string;
  severity: string;
  status: string;
  linked_at: string;
}

export interface TestExecution {
  id: string;
  cycle_id: string;
  case_id: string;
  case_version: number | null;
  status: ExecutionStatus;
  assigned_to: string | null;
  executed_by: string | null;
  executed_at: string | null;
  comments: string | null;
  effort_minutes: number | null;
  timer_start_at: string | null;
  timer_accumulated_seconds: number | null;
  created_at: string;
  test_case: {
    id: string;
    title: string;
    description: string | null;
    preconditions: string | null;
    priority: string;
    test_type: string;
    component: string | null;
    test_case_steps: TestStep[];
  };
  test_cycle: {
    id: string;
    name: string;
    key: string;
    environment: string | null;
    build_version: string | null;
    project_id: string;
  };
  assignee?: { id: string; full_name: string } | null;
  executor?: { id: string; full_name: string } | null;
}

export interface TestStep {
  id: string;
  step_number: number;
  description: string;
  expected_result: string | null;
  test_data: string | null;
}

export interface DatasetRow {
  id: string;
  row_index: number;
  data: Record<string, string>;
}

export interface OfflinePendingAction {
  id: string;
  type: 'step_update' | 'evidence_upload' | 'defect_link';
  payload: any;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════
// OFFLINE SYNC STORAGE
// ═══════════════════════════════════════════════════════════════════

const OFFLINE_KEY = 'test_execution_offline_queue';

function getOfflineQueue(): OfflinePendingAction[] {
  try {
    const raw = localStorage.getItem(OFFLINE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setOfflineQueue(queue: OfflinePendingAction[]) {
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(queue));
}

function addToOfflineQueue(action: Omit<OfflinePendingAction, 'id' | 'timestamp'>) {
  const queue = getOfflineQueue();
  queue.push({
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  setOfflineQueue(queue);
}

function removeFromOfflineQueue(id: string) {
  const queue = getOfflineQueue().filter(a => a.id !== id);
  setOfflineQueue(queue);
}

// ═══════════════════════════════════════════════════════════════════
// ACTIVITY LOGGING
// ═══════════════════════════════════════════════════════════════════

async function logTestActivity(
  userId: string | undefined,
  activityType: string,
  entityId: string,
  entityTitle: string,
  programId: string | null,
  description?: string
) {
  try {
    await supabase.from('test_activity_log').insert({
      user_id: userId,
      activity_type: activityType,
      entity_type: 'test_execution',
      entity_id: entityId,
      entity_title: entityTitle,
      program_id: programId,
      description: description || null,
    });
  } catch (err) {
    console.error('Failed to log test activity:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════

export function useTestExecution(executionId: string | null, programId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setLocalOfflineQueue] = useState<OfflinePendingAction[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Permission checks
  const { hasPermission: canEdit } = usePermission('test_executions', 'edit', 'program', programId || undefined);
  const { hasPermission: canCreate } = usePermission('test_executions', 'create', 'program', programId || undefined);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline queue
  useEffect(() => {
    setLocalOfflineQueue(getOfflineQueue());
  }, []);

  // Sync offline queue when online
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineQueue();
    }
  }, [isOnline, offlineQueue.length]);

  // Fetch execution with full details
  const {
    data: execution,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-execution-full', executionId],
    queryFn: async () => {
      if (!executionId) return null;

      const { data, error } = await supabase
        .from('test_cycle_executions')
        .select(`
          *,
          test_case:test_cases(
            id, title, description, preconditions, priority, test_type, component,
            test_case_steps(id, step_number, description, expected_result, test_data)
          ),
          test_cycle:test_cycles(id, name, key, environment, build_version, project_id)
        `)
        .eq('id', executionId)
        .single();

      if (error) throw error;

      // Fetch assignee and executor separately if needed
      let assignee = null;
      let executor = null;
      
      if (data?.assigned_to) {
        const { data: assigneeData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', data.assigned_to)
          .single();
        assignee = assigneeData;
      }
      
      if (data?.executed_by) {
        const { data: executorData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', data.executed_by)
          .single();
        executor = executorData;
      }

      // Sort steps by step_number
      if (data?.test_case?.test_case_steps) {
        (data.test_case.test_case_steps as any[]).sort((a: any, b: any) => a.step_number - b.step_number);
      }

      return {
        ...data,
        assignee,
        executor,
      } as unknown as TestExecution;
    },
    enabled: !!executionId && !!user,
  });

  // Fetch step results
  const { data: stepResults, refetch: refetchSteps } = useQuery({
    queryKey: ['execution-step-results', executionId],
    queryFn: async () => {
      if (!executionId) return [];

      const { data: results, error } = await supabase
        .from('test_execution_step_results')
        .select('*')
        .eq('execution_id', executionId)
        .order('step_order');

      if (error) throw error;

      // Fetch evidence for each step using execution_id and step_order
      let evidenceMap: Record<number, StepEvidence[]> = {};

      const { data: evidenceData } = await supabase
        .from('test_execution_evidence')
        .select('*')
        .eq('execution_id', executionId);

      (evidenceData || []).forEach((ev: any) => {
        const stepOrder = ev.step_order;
        if (!evidenceMap[stepOrder]) {
          evidenceMap[stepOrder] = [];
        }
        evidenceMap[stepOrder].push({
          id: ev.id,
          file_name: ev.file_name,
          file_path: ev.file_url,
          file_type: ev.file_type || 'unknown',
          file_size: ev.file_size_bytes || 0,
          mime_type: ev.file_type || 'application/octet-stream',
          created_at: ev.uploaded_at,
        });
      });

      return (results || []).map((r: any) => ({
        ...r,
        evidence: evidenceMap[r.step_order] || [],
      })) as StepResult[];
    },
    enabled: !!executionId && !!user,
  });

  // Fetch linked defects
  const { data: linkedDefects, refetch: refetchDefects } = useQuery({
    queryKey: ['execution-defects', executionId],
    queryFn: async () => {
      if (!executionId) return [];

      const { data, error } = await supabase
        .from('test_execution_defects')
        .select(`
          id,
          linked_at,
          defect:defects!test_execution_defects_defect_work_item_id_fkey(
            id, defect_id, title, severity, workflow_status
          )
        `)
        .eq('execution_id', executionId);

      if (error) throw error;

      return (data || []).map((d: any) => ({
        id: d.id,
        defect_id: d.defect?.id,
        defect_key: d.defect?.defect_id,
        title: d.defect?.title,
        severity: d.defect?.severity,
        status: d.defect?.workflow_status,
        linked_at: d.linked_at,
      })) as ExecutionDefect[];
    },
    enabled: !!executionId && !!user,
  });

  // Initialize step results if not exists
  const initializeStepsMutation = useMutation({
    mutationFn: async () => {
      if (!executionId || !execution?.test_case?.test_case_steps) return;

      const existingSteps = stepResults || [];
      const testSteps = execution.test_case.test_case_steps;

      const missingSteps = testSteps.filter(
        ts => !existingSteps.some(es => es.step_order === ts.step_number)
      );

      if (missingSteps.length === 0) return;

      const newResults = missingSteps.map(step => ({
        execution_id: executionId,
        step_order: step.step_number,
        step_description: step.description,
        expected_result: step.expected_result,
        status: 'not_run' as StepStatus,
      }));

      const { error } = await supabase
        .from('test_execution_step_results')
        .insert(newResults);

      if (error) throw error;
    },
    onSuccess: () => {
      refetchSteps();
    },
  });

  // Auto-initialize steps when execution loads
  useEffect(() => {
    if (execution && stepResults && execution.test_case?.test_case_steps) {
      const hasAllSteps = execution.test_case.test_case_steps.every(
        ts => stepResults.some(sr => sr.step_order === ts.step_number)
      );
      if (!hasAllSteps) {
        initializeStepsMutation.mutate();
      }
    }
  }, [execution?.id, stepResults?.length]);

  // Timer management
  useEffect(() => {
    if (execution?.timer_start_at) {
      const startTime = new Date(execution.timer_start_at).getTime();
      const baseSeconds = execution.timer_accumulated_seconds || 0;

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000) + baseSeconds;
        setElapsedSeconds(elapsed);
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      setElapsedSeconds(execution?.timer_accumulated_seconds || 0);
    }
  }, [execution?.timer_start_at, execution?.timer_accumulated_seconds]);

  // Update step status
  const updateStepMutation = useMutation({
    mutationFn: async ({
      stepOrder,
      status,
      actualResult,
      comments,
    }: {
      stepOrder: number;
      status: StepStatus;
      actualResult?: string;
      comments?: string;
    }) => {
      if (!user || !executionId) throw new Error('Not authenticated');
      if (!canEdit) throw new Error('Permission denied');

      if (!isOnline) {
        addToOfflineQueue({
          type: 'step_update',
          payload: { executionId, stepOrder, status, actualResult, comments },
        });
        setLocalOfflineQueue(getOfflineQueue());
        toast.info('Saved offline, will sync when online');
        return;
      }

      const { data, error } = await supabase
        .from('test_execution_step_results')
        .update({
          status,
          actual_result: actualResult || null,
          comments: comments || null,
          executed_at: status !== 'not_run' ? new Date().toISOString() : null,
        })
        .eq('execution_id', executionId)
        .eq('step_order', stepOrder)
        .select()
        .single();

      if (error) throw error;

      // Auto-derive overall execution status
      await deriveExecutionStatus();

      return data;
    },
    onSuccess: () => {
      refetchSteps();
      queryClient.invalidateQueries({ queryKey: ['test-execution-full', executionId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Derive execution status from step results
  const deriveExecutionStatus = async () => {
    if (!executionId || !user) return;

    const { data: steps } = await supabase
      .from('test_execution_step_results')
      .select('status')
      .eq('execution_id', executionId);

    if (!steps?.length) return;

    const statuses = steps.map((s: any) => s.status);
    let derivedStatus: ExecutionStatus = 'not_run';

    if (statuses.some(s => s === 'failed')) {
      derivedStatus = 'failed';
    } else if (statuses.some(s => s === 'blocked')) {
      derivedStatus = 'blocked';
    } else if (statuses.every(s => s === 'passed')) {
      derivedStatus = 'passed';
    } else if (statuses.some(s => ['passed', 'failed', 'blocked', 'skipped'].includes(s))) {
      derivedStatus = 'in_progress';
    }

    await supabase
      .from('test_cycle_executions')
      .update({
        status: derivedStatus,
        executed_at: derivedStatus !== 'not_run' ? new Date().toISOString() : null,
        executed_by: derivedStatus !== 'not_run' ? user.id : null,
      })
      .eq('id', executionId);
  };

  // Bulk update all steps
  const bulkUpdateStepsMutation = useMutation({
    mutationFn: async (status: StepStatus) => {
      if (!user || !executionId) throw new Error('Not authenticated');
      if (!canEdit) throw new Error('Permission denied');

      const { error } = await supabase
        .from('test_execution_step_results')
        .update({
          status,
          executed_at: status !== 'not_run' ? new Date().toISOString() : null,
        })
        .eq('execution_id', executionId);

      if (error) throw error;

      await deriveExecutionStatus();
    },
    onSuccess: () => {
      refetchSteps();
      refetch();
      toast.success('All steps updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Reset execution
  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!user || !executionId) throw new Error('Not authenticated');
      if (!canEdit) throw new Error('Permission denied');

      // Reset step results
      await supabase
        .from('test_execution_step_results')
        .update({
          status: 'not_run',
          actual_result: null,
          comments: null,
          executed_at: null,
        })
        .eq('execution_id', executionId);

      // Reset execution
      const { error } = await supabase
        .from('test_cycle_executions')
        .update({
          status: 'not_run',
          executed_at: null,
          executed_by: null,
          comments: null,
          effort_minutes: null,
          timer_start_at: null,
          timer_accumulated_seconds: null,
        })
        .eq('id', executionId);

      if (error) throw error;

      await logTestActivity(
        user.id,
        'execution_reset',
        executionId,
        execution?.test_case?.title || '',
        programId,
        'Reset execution'
      );
    },
    onSuccess: () => {
      refetchSteps();
      refetch();
      toast.success('Execution reset');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Timer controls
  const startTimerMutation = useMutation({
    mutationFn: async () => {
      if (!executionId) throw new Error('No execution');

      const { error } = await supabase
        .from('test_cycle_executions')
        .update({ timer_start_at: new Date().toISOString() })
        .eq('id', executionId);

      if (error) throw error;
    },
    onSuccess: () => refetch(),
  });

  const pauseTimerMutation = useMutation({
    mutationFn: async () => {
      if (!executionId || !execution?.timer_start_at) return;

      const elapsed = Math.floor((Date.now() - new Date(execution.timer_start_at).getTime()) / 1000);
      const accumulated = (execution.timer_accumulated_seconds || 0) + elapsed;

      const { error } = await supabase
        .from('test_cycle_executions')
        .update({
          timer_start_at: null,
          timer_accumulated_seconds: accumulated,
        })
        .eq('id', executionId);

      if (error) throw error;
    },
    onSuccess: () => refetch(),
  });

  const saveEffortMutation = useMutation({
    mutationFn: async (minutes: number) => {
      if (!executionId) throw new Error('No execution');

      const { error } = await supabase
        .from('test_cycle_executions')
        .update({
          effort_minutes: minutes,
          timer_start_at: null,
          timer_accumulated_seconds: null,
        })
        .eq('id', executionId);

      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast.success('Effort saved');
    },
  });

  // Upload evidence
  const uploadEvidenceMutation = useMutation({
    mutationFn: async ({
      stepResultId,
      stepOrder,
      file,
    }: {
      stepResultId: string;
      stepOrder: number;
      file: File;
    }) => {
      if (!user || !executionId) throw new Error('Not authenticated');

      const ext = file.name.split('.').pop();
      const path = `${executionId}/${stepOrder}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('test-evidence')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: evidence, error: insertError } = await supabase
        .from('test_execution_evidence')
        .insert({
          execution_id: executionId,
          step_order: stepOrder,
          file_name: file.name,
          file_url: path,
          file_type: ext || 'unknown',
          file_size_bytes: file.size,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return evidence;
    },
    onSuccess: () => {
      refetchSteps();
      toast.success('Evidence uploaded');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete evidence
  const deleteEvidenceMutation = useMutation({
    mutationFn: async ({ evidenceId, fileUrl }: { evidenceId: string; fileUrl: string }) => {
      await supabase.storage.from('test-evidence').remove([fileUrl]);
      const { error } = await supabase
        .from('test_execution_evidence')
        .delete()
        .eq('id', evidenceId);

      if (error) throw error;
    },
    onSuccess: () => {
      refetchSteps();
      toast.success('Evidence removed');
    },
  });

  // Link defect
  const linkDefectMutation = useMutation({
    mutationFn: async (defectId: string) => {
      if (!user || !executionId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('test_execution_defects')
        .insert({
          execution_id: executionId,
          defect_work_item_id: defectId,
          linked_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await logTestActivity(
        user.id,
        'defect_linked',
        executionId,
        execution?.test_case?.title || '',
        programId,
        `Linked defect ${defectId}`
      );

      return data;
    },
    onSuccess: () => {
      refetchDefects();
      toast.success('Defect linked');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Unlink defect
  const unlinkDefectMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('test_execution_defects')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      refetchDefects();
      toast.success('Defect unlinked');
    },
  });

  // Create defect from execution
  const createDefectMutation = useMutation({
    mutationFn: async ({
      title,
      description,
      severity,
      priority,
      stepOrder,
    }: {
      title: string;
      description?: string;
      severity: string;
      priority: string;
      stepOrder?: number;
    }) => {
      if (!user || !executionId) throw new Error('Not authenticated');

      const projectId = execution?.test_cycle?.project_id;
      if (!projectId) throw new Error('No project ID');

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
      const defectKey = `DEF-${year}-${nextNum.toString().padStart(4, '0')}`;

      const failedStep = stepOrder
        ? stepResults?.find(s => s.step_order === stepOrder)
        : stepResults?.find(s => s.status === 'failed');

      const { data: defect, error: defectError } = await supabase
        .from('defects')
        .insert({
          defect_id: defectKey,
          title,
          description: description || `From test: ${execution?.test_case?.title}`,
          severity,
          priority,
          workflow_status: 'open',
          reporter_id: user.id,
          project_id: projectId,
          expected_result: failedStep?.expected_result || '',
          actual_result: failedStep?.actual_result || '',
        })
        .select()
        .single();

      if (defectError) throw defectError;

      // Link to execution
      await supabase.from('test_execution_defects').insert({
        execution_id: executionId,
        defect_work_item_id: defect.id,
        linked_by: user.id,
      });

      // Link to test case
      await supabase.from('defect_work_item_links').insert({
        defect_id: defect.id,
        linked_item_id: execution?.case_id,
        linked_item_type: 'test_case',
        relationship_type: 'discovered_by',
        created_by: user.id,
      });

      await logTestActivity(
        user.id,
        'defect_created',
        executionId,
        execution?.test_case?.title || '',
        programId,
        `Created defect ${defectKey}`
      );

      return defect;
    },
    onSuccess: (defect) => {
      refetchDefects();
      toast.success(`Defect ${defect.defect_id} created`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Sync offline queue
  const syncOfflineQueue = async () => {
    const queue = getOfflineQueue();
    for (const action of queue) {
      try {
        if (action.type === 'step_update') {
          await supabase
            .from('test_execution_step_results')
            .update({
              status: action.payload.status,
              actual_result: action.payload.actualResult || null,
              comments: action.payload.comments || null,
              executed_at: new Date().toISOString(),
            })
            .eq('execution_id', action.payload.executionId)
            .eq('step_order', action.payload.stepOrder);
        }
        removeFromOfflineQueue(action.id);
      } catch (err) {
        console.error('Failed to sync offline action:', err);
      }
    }
    setLocalOfflineQueue([]);
    refetchSteps();
    refetch();
    toast.success('Offline changes synced');
  };

  // Save overall comments
  const saveCommentsMutation = useMutation({
    mutationFn: async (comments: string) => {
      if (!executionId) throw new Error('No execution');

      const { error } = await supabase
        .from('test_cycle_executions')
        .update({ comments })
        .eq('id', executionId);

      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast.success('Comments saved');
    },
  });

  // Get evidence URL
  const getEvidenceUrl = useCallback((filePath: string) => {
    const { data } = supabase.storage.from('test-evidence').getPublicUrl(filePath);
    return data.publicUrl;
  }, []);

  return {
    // Data
    execution,
    stepResults: stepResults || [],
    linkedDefects: linkedDefects || [],
    
    // State
    isLoading,
    error,
    isOnline,
    offlineQueue,
    elapsedSeconds,
    isTimerRunning: !!execution?.timer_start_at,
    
    // Permissions
    canEdit,
    canCreate,
    
    // Step operations
    updateStep: updateStepMutation.mutateAsync,
    bulkUpdateSteps: bulkUpdateStepsMutation.mutateAsync,
    resetExecution: resetMutation.mutateAsync,
    isUpdatingStep: updateStepMutation.isPending,
    
    // Timer operations
    startTimer: startTimerMutation.mutateAsync,
    pauseTimer: pauseTimerMutation.mutateAsync,
    saveEffort: saveEffortMutation.mutateAsync,
    
    // Evidence operations
    uploadEvidence: uploadEvidenceMutation.mutateAsync,
    deleteEvidence: deleteEvidenceMutation.mutateAsync,
    getEvidenceUrl,
    isUploadingEvidence: uploadEvidenceMutation.isPending,
    
    // Defect operations
    linkDefect: linkDefectMutation.mutateAsync,
    unlinkDefect: unlinkDefectMutation.mutateAsync,
    createDefect: createDefectMutation.mutateAsync,
    isCreatingDefect: createDefectMutation.isPending,
    
    // Comments
    saveComments: saveCommentsMutation.mutateAsync,
    
    // Refetch
    refetch,
    refetchSteps,
    refetchDefects,
    syncOfflineQueue,
  };
}

// ═══════════════════════════════════════════════════════════════════
// BULK EXECUTION HOOK
// ═══════════════════════════════════════════════════════════════════

export interface BulkExecutionQueue {
  executionId: string;
  testCaseTitle: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

export function useBulkExecution(cycleId: string | null, programId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<BulkExecutionQueue[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { hasPermission: canEdit } = usePermission('test_executions', 'edit', 'program', programId || undefined);

  // Fetch all executions for cycle
  const { data: executions } = useQuery({
    queryKey: ['cycle-executions-bulk', cycleId],
    queryFn: async () => {
      if (!cycleId) return [];

      const { data, error } = await supabase
        .from('test_cycle_executions')
        .select(`
          id, status,
          test_case:test_cases(title)
        `)
        .eq('cycle_id', cycleId)
        .order('created_at');

      if (error) throw error;
      return data;
    },
    enabled: !!cycleId,
  });

  // Initialize queue
  const initializeQueue = useCallback((executionIds?: string[]) => {
    if (!executions) return;

    const filtered = executionIds
      ? executions.filter((e: any) => executionIds.includes(e.id))
      : executions;

    setQueue(
      filtered.map((e: any) => ({
        executionId: e.id,
        testCaseTitle: e.test_case?.title || 'Unknown',
        status: e.status === 'passed' || e.status === 'failed' ? 'completed' : 'pending',
      }))
    );
    setCurrentIndex(0);
  }, [executions]);

  // Move to next in queue
  const nextExecution = useCallback(() => {
    setQueue(prev =>
      prev.map((item, idx) =>
        idx === currentIndex ? { ...item, status: 'completed' } : item
      )
    );
    setCurrentIndex(prev => Math.min(prev + 1, queue.length - 1));
  }, [currentIndex, queue.length]);

  // Skip current
  const skipExecution = useCallback(() => {
    setQueue(prev =>
      prev.map((item, idx) =>
        idx === currentIndex ? { ...item, status: 'skipped' } : item
      )
    );
    setCurrentIndex(prev => Math.min(prev + 1, queue.length - 1));
  }, [currentIndex, queue.length]);

  // Jump to specific execution
  const jumpToExecution = useCallback((index: number) => {
    setCurrentIndex(index);
    setQueue(prev =>
      prev.map((item, idx) =>
        idx === index ? { ...item, status: 'in_progress' } : item
      )
    );
  }, []);

  // Bulk pass all remaining
  const passAllRemaining = useMutation({
    mutationFn: async () => {
      if (!user || !canEdit) throw new Error('Permission denied');

      const pendingIds = queue
        .filter(q => q.status === 'pending')
        .map(q => q.executionId);

      if (pendingIds.length === 0) return;

      // Update all to passed
      const { error } = await supabase
        .from('test_cycle_executions')
        .update({
          status: 'passed',
          executed_at: new Date().toISOString(),
          executed_by: user.id,
        })
        .in('id', pendingIds);

      if (error) throw error;

      // Update step results
      for (const id of pendingIds) {
        await supabase
          .from('test_execution_step_results')
          .update({ status: 'passed', executed_at: new Date().toISOString() })
          .eq('execution_id', id);
      }

      setQueue(prev => prev.map(q => ({ ...q, status: 'completed' })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-executions'] });
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success('All remaining tests passed');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const currentExecution = queue[currentIndex];
  const progress = {
    total: queue.length,
    completed: queue.filter(q => q.status === 'completed').length,
    skipped: queue.filter(q => q.status === 'skipped').length,
    pending: queue.filter(q => q.status === 'pending').length,
  };

  return {
    queue,
    currentIndex,
    currentExecution,
    progress,
    initializeQueue,
    nextExecution,
    skipExecution,
    jumpToExecution,
    passAllRemaining: passAllRemaining.mutateAsync,
    isPassingAll: passAllRemaining.isPending,
  };
}

// ═══════════════════════════════════════════════════════════════════
// DATASET EXECUTION - PLACEHOLDER
// Dataset execution will be available when test_case_datasets and 
// test_case_dataset_rows tables are created
// ═══════════════════════════════════════════════════════════════════

export interface DatasetRow {
  id: string;
  row_index: number;
  data: Record<string, string>;
}

export function useDatasetExecution(_testCaseId: string | null) {
  // Placeholder - datasets not yet implemented in database
  const datasets: any[] = [];

  // Get dataset rows - stub
  const getDatasetRows = useCallback(async (_datasetId: string): Promise<DatasetRow[]> => {
    // TODO: Implement when test_case_dataset_rows table exists
    return [];
  }, []);

  // Substitute variables in step description
  const substituteVariables = useCallback((template: string, data: Record<string, string>): string => {
    let result = template;
    Object.entries(data).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    });
    return result;
  }, []);

  return {
    datasets,
    getDatasetRows,
    substituteVariables,
  };
}
