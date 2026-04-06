/**
 * G19: Three-Pane Execution Page
 * Route: /testhub/cycles/:cycleId/execute
 * 
 * Three-pane layout: Test List | Step Runner | Sidebar (Attachments/Defects)
 * Features: Step-level execution, keyboard shortcuts (P/F/B/S/1-9/?),
 * resizable panels, FastTrack mode, execution history, view/re-run modes.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { deriveOverallStatus } from '@/utils/testExecution';
import { useTheme } from '@/hooks/useTheme';
import type { StepStatus as StepStatusType } from '@/utils/testExecution';

interface ExecutionHistoryRecord {
  id: string;
  execution_number: number;
  result: string;
  executed_by: string | null;
  executed_at: string;
  step_results: Array<{
    step_number: number;
    title: string;
    status: string;
    notes: string;
  }>;
  executor?: { full_name: string } | null;
}
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Play, Clock, CheckCircle2, XCircle,
  AlertTriangle, SkipForward, User, Timer, Keyboard, Zap,
  ChevronLeft, ChevronRight, RotateCcw, PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { FailureReasonModal } from '@/components/testhub/FailureReasonModal';
import { KeyboardShortcutsGuide } from '@/components/testhub/execution/KeyboardShortcutsGuide';
import { StepProgressIndicator } from '@/components/testhub/execution/StepProgressIndicator';
import { ExecutionSidebar } from '@/components/testhub/execution/ExecutionSidebar';

// ── Types ──────────────────────────────────────────────────────────────────
interface TestCycle {
  id: string;
  cycle_key: string;
  name: string;
  status: string;
  progress_percent: number;
  total_cases: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  not_run_count: number;
}

interface TestStep {
  id: string;
  step_number: number;
  action: string;
  expected_result?: string;
  shared_step_id?: string;
  test_case_id: string;
}

interface CycleTestCase {
  id: string;
  cycle_id: string;
  test_case_id: string;
  current_status: string;
  executed_at: string | null;
  executed_by: string | null;
  assigned_to: string | null;
  notes: string | null;
  execution_time_seconds: number;
  failure_reason: string | null;
  started_at: string | null;
  
  test_case: {
    id: string;
    case_key: string;
    title: string;
    description: string | null;
    preconditions: string | null;
    priority_id: string | null;
    case_type_id: string | null;
    priority?: { id: string; name: string; color: string } | null;
    case_type?: { id: string; name: string } | null;
    steps?: TestStep[];
  } | null;
  assignee?: { id: string; full_name: string } | null;
}

interface StepStatus {
  stepIndex: number;
  status: 'not_run' | 'passed' | 'failed' | 'blocked' | 'skipped';
}

// ── Status helpers ─────────────────────────────────────────────────────────
const statusConfigLight: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  not_run: { icon: Clock, color: '#64748B', bg: '#F1F5F9', label: 'Not Run' },
  passed: { icon: CheckCircle2, color: '#059669', bg: '#ECFDF5', label: 'Passed' },
  failed: { icon: XCircle, color: '#DC2626', bg: '#FEF2F2', label: 'Failed' },
  blocked: { icon: AlertTriangle, color: '#D97706', bg: '#FFFBEB', label: 'Blocked' },
  skipped: { icon: SkipForward, color: '#94A3B8', bg: '#F8FAFC', label: 'Skipped' },
};
const statusConfigDark: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  not_run: { icon: Clock, color: '#878787', bg: '#1A1A1A', label: 'Not Run' },
  passed: { icon: CheckCircle2, color: '#059669', bg: 'rgba(34,197,94,0.12)', label: 'Passed' },
  failed: { icon: XCircle, color: '#DC2626', bg: 'rgba(248,113,113,0.12)', label: 'Failed' },
  blocked: { icon: AlertTriangle, color: '#D97706', bg: 'rgba(251,191,36,0.12)', label: 'Blocked' },
  skipped: { icon: SkipForward, color: '#878787', bg: '#1A1A1A', label: 'Skipped' },
};
// Default reference for static usage; components should use getStatusConfig(isDark) instead
const statusConfig = statusConfigLight;
function getStatusConfig(isDark: boolean) { return isDark ? statusConfigDark : statusConfigLight; }

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const highlightVariables = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) => {
    if (part.match(/^\{\{[^}]+\}\}$/)) {
      return <span key={i} style={{ backgroundColor: 'rgba(37,99,235,0.15)', color: '#2563EB', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.9em' }}>{part}</span>;
    }
    return part;
  });
};

// ── Main Component ─────────────────────────────────────────────────────────
export default function TestHubExecutionPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const statusConfig = getStatusConfig(isDark);

  // Core state
  const [cycle, setCycle] = useState<TestCycle | null>(null);
  const [testCases, setTestCases] = useState<CycleTestCase[]>([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showMyTestsOnly, setShowMyTestsOnly] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Session timer (overall)
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const sessionStartRef = useRef(Date.now());

  // Step-level execution state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<Map<string, StepStatus[]>>(new Map());

  // View mode / re-run state
  const [viewMode, setViewMode] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistoryRecord | null>(null);
  const [previousRunData, setPreviousRunData] = useState<ExecutionHistoryRecord | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFailureModalOpen, setIsFailureModalOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [fastTrackMode, setFastTrackMode] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [notes, setNotes] = useState('');

  // Refs for keyboard handler
  const stateRef = useRef({ isSubmitting: false, isFailureModalOpen: false, showShortcuts: false, currentStepIndex: 0, fastTrackMode: false });
  useEffect(() => {
    stateRef.current = { isSubmitting, isFailureModalOpen, showShortcuts, currentStepIndex, fastTrackMode };
  });

  // ── Data fetching ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setCurrentUserId(user.id); });
  }, []);

  const fetchCycle = useCallback(async () => {
    if (!cycleId) return;
    const { data, error } = await (supabase as any).from('tm_test_cycles').select('*').eq('id', cycleId).single();
    if (!error && data) setCycle(data as any);
  }, [cycleId]);

  const fetchTestCases = useCallback(async () => {
    if (!cycleId) return;
    const { data, error } = await (supabase as any)
      .from('tm_cycle_scope')
      .select(`*, test_case:tm_test_cases ( id, case_key, title, description, preconditions, priority_id, case_type_id, priority:tm_case_priorities ( id, name, color ), case_type:tm_case_types ( id, name ) ), assignee:profiles!assigned_to ( id, full_name )`)
      .eq('cycle_id', cycleId)
      .order('added_at');

    if (data && data.length > 0) {
      const testCaseIds = data.map(tc => tc.test_case?.id).filter(Boolean);
      const { data: stepsData } = await supabase.from('tm_test_steps').select('*').in('test_case_id', testCaseIds).order('step_number');
      if (stepsData) {
        const stepsMap = new Map<string, any[]>();
        stepsData.forEach(s => {
          if (!stepsMap.has(s.test_case_id)) stepsMap.set(s.test_case_id, []);
          stepsMap.get(s.test_case_id)!.push(s);
        });
        data.forEach(tc => {
          if (tc.test_case) {
            (tc.test_case as any).steps = stepsMap.get(tc.test_case.id) || [];
          }
        });
      }
    }
    if (!error) setTestCases(data || []);
    if (data && data.length > 0 && !selectedTestCaseId) {
      const testIdFromUrl = searchParams.get('testId');
      const match = testIdFromUrl ? data.find(tc => tc.id === testIdFromUrl) : null;
      setSelectedTestCaseId(match ? match.id : data[0].id);
    }
    setIsLoading(false);
  }, [cycleId, selectedTestCaseId, searchParams]);

  const fetchAttachments = useCallback(async () => {
    if (!selectedTestCaseId) return;
    const { data } = await supabase.from('th_execution_attachments').select('*').eq('cycle_test_case_id', selectedTestCaseId).order('uploaded_at', { ascending: false });
    setAttachments(data || []);
  }, [selectedTestCaseId]);

  const fetchExecutionHistory = useCallback(async (cycleScopeId: string): Promise<ExecutionHistoryRecord | null> => {
    if (!cycleScopeId) return null;
    const { data, error } = await supabase
      .from('th_test_executions')
      .select('*')
      .eq('cycle_scope_id', cycleScopeId)
      .order('execution_number', { ascending: false });
    if (error) {
      console.error('[ExecHistory] FETCH FAILED:', error.code, error.message, error.details);
      return null;
    }
    if (!data || data.length === 0) return null;
    const latest = data[0];
    return {
      id: latest.id,
      execution_number: latest.execution_number,
      result: latest.result,
      executed_by: latest.executed_by,
      executed_at: latest.executed_at,
      step_results: Array.isArray(latest.step_results) ? latest.step_results as any : [],
    } as ExecutionHistoryRecord;
  }, []);

  useEffect(() => { fetchCycle(); fetchTestCases(); }, [cycleId]);
  useEffect(() => { if (selectedTestCaseId) fetchAttachments(); }, [selectedTestCaseId]);

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => setSessionElapsed(Math.floor((Date.now() - sessionStartRef.current) / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle test case selection — determine view vs execute mode
  const selectTest = useCallback(async (id: string) => {
    setSelectedTestCaseId(id);
    setCurrentStepIndex(0);
    const tc = testCases.find(t => t.id === id);
    setNotes(tc?.notes || '');
    
    if (tc && tc.current_status !== 'not_run') {
      // Completed test → enter view mode, fetch history
      const history = await fetchExecutionHistory(id);
      setExecutionHistory(history);
      setViewMode(true);
      setPreviousRunData(null);
    } else {
      setViewMode(false);
      setExecutionHistory(null);
      setPreviousRunData(null);
    }
  }, [testCases, fetchExecutionHistory]);

  // Reset step index on test case change (for URL-based initial selection)
  useEffect(() => {
    setCurrentStepIndex(0);
    const currentTC = testCases.find(tc => tc.id === selectedTestCaseId);
    setNotes(currentTC?.notes || '');
    // Check view mode for initial load
    if (currentTC && currentTC.current_status !== 'not_run') {
      fetchExecutionHistory(currentTC.id).then(h => {
        setExecutionHistory(h);
        setViewMode(true);
      });
    }
  }, [selectedTestCaseId, testCases.length]);

  // ── Derived state ──────────────────────────────────────────────────────
  const filteredTestCases = testCases.filter(tc => {
    if (statusFilter !== 'all' && tc.current_status !== statusFilter) return false;
    if (showMyTestsOnly && tc.assigned_to !== currentUserId) return false;
    return true;
  });

  const currentTestCase = testCases.find(tc => tc.id === selectedTestCaseId);
  const currentIndex = filteredTestCases.findIndex(tc => tc.id === selectedTestCaseId);
  const steps = currentTestCase?.test_case?.steps || [];
  const currentStep = steps[currentStepIndex];

  // Step statuses for the current test case
  const currentStepStatuses = stepStatuses.get(selectedTestCaseId || '') || steps.map((_, i) => ({ stepIndex: i, status: 'not_run' as const }));

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < filteredTestCases.length - 1;
  const canGoPrevStep = currentStepIndex > 0;
  const canGoNextStep = currentStepIndex < steps.length - 1;

  // ── Actions ────────────────────────────────────────────────────────────
  const handleExit = () => navigate(`/testhub/cycles/${cycleId}`);
  const handlePrevious = () => { if (canGoPrev) setSelectedTestCaseId(filteredTestCases[currentIndex - 1].id); };
  const handleNext = () => { if (canGoNext) setSelectedTestCaseId(filteredTestCases[currentIndex + 1].id); };

  const updateExecutionStatus = useCallback(async (status: string, failureReason?: string, failureNotes?: string, defectId?: string | null) => {
    if (!selectedTestCaseId) return;
    if (!currentUserId) {
      console.error('[ExecutionPage] Cannot complete: currentUserId is null. Auth state may not have loaded.');
      catalystToast.error('Authentication not ready. Please try again.');
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Update tm_cycle_scope.current_status
      const updateData: any = {
        current_status: status,
        updated_at: new Date().toISOString(),
      };
      const { error } = await (supabase as any).from('tm_cycle_scope').update(updateData).eq('id', selectedTestCaseId);
      if (error) { catalystToast.error('Failed to update test result'); return; }

      // 2. INSERT execution history record (skip for reset)
      if (status !== 'not_run' && currentTestCase) {
        if (!selectedTestCaseId) return;
        if (!currentUserId) {
          console.error('[ExecHistory] INSERT aborted: currentUserId is null');
          return;
        }

        // Get next execution number
        const { data: lastExec, error: lastExecError } = await supabase
          .from('th_test_executions')
          .select('execution_number')
          .eq('cycle_scope_id', selectedTestCaseId)
          .order('execution_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastExecError) {
          console.error('[ExecHistory] Failed to fetch last execution number:', lastExecError.code, lastExecError.message, lastExecError.details, lastExecError.hint);
        }

        const nextExecutionNumber = (lastExec?.execution_number ?? 0) + 1;
        const key = selectedTestCaseId;
        const currentStatuses = stepStatuses.get(key) || steps.map((_, i) => ({ stepIndex: i, status: 'not_run' as const }));
        const stepResultsSnapshot = steps.map((s, i) => ({
          step_number: s.step_number || i + 1,
          title: s.action || '',
          status: currentStatuses[i]?.status || 'not_run',
          notes: failureReason && currentStatuses[i]?.status === 'failed' ? failureReason : '',
        }));
        const completedAt = new Date().toISOString();
        const sessionStartTime = new Date(sessionStartRef.current).toISOString();

        console.log('[ExecHistory] INSERT payload:', {
          cycle_scope_id: selectedTestCaseId,
          execution_number: nextExecutionNumber,
          result: status,
          step_results: stepResultsSnapshot,
          executed_by: currentUserId,
          executed_at: completedAt,
        });

        const insertPayload = {
          test_case_id: currentTestCase.test_case_id,
          test_cycle_id: cycle?.id ?? null,
          cycle_name: cycle?.name ?? null,
          cycle_scope_id: selectedTestCaseId,
          execution_number: nextExecutionNumber ?? 1,
          result: status,
          step_results: stepResultsSnapshot ?? [],
          executed_by: currentUserId,
          executed_at: completedAt,
          notes: failureNotes ?? null,
        };

        console.log('[ExecHistory] Attempting INSERT:', insertPayload);

        const { data: execData, error: execError } = await supabase
          .from('th_test_executions')
          .insert(insertPayload)
          .select('id, execution_number')
          .single();

        if (execError) {
          console.error('[ExecHistory] INSERT FAILED:', execError.code, execError.message, execError.details, execError.hint);
          catalystToast.error('Warning: Run history could not be saved', {
            description: execError.message,
            title: 'Execution History Warning',
          });
        } else {
          console.log('[ExecHistory] INSERT SUCCESS:', execData);
          await queryClient.invalidateQueries({
            queryKey: ['execution-history', selectedTestCaseId],
          });
          const refreshedHistory = await fetchExecutionHistory(selectedTestCaseId);
          if (refreshedHistory) {
            setExecutionHistory(refreshedHistory);
          }
        }
      }

      const toastMap: Record<string, () => void> = {
        passed: () => catalystToast.success('Test case marked as passed', { title: 'Test Passed' }),
        failed: () => catalystToast.error('Test case marked as failed', { title: 'Test Failed' }),
        blocked: () => catalystToast.warning('Test case marked as blocked', { title: 'Test Blocked' }),
        skipped: () => catalystToast.info('Test case skipped', { title: 'Test Skipped' }),
        not_run: () => catalystToast.info('Test case reset to not run', { title: 'Reset' }),
      };
      toastMap[status]?.();

      await fetchTestCases();
      await fetchCycle();

      // Auto-advance in FastTrack mode or after completing
      if (status !== 'not_run' && canGoNext) {
        if (fastTrackMode || status === 'passed') {
          setTimeout(() => handleNext(), 300);
        }
      }
    } catch (err: any) { catalystToast.error(err.message || 'Failed to update test result'); }
    finally { setIsSubmitting(false); }
  }, [selectedTestCaseId, currentUserId, currentTestCase, canGoNext, fastTrackMode, fetchTestCases, fetchCycle, stepStatuses, steps, cycle, fetchExecutionHistory, queryClient]);

  const handlePass = () => {
    if (fastTrackMode || steps.length === 0) {
      updateExecutionStatus('passed');
    } else {
      // Mark current step passed
      updateStepStatus('passed');
    }
  };
  const handleFail = () => setIsFailureModalOpen(true);
  const handleBlocked = () => {
    if (fastTrackMode || steps.length === 0) {
      setIsFailureModalOpen(true); // Use failure modal for reason
    } else {
      updateStepStatus('blocked');
    }
  };
  const handleSkip = () => {
    if (fastTrackMode || steps.length === 0) {
      updateExecutionStatus('skipped');
    } else {
      updateStepStatus('skipped');
    }
  };
  const handleReset = () => updateExecutionStatus('not_run');

  const handleFailureConfirm = async (failureReason: string, defectId: string | null, failureNotes: string) => {
    setIsFailureModalOpen(false);
    if (fastTrackMode || steps.length === 0) {
      await updateExecutionStatus('failed', failureReason, failureNotes, defectId);
    } else {
      await updateStepStatus('failed', failureReason);
    }
  };

  // Step-level status tracking + DB persistence
  const updateStepStatus = useCallback((status: 'passed' | 'failed' | 'blocked' | 'skipped', comment?: string) => {
    const step = steps[currentStepIndex];
    if (!step || !selectedTestCaseId) return;

    // Persist step result asynchronously
    (async () => {
      try {
        await supabase.from('tm_step_results').insert({
          test_run_id: selectedTestCaseId,
          test_step_id: step.id,
          status: status as any,
          comment: comment || null,
          executed_at: new Date().toISOString(),
          executed_by: currentUserId,
        });
      } catch (e) {
        console.error('Step save error:', e);
      }
    })();

    setStepStatuses(prev => {
      const key = selectedTestCaseId;
      const current = prev.get(key) || steps.map((_, i) => ({ stepIndex: i, status: 'not_run' as const }));
      const updated = current.map((s, i) => i === currentStepIndex ? { ...s, status } : s);
      return new Map(prev).set(key, updated);
    });

    const element = document.getElementById(`step-card-${currentStepIndex}`);
    if (element) {
      const colors: Record<string, string> = isDark
        ? { passed: 'rgba(34,197,94,0.12)', failed: 'rgba(248,113,113,0.12)', blocked: 'rgba(251,191,36,0.12)', skipped: '#1A1A1A' }
        : { passed: '#ECFDF5', failed: '#FEF2F2', blocked: '#FFFBEB', skipped: '#F8FAFC' };
      element.style.backgroundColor = colors[status] || 'hsl(var(--card))';
      setTimeout(() => { element.style.backgroundColor = 'hsl(var(--card))'; }, 200);
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentStepIndex, selectedTestCaseId, steps, currentUserId]);

  // Derive overall status from step statuses
  const derivedStatus = useMemo(() => {
    if (!selectedTestCaseId || steps.length === 0) return 'not_run' as const;
    const key = selectedTestCaseId;
    const current = stepStatuses.get(key) || steps.map((_, i) => ({ stepIndex: i, status: 'not_run' as const }));
    const statuses = current.map(s => s.status);
    const markedStatuses = statuses.filter(s => s !== 'not_run');
    if (markedStatuses.length === 0) return 'not_run' as const;
    return deriveOverallStatus(markedStatuses);
  }, [selectedTestCaseId, stepStatuses, steps]);

  const allStepsMarked = useMemo(() => {
    if (!selectedTestCaseId || steps.length === 0) return false;
    const key = selectedTestCaseId;
    const current = stepStatuses.get(key) || steps.map((_, i) => ({ stepIndex: i, status: 'not_run' as const }));
    return current.every(s => s.status !== 'not_run');
  }, [selectedTestCaseId, stepStatuses, steps]);

  const anyStepMarked = useMemo(() => {
    if (!selectedTestCaseId || steps.length === 0) return false;
    const key = selectedTestCaseId;
    const current = stepStatuses.get(key) || steps.map((_, i) => ({ stepIndex: i, status: 'not_run' as const }));
    return current.some(s => s.status !== 'not_run');
  }, [selectedTestCaseId, stepStatuses, steps]);

  // Complete Execution — derives overall status from steps
  const handleCompleteExecution = async () => {
    if (!selectedTestCaseId || derivedStatus === 'not_run') return;
    
    await updateExecutionStatus(derivedStatus);
    
    // Only show failure modal if derived failed but NO individual step was failed
    // (meaning user forced a fail at test level without step-level failures —
    //  if steps were already failed, failure info was captured at step level)
    if (derivedStatus === 'failed') {
      const key = selectedTestCaseId;
      const current = stepStatuses.get(key) || [];
      const hasStepFailure = current.some(s => s.status === 'failed');
      if (!hasStepFailure) {
        setIsFailureModalOpen(true);
      }
    }
  };

  // Re-run handler — enter execution mode with fresh step states
  const handleRerun = useCallback(async () => {
    if (!selectedTestCaseId) return;
    // Save current history as previous run reference
    const history = await fetchExecutionHistory(selectedTestCaseId);
    setPreviousRunData(history);
    
    // Reset all step statuses to not_run in UI
    const key = selectedTestCaseId;
    const freshStatuses = steps.map((_, i) => ({ stepIndex: i, status: 'not_run' as const }));
    setStepStatuses(new Map(stepStatuses).set(key, freshStatuses));
    setCurrentStepIndex(0);
    
    // Reset cycle scope status to not_run so execution flow works
    await (supabase as any).from('tm_cycle_scope').update({
      current_status: 'not_run',
      updated_at: new Date().toISOString(),
    }).eq('id', selectedTestCaseId);
    
    await fetchTestCases();
    setViewMode(false);
    setExecutionHistory(null);
  }, [selectedTestCaseId, steps, stepStatuses, fetchExecutionHistory, fetchTestCases]);

  // Notes auto-save — disabled until notes column is added to tm_cycle_scope
  // useEffect(() => { ... }, [notes, selectedTestCaseId]);

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (s.showShortcuts && e.key === 'Escape') { setShowShortcuts(false); e.preventDefault(); return; }
      if (s.isFailureModalOpen || s.showShortcuts) return;

      const key = e.key.toLowerCase();

      // Ctrl combos
      if (e.ctrlKey || e.metaKey) {
        if (key === 'enter') { e.preventDefault(); handleCompleteExecution(); return; }
        if (key === 's') { e.preventDefault(); catalystToast.success('Progress saved'); return; }
        if (key === 's') { e.preventDefault(); catalystToast.success('Progress saved'); return; }
        return;
      }

      if (s.isSubmitting) return;

      switch (key) {
        case 'p': handlePass(); break;
        case 'f': handleFail(); break;
        case 'b': handleBlocked(); break;
        case 's': e.preventDefault(); handleSkip(); break;
        case 'r': e.preventDefault(); handleReset(); break;
        case 'd': e.preventDefault(); setIsFailureModalOpen(true); break;
        case 'a': e.preventDefault(); document.getElementById('attachment-input')?.click(); break;
        case 'c': e.preventDefault(); document.getElementById('notes-textarea')?.focus(); break;
        case '?': setShowShortcuts(true); break;
        case 'arrowleft': handlePrevStep(); break;
        case 'arrowright': case 'n': handleNextStep(); break;
        case 'home': setCurrentStepIndex(0); break;
        case 'end': setCurrentStepIndex(Math.max(0, steps.length - 1)); break;
        default:
          // Number keys 1-9 jump to step
          const num = parseInt(key);
          if (num >= 1 && num <= 9 && num <= steps.length) {
            setCurrentStepIndex(num - 1);
          }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [steps.length, isSubmitting, isFailureModalOpen, showShortcuts, currentStepIndex, selectedTestCaseId, fastTrackMode, currentUserId, canGoPrev, canGoNext]);

  const handlePrevStep = () => { if (canGoPrevStep) setCurrentStepIndex(prev => prev - 1); };
  const handleNextStep = () => { if (canGoNextStep) setCurrentStepIndex(prev => prev + 1); };

  // ── Render ─────────────────────────────────────────────────────────────
  if (isLoading || !cycle) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'hsl(var(--background))' }}>
        <div style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
          <div style={{ width: 40, height: 40, border: '3px solid hsl(var(--border))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          Loading execution mode...
        </div>
      </div>
    );
  }

  const testCase = currentTestCase?.test_case;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'hsl(var(--background))' }}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{
        height: 56, padding: '0 20px', backgroundColor: 'hsl(var(--card))',
        borderBottom: '1px solid hsl(var(--border))', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleExit} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
            border: '1px solid hsl(var(--border))', borderRadius: 6,
            backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            <ArrowLeft size={16} /> Exit
          </button>
          <div style={{ height: 20, width: 1, backgroundColor: 'hsl(var(--border))' }} />
          <Play size={18} style={{ color: '#10B981' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--primary))', backgroundColor: 'hsl(var(--primary) / 0.1)', padding: '2px 8px', borderRadius: 4 }}>
            {cycle.cycle_key}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))' }}>{cycle.name}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* FastTrack toggle */}
          <button
            onClick={() => setFastTrackMode(!fastTrackMode)}
            title={fastTrackMode ? 'FastTrack ON: Simple pass/fail, auto-advance' : 'Enable FastTrack mode'}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
              border: fastTrackMode ? 'none' : '1px solid hsl(var(--border))',
              borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              backgroundColor: fastTrackMode ? '#FEF3C7' : 'hsl(var(--card))',
              color: fastTrackMode ? '#D97706' : 'hsl(var(--muted-foreground))',
            }}
          >
            <Zap size={14} /> {fastTrackMode ? 'FastTrack ON' : 'FastTrack'}
          </button>

          {/* Stats badges */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { count: cycle.passed_count, color: '#059669', bg: isDark ? 'rgba(34,197,94,0.12)' : '#ECFDF5', Icon: CheckCircle2 },
              { count: cycle.failed_count, color: '#DC2626', bg: isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2', Icon: XCircle },
              { count: cycle.blocked_count, color: '#D97706', bg: isDark ? 'rgba(251,191,36,0.12)' : '#FFFBEB', Icon: AlertTriangle },
            ].map((s, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 8px', backgroundColor: s.bg, borderRadius: 6, fontSize: 11, fontWeight: 600, color: s.color }}>
                <s.Icon size={12} /> {s.count}
              </span>
            ))}
          </div>

          {/* Session timer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
            backgroundColor: 'hsl(var(--muted) / 0.3)', borderRadius: 6,
          }}>
            <Timer size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
            <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: 'hsl(var(--foreground))' }}>
              {formatTime(sessionElapsed)}
            </span>
          </div>

          {/* Progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 100, height: 6, backgroundColor: 'hsl(var(--muted))', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${cycle.progress_percent}%`, background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)', borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{cycle.progress_percent}%</span>
          </div>

          {/* Sidebar toggle */}
          <button onClick={() => setShowSidebar(!showSidebar)} title="Toggle sidebar" style={{
            padding: 6, border: '1px solid hsl(var(--border))', borderRadius: 6,
            backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
          }}>
            {showSidebar ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>

          {/* Shortcuts help */}
          <button onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (?)" style={{
            padding: 6, border: '1px solid hsl(var(--border))', borderRadius: 6,
            backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
          }}>
            <Keyboard size={16} />
          </button>
        </div>
      </div>

      {/* ── Three-Pane Body ───────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ResizablePanelGroup direction="horizontal">
          {/* ── Panel 1: Test List ──────────────────────────────────────── */}
          <ResizablePanel defaultSize={22} minSize={15} maxSize={35}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'hsl(var(--card))', borderRight: '1px solid hsl(var(--border))' }}>
              <div style={{ padding: 12, borderBottom: '1px solid hsl(var(--border))' }}>
                <h3 style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--muted-foreground))', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Test Queue ({filteredTestCases.length})
                </h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    style={{ flex: 1, height: 30, padding: '0 6px', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11, color: 'hsl(var(--foreground))', backgroundColor: 'hsl(var(--background))' }}>
                    <option value="all">All</option>
                    <option value="not_run">Not Run</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="blocked">Blocked</option>
                    <option value="skipped">Skipped</option>
                  </select>
                  <button onClick={() => setShowMyTestsOnly(!showMyTestsOnly)}
                    style={{
                      height: 30, padding: '0 8px', border: `1px solid ${showMyTestsOnly ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                      borderRadius: 6, backgroundColor: showMyTestsOnly ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--background))',
                      color: showMyTestsOnly ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', fontSize: 11, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                    <User size={12} /> Mine
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
                {filteredTestCases.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>No tests match filter</div>
                ) : (
                  filteredTestCases.map(tc => {
                    const st = statusConfig[tc.current_status] || statusConfig.not_run;
                    const StatusIcon = st.icon;
                    const isSelected = tc.id === selectedTestCaseId;
                    return (
                      <button key={tc.id} onClick={() => selectTest(tc.id)}
                        style={{
                          width: '100%', padding: '10px 10px', marginBottom: 2, border: isSelected ? '2px solid hsl(var(--primary))' : '1px solid transparent',
                          borderRadius: 6, backgroundColor: isSelected ? 'hsl(var(--primary) / 0.05)' : 'transparent',
                          cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: 6, backgroundColor: st.bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                          }}>
                            <StatusIcon size={13} style={{ color: st.color }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--primary))' }}>{tc.test_case?.case_key}</span>
                            </div>
                            <p style={{
                              fontSize: 12, fontWeight: isSelected ? 600 : 400,
                              color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                              margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {tc.test_case?.title}
                            </p>
                            {tc.current_status !== 'not_run' && tc.executed_at && (
                              <p style={{ fontSize: 10, color: '#94A3B8', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {new Date(tc.executed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                {tc.assignee?.full_name ? ` · ${tc.assignee.full_name.split(' ')[0]}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Bottom progress */}
              <div style={{ padding: 12, borderTop: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--muted) / 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>Progress</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                    {cycle.total_cases - cycle.not_run_count}/{cycle.total_cases}
                  </span>
                </div>
                <div style={{ height: 5, backgroundColor: 'hsl(var(--muted))', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${cycle.progress_percent}%`, background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)', borderRadius: 3 }} />
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ── Panel 2: Step Runner ────────────────────────────────────── */}
          <ResizablePanel defaultSize={showSidebar ? 56 : 78} minSize={40}>
            {currentTestCase && testCase ? (
              viewMode && executionHistory ? (
                /* ═══ VIEW MODE — Read-only execution history ═══ */
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Header */}
                  <div style={{ padding: '16px 24px', borderBottom: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--primary))', backgroundColor: 'hsl(var(--primary) / 0.1)', padding: '3px 10px', borderRadius: 5 }}>
                          {testCase.case_key}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                          color: statusConfig[currentTestCase.current_status]?.color,
                          backgroundColor: statusConfig[currentTestCase.current_status]?.bg,
                        }}>
                          {statusConfig[currentTestCase.current_status]?.label}
                        </span>
                        <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', padding: '3px 8px', backgroundColor: 'hsl(var(--muted) / 0.3)', borderRadius: 6, textTransform: 'capitalize' }}>
                          {testCase.priority?.name || 'Medium'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setViewMode(false); setExecutionHistory(null); }} style={{
                          height: 34, padding: '0 12px', border: '1px solid hsl(var(--border))', borderRadius: 6,
                          backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))',
                          fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <ArrowLeft size={14} /> Back
                        </button>
                        <button onClick={handleRerun} style={{
                          height: 34, padding: '0 14px', border: 'none', borderRadius: 6,
                          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                          color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                          <Play size={13} /> Re-run
                        </button>
                      </div>
                    </div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'hsl(var(--foreground))', margin: 0, lineHeight: 1.3 }}>{testCase.title}</h2>
                    {testCase.description && <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', margin: '6px 0 0', lineHeight: 1.4 }}>{testCase.description}</p>}
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: '8px 0 0' }}>
                      Run #{executionHistory.execution_number} · Executed {new Date(executionHistory.executed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {executionHistory.executor?.full_name ? ` · ${executionHistory.executor.full_name}` : ''}
                    </p>
                  </div>

                  {/* Read-only step list */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Preconditions */}
                      {testCase.preconditions && (
                        <div style={{ marginBottom: 12, padding: 14, backgroundColor: isDark ? 'rgba(251,191,36,0.12)' : '#FFFBEB', border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : '#FDE68A'}`, borderRadius: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <AlertTriangle size={14} style={{ color: '#D97706' }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>Preconditions</span>
                          </div>
                          <p style={{ fontSize: 13, color: '#92400E', margin: 0, lineHeight: 1.4 }}>{testCase.preconditions}</p>
                        </div>
                      )}

                      {executionHistory.step_results.length === 0 ? (
                        <div style={{ padding: 32, textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                          No step data recorded for this run.
                        </div>
                      ) : (
                        executionHistory.step_results.map((step, i) => {
                          const stepColors: Record<string, { text: string; bg: string; border: string }> = isDark ? {
                            passed:  { text: '#16A34A', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' },
                            failed:  { text: '#DC2626', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
                            blocked: { text: '#D97706', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' },
                            skipped: { text: '#878787', bg: '#1A1A1A', border: 'rgba(255,255,255,0.08)' },
                            not_run: { text: '#878787', bg: '#1A1A1A', border: 'rgba(255,255,255,0.08)' },
                          } : {
                            passed:  { text: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
                            failed:  { text: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                            blocked: { text: '#D97706', bg: '#FFFBEB', border: '#FED7AA' },
                            skipped: { text: '#475569', bg: '#F8FAFC', border: '#E2E8F0' },
                            not_run: { text: '#64748B', bg: '#F1F5F9', border: '#E2E8F0' },
                          };
                          const colors = stepColors[step.status] || stepColors.not_run;
                          return (
                            <div key={i} style={{
                              padding: '12px 16px', backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                              border: `0.75px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`, borderRadius: 6,
                              borderLeft: `3px solid ${colors.border}`,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                                  Step {step.step_number}
                                </span>
                                <span style={{
                                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                                  color: colors.text, backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
                                  textTransform: 'uppercase',
                                }}>
                                  {step.status.replace('_', ' ')}
                                </span>
                              </div>
                              <div style={{ marginBottom: 4 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ACTION</span>
                                <p style={{ fontSize: 13, color: 'hsl(var(--foreground))', margin: '4px 0 0', lineHeight: 1.5 }}>{step.title}</p>
                              </div>
                              {step.notes ? (
                                <div style={{ marginTop: 8, padding: '6px 10px', backgroundColor: isDark ? '#1A1A1A' : '#F8FAFC', borderRadius: 4 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>NOTES</span>
                                  <p style={{ fontSize: 12, color: 'hsl(var(--foreground))', margin: '2px 0 0' }}>{step.notes}</p>
                                </div>
                              ) : (
                                <p style={{ fontSize: 11, color: '#94A3B8', margin: '8px 0 0', fontStyle: 'italic' }}>No notes</p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Bottom bar — view mode */}
                  <div style={{
                    padding: '12px 20px', backgroundColor: 'hsl(var(--card))',
                    borderTop: '1px solid hsl(var(--border))', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <button onClick={() => { setViewMode(false); setExecutionHistory(null); }} style={{
                      height: 36, padding: '0 14px', border: '1px solid hsl(var(--border))', borderRadius: 6,
                      backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))',
                      fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <ArrowLeft size={14} /> Back to Queue
                    </button>
                    <button onClick={handleRerun} style={{
                      height: 36, padding: '0 16px', border: 'none', borderRadius: 6,
                      background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                      color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <Play size={14} /> Re-run
                    </button>
                  </div>
                </div>
              ) : (
              /* ═══ EXECUTION MODE — Normal step-by-step ═══ */
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Test case header */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--primary))', backgroundColor: 'hsl(var(--primary) / 0.1)', padding: '3px 10px', borderRadius: 5 }}>
                      {testCase.case_key}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 6,
                      color: statusConfig[currentTestCase.current_status]?.color,
                      backgroundColor: statusConfig[currentTestCase.current_status]?.bg,
                    }}>
                      {statusConfig[currentTestCase.current_status]?.label}
                    </span>
                    <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', padding: '3px 8px', backgroundColor: 'hsl(var(--muted) / 0.3)', borderRadius: 6, textTransform: 'capitalize' }}>
                      {testCase.priority?.name || 'Medium'}
                    </span>
                    {fastTrackMode && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', backgroundColor: '#FEF3C7', padding: '3px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Zap size={10} /> FAST TRACK
                      </span>
                    )}
                    {previousRunData && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '3px 8px', borderRadius: 5 }}>
                        RE-RUN (prev: Run #{previousRunData.execution_number})
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'hsl(var(--foreground))', margin: 0, lineHeight: 1.3 }}>{testCase.title}</h2>
                  {testCase.description && <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', margin: '6px 0 0', lineHeight: 1.4 }}>{testCase.description}</p>}
                </div>

                {/* Step progress indicator */}
                {steps.length > 0 && !fastTrackMode && (
                  <div style={{ padding: '10px 24px', borderBottom: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
                        Step {currentStepIndex + 1} of {steps.length}
                      </span>
                    </div>
                    <StepProgressIndicator
                      steps={currentStepStatuses.map((s, i) => ({ step_number: i + 1, status: s.status }))}
                      currentIndex={currentStepIndex}
                      onStepClick={setCurrentStepIndex}
                    />
                  </div>
                )}

                {/* Step content area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                  <div style={{ maxWidth: 720, margin: '0 auto' }}>
                    {/* Preconditions */}
                    {testCase.preconditions && (
                      <div style={{ marginBottom: 20, padding: 14, backgroundColor: isDark ? 'rgba(251,191,36,0.12)' : '#FFFBEB', border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : '#FDE68A'}`, borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <AlertTriangle size={14} style={{ color: '#D97706' }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>Preconditions</span>
                        </div>
                        <p style={{ fontSize: 13, color: '#92400E', margin: 0, lineHeight: 1.4 }}>{highlightVariables(testCase.preconditions)}</p>
                      </div>
                    )}

                    {/* Current step card or FastTrack view */}
                    {fastTrackMode || steps.length === 0 ? (
                      /* FastTrack: show all steps as read-only, whole-test P/F */
                      <div>
                        {steps.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {steps.map((step, i) => (
                              <div key={i} style={{ padding: '10px 14px', backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}>
                                <div style={{ display: 'flex', gap: 10 }}>
                                  <span style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {step.step_number || i + 1}
                                  </span>
                                  <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: 13, color: 'hsl(var(--foreground))', margin: 0 }}>{highlightVariables(step.action)}</p>
                                    {step.expected_result && (
                                      <p style={{ fontSize: 12, color: '#059669', margin: '6px 0 0', paddingLeft: 10, borderLeft: '2px solid #A7F3D0' }}>{highlightVariables(step.expected_result)}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: 32, textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                            No steps defined — mark test result directly.
                          </div>
                        )}
                      </div>
                     ) : currentStep ? (
                       /* Step-by-step mode: show current step */
                       <div id={`step-card-${currentStepIndex}`} style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, overflow: 'hidden', transition: 'background-color 0.2s' }}>
                         <div style={{ padding: '12px 16px', backgroundColor: 'hsl(var(--muted) / 0.3)', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', gap: 10 }}>
                           <span style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             {currentStep.step_number || currentStepIndex + 1}
                           </span>
                           <span style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                             Step {currentStep.step_number || currentStepIndex + 1}
                           </span>
                           {currentStepStatuses[currentStepIndex]?.status !== 'not_run' && (
                             <span style={{
                               fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                               color: statusConfig[currentStepStatuses[currentStepIndex].status]?.color,
                               backgroundColor: statusConfig[currentStepStatuses[currentStepIndex].status]?.bg,
                             }}>
                               {statusConfig[currentStepStatuses[currentStepIndex].status]?.label}
                             </span>
                           )}
                         </div>
                         <div style={{ padding: 20 }}>
                           <div style={{ marginBottom: 4 }}>
                             <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ACTION</span>
                           </div>
                           <p style={{ fontSize: 15, color: 'hsl(var(--foreground))', margin: '6px 0 0', lineHeight: 1.6 }}>
                             {highlightVariables(currentStep.action)}
                           </p>

                           {currentStep.expected_result && (
                             <div style={{ marginTop: 16, padding: 14, backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : '#ECFDF5', borderRadius: 8, borderLeft: '3px solid #10B981' }}>
                               <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em' }}>EXPECTED</span>
                               <p style={{ fontSize: 14, color: isDark ? '#A1A1A1' : '#065F46', margin: '4px 0 0', lineHeight: 1.5 }}>
                                 {highlightVariables(currentStep.expected_result)}
                               </p>
                             </div>
                           )}
                         </div>
                       </div>
                    ) : null}

                    {/* Notes */}
                     <div style={{ marginTop: 20 }}>
                       <textarea
                         id="notes-textarea"
                         value={notes}
                         onChange={e => setNotes(e.target.value)}
                         placeholder="Add execution notes... (C to focus)"
                         style={{
                           width: '100%', minHeight: 80, padding: 12, border: '1px solid hsl(var(--border))',
                           borderRadius: 8, fontSize: 13, color: 'hsl(var(--foreground))',
                           backgroundColor: 'hsl(var(--background))', resize: 'vertical', fontFamily: 'inherit',
                         }}
                       />
                     </div>
                  </div>
                </div>

                {/* ── Action bar ───────────────────────────────────────────── */}
                <div style={{
                  padding: '12px 20px', backgroundColor: 'hsl(var(--card))',
                  borderTop: '1px solid hsl(var(--border))', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative',
                }}>
                  <div style={{ position: 'absolute', left: 20, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                    Test {currentIndex + 1} of {filteredTestCases.length}
                  </div>

                  {/* Navigation */}
                  <button onClick={handlePrevious} disabled={!canGoPrev || isSubmitting} style={{
                    height: 38, padding: '0 12px', border: '1px solid hsl(var(--border))', borderRadius: 6,
                    backgroundColor: 'hsl(var(--card))', color: canGoPrev ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                    fontSize: 12, fontWeight: 500, cursor: canGoPrev ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 4, opacity: canGoPrev ? 1 : 0.5,
                  }}>
                    <ChevronLeft size={16} /> Prev
                  </button>

                  {/* Status buttons */}
                  {[
                    { key: 'passed', label: 'Pass', shortcut: 'P', icon: CheckCircle2, onClick: handlePass, color: '#059669', bg: isDark ? 'rgba(34,197,94,0.12)' : '#ECFDF5', activeBg: 'linear-gradient(135deg, #10B981, #059669)' },
                    { key: 'failed', label: 'Fail', shortcut: 'F', icon: XCircle, onClick: handleFail, color: '#DC2626', bg: isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2', activeBg: 'linear-gradient(135deg, #EF4444, #DC2626)' },
                    { key: 'blocked', label: 'Block', shortcut: 'B', icon: AlertTriangle, onClick: handleBlocked, color: '#D97706', bg: isDark ? 'rgba(251,191,36,0.12)' : '#FFFBEB', activeBg: 'linear-gradient(135deg, #F59E0B, #D97706)' },
                    { key: 'skipped', label: 'Skip', shortcut: 'S', icon: SkipForward, onClick: handleSkip, color: isDark ? '#878787' : '#64748B', bg: 'hsl(var(--muted) / 0.3)', activeBg: 'linear-gradient(135deg, #64748B, #475569)' },
                  ].map(btn => {
                    const Icon = btn.icon;
                    const isActive = currentTestCase.current_status === btn.key;
                    return (
                      <button key={btn.key} onClick={btn.onClick} disabled={isSubmitting} title={`${btn.label} (${btn.shortcut})`} style={{
                        height: 38, padding: '0 16px', border: isActive ? 'none' : `1px solid ${btn.color}30`,
                        borderRadius: 6, background: isActive ? btn.activeBg : btn.bg,
                        color: isActive ? '#FFFFFF' : btn.color, fontSize: 13, fontWeight: 600,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        opacity: isSubmitting ? 0.7 : 1, boxShadow: isActive ? `0 2px 8px ${btn.color}40` : 'none',
                      }}>
                        <Icon size={15} /> {btn.label}
                        <kbd style={{ fontSize: 10, opacity: 0.7, padding: '1px 5px', backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : `${btn.color}10`, borderRadius: 4, fontFamily: 'monospace' }}>
                          {btn.shortcut}
                        </kbd>
                      </button>
                    );
                  })}

                  {/* Reset */}
                  {currentTestCase.current_status !== 'not_run' && (
                    <button onClick={handleReset} disabled={isSubmitting} title="Reset (Ctrl+R)" style={{
                      height: 38, padding: '0 10px', border: '1px solid hsl(var(--border))', borderRadius: 6,
                      backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
                    }}>
                      <RotateCcw size={14} />
                    </button>
                  )}

                  <button onClick={handleNext} disabled={!canGoNext || isSubmitting} style={{
                    height: 38, padding: '0 12px', border: '1px solid hsl(var(--border))', borderRadius: 6,
                    backgroundColor: 'hsl(var(--card))', color: canGoNext ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                    fontSize: 12, fontWeight: 500, cursor: canGoNext ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 4, opacity: canGoNext ? 1 : 0.5,
                  }}>
                    Next <ChevronRight size={16} />
                  </button>

                  <div style={{ position: 'absolute', right: 20, display: 'flex', gap: 8 }}>
                    {steps.length > 0 && !fastTrackMode && (() => {
                      const isDisabled = !anyStepMarked || isSubmitting;
                      const statusColors: Record<string, { bg: string; text: string }> = {
                        passed:  { bg: '#16A34A', text: '#FFFFFF' },
                        failed:  { bg: '#DC2626', text: '#FFFFFF' },
                        blocked: { bg: '#D97706', text: '#FFFFFF' },
                        skipped: { bg: '#475569', text: '#FFFFFF' },
                        not_run: { bg: isDark ? '#1A1A1A' : '#E2E8F0', text: isDark ? '#878787' : '#64748B' },
                      };
                      const colors = statusColors[derivedStatus] || statusColors.not_run;
                      const label = derivedStatus !== 'not_run'
                        ? `Complete → ${derivedStatus.toUpperCase()}`
                        : 'Complete Execution';
                      return (
                        <button
                          onClick={handleCompleteExecution}
                          disabled={isDisabled}
                          title={!anyStepMarked ? 'Mark all steps before completing' : `Complete with status: ${derivedStatus}`}
                          style={{
                            height: 34, padding: '0 14px', border: isDisabled ? `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}` : 'none',
                            borderRadius: 6, backgroundColor: isDisabled ? (isDark ? '#1A1A1A' : '#F8FAFC') : colors.bg,
                            color: isDisabled ? (isDark ? '#878787' : '#94A3B8') : colors.text, fontSize: 12, fontWeight: 700,
                            cursor: isDisabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                            opacity: isDisabled ? 0.7 : 1, transition: 'all 150ms ease',
                            boxShadow: isDisabled ? 'none' : `0 2px 8px ${colors.bg}40`,
                            letterSpacing: '0.01em',
                          }}
                        >
                          <CheckCircle2 size={13} /> {label}
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* Step navigation (only in step mode) */}
                {steps.length > 1 && !fastTrackMode && (
                  <div style={{
                    padding: '8px 20px', backgroundColor: 'hsl(var(--muted) / 0.15)',
                    borderTop: '1px solid hsl(var(--border))', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 16,
                  }}>
                    <button onClick={handlePrevStep} disabled={!canGoPrevStep} style={{
                      fontSize: 12, color: canGoPrevStep ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                      border: 'none', backgroundColor: 'transparent', cursor: canGoPrevStep ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', gap: 4, opacity: canGoPrevStep ? 1 : 0.4,
                    }}>
                      ← Prev Step
                    </button>
                    <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                      Step {currentStepIndex + 1} / {steps.length}
                    </span>
                    <button onClick={handleNextStep} disabled={!canGoNextStep} style={{
                      fontSize: 12, color: canGoNextStep ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                      border: 'none', backgroundColor: 'transparent', cursor: canGoNextStep ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', gap: 4, opacity: canGoNextStep ? 1 : 0.4,
                    }}>
                      Next Step →
                    </button>
                  </div>
                )}
              </div>
              )
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--muted-foreground))' }}>
                <div style={{ textAlign: 'center' }}>
                  <Clock size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                  <p style={{ fontSize: 15, margin: 0 }}>Select a test case from the queue</p>
                </div>
              </div>
            )}
          </ResizablePanel>

          {/* ── Panel 3: Sidebar ────────────────────────────────────────── */}
          {showSidebar && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={22} minSize={15} maxSize={35}>
                {currentTestCase ? (
                  <ExecutionSidebar
                    cycleTestCaseId={currentTestCase.id}
                    attachments={attachments}
                    onAttachmentsChange={fetchAttachments}
                    onCreateDefect={handleFail}
                    previousRunData={previousRunData}
                    isViewMode={viewMode}
                  />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
                    Select a test to view details
                  </div>
                )}
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      <FailureReasonModal
        isOpen={isFailureModalOpen}
        testCaseKey={currentTestCase?.test_case?.case_key || ''}
        testCaseTitle={currentTestCase?.test_case?.title || ''}
        testCaseId={currentTestCase?.test_case_id}
        cycleId={cycleId}
        cycleTestCaseId={selectedTestCaseId || undefined}
        onClose={() => setIsFailureModalOpen(false)}
        onConfirm={handleFailureConfirm}
      />

      <KeyboardShortcutsGuide isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
