/**
 * G19: Three-Pane Execution Page
 * Route: /testhub/cycles/:cycleId/execute
 *
 * Three-pane layout: Test List | Step Runner | Sidebar (Attachments/Defects)
 * Features: Step-level execution, keyboard shortcuts (P/F/B/S/1-9/?),
 * resizable panels, FastTrack mode, execution history, view/re-run modes.
 *
 * Sub-components extracted to:
 *   ExecutionHeader.tsx   — top header bar
 *   ExecutionTestList.tsx — left panel test queue
 *   ExecutionViewMode.tsx — read-only execution history view
 *   ExecutionRunMode.tsx  — step-by-step execution mode
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
  Clock, CheckCircle2, XCircle, AlertTriangle, SkipForward,
} from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { FailureReasonModal } from '@/components/testhub/FailureReasonModal';
import { KeyboardShortcutsGuide } from '@/components/testhub/execution/KeyboardShortcutsGuide';
import { ExecutionSidebar } from '@/components/testhub/execution/ExecutionSidebar';
import { ExecutionHeader } from '@/components/testhub/execution/ExecutionHeader';
import { ExecutionTestList } from '@/components/testhub/execution/ExecutionTestList';
import { ExecutionViewMode } from '@/components/testhub/execution/ExecutionViewMode';
import { ExecutionRunMode } from '@/components/testhub/execution/ExecutionRunMode';

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
  
  locked_version?: number | null;
  test_case: {
    id: string;
    case_key: string;
    title: string;
    description: string | null;
    preconditions: string | null;
    priority_id: string | null;
    case_type_id: string | null;
    current_version?: number | null;
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

// formatTime and highlightVariables moved to ExecutionHeader.tsx and ExecutionRunMode.tsx

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
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [fastTrackMode, setFastTrackMode] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [notes, setNotes] = useState('');

  // Refs for keyboard handler
  const stateRef = useRef({ isSubmitting: false, isFailureModalOpen: false, isSkipModalOpen: false, showShortcuts: false, currentStepIndex: 0, fastTrackMode: false });
  useEffect(() => {
    stateRef.current = { isSubmitting, isFailureModalOpen, isSkipModalOpen, showShortcuts, currentStepIndex, fastTrackMode };
  });

  // ── Data fetching ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setCurrentUserId(user.id); });
  }, []);

  const fetchCycle = useCallback(async () => {
    if (!cycleId) return;
    const { data, error } = await typedQuery('tm_test_cycles').select('*').eq('id', cycleId).single();
    if (!error && data) setCycle(data as any);
  }, [cycleId]);

  const fetchTestCases = useCallback(async () => {
    if (!cycleId) return;
    const { data, error } = await typedQuery('tm_cycle_scope')
      .select(`*, test_case:tm_test_cases ( id, case_key, title, description, preconditions, priority_id, case_type_id, current_version, priority:tm_case_priorities ( id, name, color ), case_type:tm_case_types ( id, name ) ), assignee:profiles!assigned_to ( id, full_name )`)
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

  // Version drift detection
  const isVersionDrifted = currentTestCase != null
    && currentTestCase.locked_version != null
    && currentTestCase.test_case?.current_version != null
    && currentTestCase.test_case.current_version !== currentTestCase.locked_version;

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
      const { error } = await typedQuery('tm_cycle_scope').update(updateData).eq('id', selectedTestCaseId);
      if (error) { catalystToast.error('Failed to update test result'); return; }

      // 2. INSERT execution history record (skip for reset)
      if (status !== 'not_run' && currentTestCase) {
        if (!selectedTestCaseId) return;
        if (!currentUserId) {
          console.error('[ExecHistory] INSERT aborted: currentUserId is null');
          return;
        }

        // execution_number is assigned by DB trigger (trg_assign_execution_number)
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
      setIsSkipModalOpen(true);
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

  const handleSkipConfirm = async (skipReason: string, _defectId: string | null, skipNotes: string) => {
    setIsSkipModalOpen(false);
    await updateExecutionStatus('skipped', skipReason, skipNotes);
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
    await typedQuery('tm_cycle_scope').update({
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
      if (s.isFailureModalOpen || s.isSkipModalOpen || s.showShortcuts) return;

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
      <ExecutionHeader
        cycle={cycle}
        isDark={isDark}
        fastTrackMode={fastTrackMode}
        setFastTrackMode={setFastTrackMode}
        sessionElapsed={sessionElapsed}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        setShowShortcuts={setShowShortcuts}
        onExit={handleExit}
      />

      {/* ── Three-Pane Body ───────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ResizablePanelGroup direction="horizontal">
          {/* ── Panel 1: Test List ──────────────────────────────────────── */}
          <ResizablePanel defaultSize={22} minSize={15} maxSize={35}>
            <ExecutionTestList
              cycle={cycle}
              filteredTestCases={filteredTestCases}
              selectedTestCaseId={selectedTestCaseId}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              showMyTestsOnly={showMyTestsOnly}
              setShowMyTestsOnly={setShowMyTestsOnly}
              onSelectTest={selectTest}
              statusConfig={statusConfig}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ── Panel 2: Step Runner ────────────────────────────────────── */}
          <ResizablePanel defaultSize={showSidebar ? 56 : 78} minSize={40}>
            {currentTestCase && testCase ? (
              viewMode && executionHistory ? (
                <ExecutionViewMode
                  testCase={testCase}
                  currentStatus={currentTestCase.current_status}
                  isVersionDrifted={isVersionDrifted}
                  lockedVersion={currentTestCase.locked_version}
                  currentVersion={currentTestCase.test_case?.current_version}
                  executionHistory={executionHistory}
                  isDark={isDark}
                  statusConfig={statusConfig}
                  onBack={() => { setViewMode(false); setExecutionHistory(null); }}
                  onRerun={handleRerun}
                />
              ) : (
                <ExecutionRunMode
                  testCase={testCase}
                  currentStatus={currentTestCase.current_status}
                  isVersionDrifted={isVersionDrifted}
                  lockedVersion={currentTestCase.locked_version}
                  currentVersion={currentTestCase.test_case?.current_version}
                  isDark={isDark}
                  statusConfig={statusConfig}
                  fastTrackMode={fastTrackMode}
                  previousRunData={previousRunData}
                  steps={steps}
                  currentStepIndex={currentStepIndex}
                  setCurrentStepIndex={setCurrentStepIndex}
                  currentStepStatuses={currentStepStatuses}
                  notes={notes}
                  setNotes={setNotes}
                  currentIndex={currentIndex}
                  filteredCount={filteredTestCases.length}
                  canGoPrev={canGoPrev}
                  canGoNext={canGoNext}
                  canGoPrevStep={canGoPrevStep}
                  canGoNextStep={canGoNextStep}
                  isSubmitting={isSubmitting}
                  onPass={handlePass}
                  onFail={handleFail}
                  onBlocked={handleBlocked}
                  onSkip={handleSkip}
                  onReset={handleReset}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  onPrevStep={handlePrevStep}
                  onNextStep={handleNextStep}
                  onCompleteExecution={handleCompleteExecution}
                  derivedStatus={derivedStatus}
                  anyStepMarked={anyStepMarked}
                />
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

      {/* Skip reason modal — reuses FailureReasonModal UI */}
      <FailureReasonModal
        isOpen={isSkipModalOpen}
        testCaseKey={currentTestCase?.test_case?.case_key || ''}
        testCaseTitle={currentTestCase?.test_case?.title || ''}
        testCaseId={currentTestCase?.test_case_id}
        cycleId={cycleId}
        cycleTestCaseId={selectedTestCaseId || undefined}
        onClose={() => setIsSkipModalOpen(false)}
        onConfirm={handleSkipConfirm}
      />

      <KeyboardShortcutsGuide isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
