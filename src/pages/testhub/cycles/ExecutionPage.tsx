import React, { useState, useEffect, useRef, useCallback, DragEvent, useSyncExternalStore } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTestCycleByKey } from '@/hooks/useTestCycleByKey';
import ModalDialog, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/standard-button';
import { useCycleScope } from '@/hooks/test-management/useTestCycles';
import { useTestCase } from '@/hooks/test-management/useTestCases';
import { useExecutionSteps } from '@/hooks/test-management/useTestSteps';
import { useTestHubProject } from '@/hooks/test-management/useTestHubProject';
import { useCreateDefect } from '@/hooks/test-management/useDefects';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import Textarea from '@atlaskit/textarea';
import { ArrowLeft, ChevronRight } from '@/lib/atlaskit-icons';
import { TMCycleScope, TMCaseStep, RunStatus } from '@/types/test-management';
import { catalystToast } from '@/lib/catalystToast';
import { UnsavedChangesModal } from '@/components/shared/UnsavedChangesModal';

const ATTACHMENT_BUCKET = 'testhub-attachments';
const OFFLINE_QUEUE_KEY = 'testhub_offline_queue';

// ── Online status hook ────────────────────────────────────────────────────────
function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb); };
}
function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

// ── Offline queue helpers ─────────────────────────────────────────────────────
interface OfflineQueueItem {
  id: string;
  queuedAt: string;
  scopeId: string;
  executedBy: string;
  runStatus: string;
  notes: string | null;
  durationSeconds: number;
  stepResults: Array<{ test_step_id: string; step_number: number; status: string; actual_result: string | null }>;
  scopeStatus: string;
}

function readQueue(): OfflineQueueItem[] {
  try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) ?? '[]'); }
  catch { return []; }
}

function writeQueue(items: OfflineQueueItem[]) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
}

async function flushOfflineQueue(qc: { invalidateQueries: (opts: { queryKey: string[] }) => void }): Promise<void> {
  const items = readQueue();
  if (items.length === 0) return;

  const now = new Date().toISOString();
  const failed: OfflineQueueItem[] = [];

  for (const item of items) {
    try {
      // Compute next run number fresh from DB
      const { data: maxRow } = await supabase
        .from('tm_test_runs')
        .select('run_number')
        .eq('cycle_scope_id', item.scopeId)
        .order('run_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextRunNumber = (maxRow?.run_number ?? 0) + 1;
      const isTerminal = item.runStatus !== 'not_run' && item.runStatus !== 'in_progress';

      const { data: run, error: runErr } = await supabase
        .from('tm_test_runs')
        .insert({
          cycle_scope_id: item.scopeId,
          run_number: nextRunNumber,
          status: item.runStatus,
          executed_by: item.executedBy,
          notes: item.notes,
          duration_seconds: item.durationSeconds,
          started_at: item.queuedAt,
          completed_at: isTerminal ? now : null,
        })
        .select()
        .single();

      if (runErr) throw runErr;

      if (run && item.stepResults.length > 0) {
        await supabase.from('tm_step_results').insert(
          item.stepResults.map(sr => ({ ...sr, test_run_id: run.id, executed_at: item.queuedAt }))
        );
      }

      await supabase.from('tm_cycle_scope').update({ current_status: item.scopeStatus }).eq('id', item.scopeId);
      qc.invalidateQueries({ queryKey: ['tm-cycle-scope'] });
    } catch {
      failed.push(item);
    }
  }

  writeQueue(failed);
  if (failed.length < items.length) {
    const flushed = items.length - failed.length;
    catalystToast.success(`Synced ${flushed} offline result${flushed > 1 ? 's' : ''}`);
  }
}

type StepStatus = 'NOT_RUN' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'HOLD' | 'SKIPPED';

interface StepState {
  stepId: string;
  status: StepStatus;
  actualResult: string;
}

function computeRunStatus(stepStates: StepState[]): RunStatus {
  if (stepStates.length === 0) return 'NOT_RUN';
  const statuses = stepStates.map(s => s.status);
  if (statuses.some(s => s === 'FAILED')) return 'FAILED';
  if (statuses.some(s => s === 'BLOCKED')) return 'BLOCKED';
  if (statuses.some(s => s === 'HOLD')) return 'HOLD';
  if (statuses.every(s => s === 'PASSED' || s === 'SKIPPED')) return 'PASSED';
  if (statuses.every(s => s === 'NOT_RUN')) return 'NOT_RUN';
  return 'IN_PROGRESS';
}

export default function ExecutionPage() {
  const { cycleKey, id: legacyId, projectKey = 'BAU' } = useParams<{ cycleKey?: string; id?: string; projectKey?: string }>();
  const cycleParam = cycleKey ?? legacyId;
  const { data: cycleRecord, isError: isCycleError, error: cycleError, refetch: refetchCycle } = useTestCycleByKey(cycleParam, projectKey);
  const cycleId = cycleRecord?.id ?? (cycleParam && /^[0-9a-f-]{36}$/.test(cycleParam) ? cycleParam : undefined);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { projectId } = useTestHubProject();

  const { data: scopeItems = [], isLoading, isError: isScopeError, error: scopeError, refetch: refetchScope } = useCycleScope(cycleId);

  const initialCaseId = searchParams.get('caseId');
  const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null);
  // URL ?caseId is applied at most once so refetches never yank the tester off their current case
  const initialCaseApplied = useRef(false);

  // Auto-select first scope item or (once) the one from URL
  useEffect(() => {
    if (scopeItems.length === 0) return;
    if (initialCaseId && !initialCaseApplied.current) {
      initialCaseApplied.current = true;
      const match = scopeItems.find(s => s.case_id === initialCaseId);
      if (match) {
        setSelectedScopeId(match.id);
        return;
      }
    }
    if (!selectedScopeId) {
      setSelectedScopeId(scopeItems[0].id);
    }
  }, [scopeItems, initialCaseId, selectedScopeId]);

  const selectedScope = scopeItems.find(s => s.id === selectedScopeId) ?? null;

  // P1-S15 (EXE-003): nav guard on dirty runner state — StepRunner reports
  // dirty status up; this page gates the two exit points (Back button,
  // case-list click) plus tab close/refresh.
  const [runnerDirty, setRunnerDirty] = useState(false);
  const [pendingDiscard, setPendingDiscard] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!runnerDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [runnerDirty]);

  const guardedNavigate = useCallback((action: () => void) => {
    if (runnerDirty) {
      setPendingDiscard(() => action);
      return;
    }
    action();
  }, [runnerDirty]);

  if (isCycleError || isScopeError) {
    const err = (isCycleError ? cycleError : scopeError) as Error | null;
    return (
      <div style={{ padding: 32, maxWidth: 640 }}>
        <SectionMessage
          appearance="error"
          title="Couldn't load the execution runner"
          actions={[{ text: 'Retry', onClick: () => (isCycleError ? refetchCycle() : refetchScope()) }]}
        >
          {err?.message ?? 'The cycle or its scope failed to load.'}
        </SectionMessage>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'var(--ds-font-family-body)' }}>
      {/* Left: case list */}
      <div style={{
        width: 280,
        minWidth: 280,
        borderRight: '1px solid var(--ds-border)',
        background: 'var(--ds-surface-sunken)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--ds-border)' }}>
          <button
            onClick={() => guardedNavigate(() => navigate(`/testhub/${projectKey}/cycles/${cycleId}`))}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ds-link)',
              fontSize: 'var(--ds-font-size-300)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 0,
              marginBottom: 8,
            }}
          >
            <ArrowLeft size={13} />
            Back to cycle
          </button>
          <h3 style={{ margin: 0, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--ds-text)' }}>
            {scopeItems.length} {scopeItems.length === 1 ? 'case' : 'cases'}
          </h3>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {scopeItems.map(item => (
            <div
              key={item.id}
              onClick={() => guardedNavigate(() => setSelectedScopeId(item.id))}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                background: selectedScopeId === item.id ? 'var(--ds-background-selected)' : 'transparent',
                borderBottom: '1px solid var(--ds-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <RunStatusDot status={item.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', fontFamily: 'var(--ds-font-family-code)' }}>
                  {item.test_case?.key ?? '—'}
                </div>
                <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.test_case?.title ?? '—'}
                </div>
              </div>
              {selectedScopeId === item.id && (
                <ChevronRight size={14} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: step runner */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--ds-surface)' }}>
        {selectedScope ? (
          <StepRunner
            scope={selectedScope}
            cycleId={cycleId!}
            onSaved={() => {
              setRunnerDirty(false);
              queryClient.invalidateQueries({ queryKey: ['tm-cycle-scope', cycleId] });
            }}
            onDirtyChange={setRunnerDirty}
          />
        ) : (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-400)' }}>
            Select a case from the list
          </div>
        )}
      </div>
      <UnsavedChangesModal
        isOpen={!!pendingDiscard}
        onCancel={() => setPendingDiscard(null)}
        onDiscard={() => { pendingDiscard?.(); setPendingDiscard(null); }}
        message="You have an unsaved execution result. Leaving now will discard it."
      />
    </div>
  );
}

// ─── Timer hook ────────────────────────────────────────────────────────────
function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  const start = useCallback(() => {
    if (running) return;
    startedAtRef.current = Date.now() - elapsed * 1000;
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    setRunning(true);
  }, [running, elapsed]);

  const pause = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setElapsed(0);
    setRunning(false);
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return { elapsed, running, start, pause, reset, fmt };
}

// ─── Save modal ────────────────────────────────────────────────────────────
function SaveRunModal({
  onConfirm,
  onCancel,
  saving,
}: {
  onConfirm: (notes: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [onCancel]);

  return (
    <ModalDialog onClose={onCancel}>
      <ModalHeader>
        <ModalTitle>Save execution</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p style={{ margin: '0 0 16px', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
          Optionally add notes before saving this run result.
        </p>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', display: 'block', marginBottom: 4 }}>
            Notes (optional)
          </label>
          <Textarea
            value={notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            placeholder="Environment details, blockers, observations…"
            minimumRows={3}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onCancel}>Cancel</Button>
        <Button
          appearance="primary"
          onClick={() => onConfirm(notes)}
          isDisabled={saving}
          iconAfter={saving ? <Spinner size="small" appearance="invert" /> : undefined}
        >
          {saving ? 'Saving…' : 'Save run'}
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}

// ─── Step runner ────────────────────────────────────────────────────────────
function StepRunner({
  scope,
  cycleId,
  onSaved,
  onDirtyChange,
}: {
  scope: TMCycleScope;
  cycleId: string;
  onSaved: () => void;
  // P1-S15 (EXE-003): parent gates nav (Back button, case-list clicks,
  // beforeunload) on this — StepRunner owns the actual dirty state.
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { data: caseDetail, isLoading } = useTestCase(scope.case_id);
  // P1-S2: steps come from the version pinned at scope-add time, not live
  // tm_test_steps — editing a case mid-cycle must never rewrite what a run
  // tested. Title/preconditions above still read live (unaffected by VER-001).
  const { data: steps = [] } = useExecutionSteps(scope.case_id, scope.locked_version);
  const [stepStates, setStepStates] = useState<StepState[]>([]);
  // P1-S15 (EXE-004): a 0-step case has no per-step buttons to record a
  // verdict through — this is the case-level equivalent.
  const [caseVerdict, setCaseVerdict] = useState<StepStatus | null>(null);
  // F2 (CAT-TESTHUB-V2): force pass — explicit override, reason mandatory,
  // reason lands at the head of the run notes so the audit trail carries it.
  const [forcePassOpen, setForcePassOpen] = useState(false);
  const [forcePassReason, setForcePassReason] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [completedRunCount, setCompletedRunCount] = useState(0);
  // Defect-from-failure at the point of execution: armed by a failed/blocked
  // save, cleared on case switch. Carries the failed step-result for lineage.
  const [defectRun, setDefectRun] = useState<{
    runId: string; status: string; stepResultId: string | null; failedStepLabel: string | null;
  } | null>(null);
  const [logDefectOpen, setLogDefectOpen] = useState(false);
  const timer = useTimer();
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const [offlineQueueCount, setOfflineQueueCount] = useState(() => readQueue().length);

  const isDirty = steps.length === 0
    ? caseVerdict !== null
    : stepStates.some(s => s.status !== 'NOT_RUN' || s.actualResult.trim() !== '') || pendingFiles.length > 0;

  useEffect(() => { onDirtyChange(isDirty); }, [isDirty, onDirtyChange]);
  // Runner unmounts on scope switch (parent gates that click already) — clear
  // the flag so a stale "dirty" doesn't linger against the next case.
  useEffect(() => () => onDirtyChange(false), []);
  // A defect prompt from one case must not survive into the next.
  useEffect(() => { setDefectRun(null); setLogDefectOpen(false); }, [scope.id]);

  // Defects belong to the cycle's project (not the viewer's hub scope).
  const { data: cycleProjectId } = useQuery({
    queryKey: ['cycle-project', cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_test_cycles')
        .select('project_id')
        .eq('id', cycleId)
        .single();
      if (error) throw error;
      return data.project_id as string;
    },
  });

  // Flush offline queue when coming back online
  useEffect(() => {
    if (!isOnline) return;
    const q = readQueue();
    if (q.length === 0) return;
    flushOfflineQueue(queryClient).then(() => setOfflineQueueCount(readQueue().length));
  }, [isOnline]);

  // Load existing run count for this scope (to display run number)
  useEffect(() => {
    if (!scope.id) return;
    supabase
      .from('tm_test_runs')
      .select('id', { count: 'exact', head: true })
      .eq('cycle_scope_id', scope.id)
      .then(({ count }) => setCompletedRunCount(count ?? 0));
  }, [scope.id]);

  // Init step states when case loads
  useEffect(() => {
    if (steps.length > 0 && stepStates.length === 0) {
      setStepStates(steps.map(s => ({ stepId: s.id, status: 'NOT_RUN', actualResult: '' })));
    }
  }, [steps]);

  // Reset step states when scope changes
  useEffect(() => {
    setStepStates([]);
    setCaseVerdict(null);
    setPendingFiles([]);
    timer.reset();
  }, [scope.id]);

  const updateStepStatus = (idx: number, status: StepStatus) => {
    setStepStates(prev => prev.map((s, i) => i === idx ? { ...s, status } : s));
    if (!timer.running) timer.start();
  };

  const updateActualResult = (idx: number, value: string) => {
    setStepStates(prev => prev.map((s, i) => i === idx ? { ...s, actualResult: value } : s));
  };

  const updateCaseVerdict = (status: StepStatus) => {
    setCaseVerdict(status);
    if (!timer.running) timer.start();
  };

  // P3-F8: keyboard-first runner (TestRail-parity hotkeys) — active step focus
  // for keyed verdicts; reset whenever the case list swaps this component.
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  useEffect(() => { setActiveStepIndex(0); }, [scope.id]);

  const saveDisabled = steps.length === 0 && caseVerdict === null;

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      return target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (showSaveModal) return;
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const applyVerdict = (status: StepStatus) => {
        if (steps.length === 0) {
          updateCaseVerdict(status);
        } else {
          updateStepStatus(activeStepIndex, status);
          setActiveStepIndex(i => Math.min(i + 1, steps.length - 1));
        }
      };

      switch (e.key) {
        case '1': e.preventDefault(); applyVerdict('PASSED'); break;
        case '2': e.preventDefault(); applyVerdict('FAILED'); break;
        case '3': e.preventDefault(); applyVerdict('BLOCKED'); break;
        case '4': e.preventDefault(); applyVerdict('SKIPPED'); break;
        case '5': e.preventDefault(); applyVerdict('HOLD'); break;
        case 'ArrowDown':
          if (steps.length > 0) { e.preventDefault(); setActiveStepIndex(i => Math.min(i + 1, steps.length - 1)); }
          break;
        case 'ArrowUp':
          if (steps.length > 0) { e.preventDefault(); setActiveStepIndex(i => Math.max(i - 1, 0)); }
          break;
        case 'Enter':
          if (!saveDisabled) { e.preventDefault(); setShowSaveModal(true); }
          break;
        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStepIndex, steps.length, showSaveModal, saveDisabled]);

  const handleReset = () => {
    setStepStates(steps.map(s => ({ stepId: s.id, status: 'NOT_RUN', actualResult: '' })));
    setCaseVerdict(null);
    setPendingFiles([]);
    setForcePassReason('');
    timer.reset();
  };

  const handleSave = async (rawNotes: string) => {
    setSaving(true);
    timer.pause();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // F2: force pass overrides the aggregate — the reason is mandatory and
      // recorded at the head of the run notes.
      const notes = forcePassReason
        ? `[FORCE PASS] ${forcePassReason}${rawNotes ? `\n${rawNotes}` : ''}`
        : rawNotes;

      // EXE-004: a 0-step case has no per-step aggregate to compute from —
      // the case-level verdict button IS the verdict.
      const runStatus: RunStatus = forcePassReason
        ? 'PASSED'
        : steps.length === 0
          ? ((caseVerdict ?? 'NOT_RUN') as RunStatus)
          : computeRunStatus(stepStates);
      const dbStatus = runStatus.toLowerCase() as 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'hold' | 'skipped';

      // ── Offline path ──────────────────────────────────────────────────────────
      if (!isOnline) {
        const item: OfflineQueueItem = {
          id: `${scope.id}-${Date.now()}`,
          queuedAt: new Date().toISOString(),
          scopeId: scope.id,
          executedBy: user.id,
          runStatus: dbStatus,
          notes: notes || null,
          durationSeconds: timer.elapsed,
          stepResults: stepStates.map((ss, i) => ({
            test_step_id: ss.stepId,
            step_number: i + 1,
            status: ss.status.toLowerCase(),
            actual_result: ss.actualResult || null,
          })),
          scopeStatus: dbStatus,
        };
        const q = readQueue();
        q.push(item);
        writeQueue(q);
        setOfflineQueueCount(q.length);
        setShowSaveModal(false);
        // EXE-002 minimum: attachments can't be queued offline (File objects
        // aren't serializable into localStorage) — warn instead of silently
        // dropping them, so the tester knows to re-attach after reconnecting.
        if (pendingFiles.length > 0) {
          catalystToast.error(
            `Offline — result queued, but ${pendingFiles.length} attachment${pendingFiles.length > 1 ? 's' : ''} could not be saved. Re-attach after reconnecting.`
          );
        } else {
          catalystToast.success('Offline — result queued. Will sync on reconnect.');
        }
        setPendingFiles([]);
        setForcePassReason('');
        timer.reset();
        onSaved();
        return;
      }
      // ─────────────────────────────────────────────────────────────────────────
      const isTerminal = runStatus !== 'NOT_RUN' && runStatus !== 'IN_PROGRESS';

      // Compute next run number
      const { data: maxRow, error: maxErr } = await supabase
        .from('tm_test_runs')
        .select('run_number')
        .eq('cycle_scope_id', scope.id)
        .order('run_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxErr) throw maxErr;
      const nextRunNumber = (maxRow?.run_number ?? 0) + 1;

      // Insert run record
      const { data: run, error: runError } = await supabase
        .from('tm_test_runs')
        .insert({
          cycle_scope_id: scope.id,
          run_number: nextRunNumber,
          status: dbStatus,
          executed_by: user.id,
          notes: notes || null,
          duration_seconds: timer.elapsed,
          started_at: new Date().toISOString(),
          completed_at: isTerminal ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (runError) throw runError;

      // Insert step results
      let failedStepResult: { id: string; step_number: number } | null = null;
      if (run && stepStates.length > 0) {
        const stepResults = stepStates.map((ss, i) => ({
          test_run_id: run.id,
          test_step_id: ss.stepId,
          step_number: i + 1,
          status: ss.status.toLowerCase(),
          actual_result: ss.actualResult || null,
          executed_at: new Date().toISOString(),
        }));
        const { data: insertedResults, error: stepErr } = await supabase
          .from('tm_step_results')
          .insert(stepResults)
          .select('id, step_number, status');
        if (stepErr) throw stepErr;
        failedStepResult = (insertedResults ?? [])
          .filter(r => r.status === 'failed' || r.status === 'blocked')
          .sort((a, b) => a.step_number - b.step_number)[0] ?? null;
      }

      // Upload attachments
      if (run && pendingFiles.length > 0) {
        const uploadResults = await Promise.allSettled(
          pendingFiles.map(async (file) => {
            const ext = file.name.split('.').pop() ?? 'bin';
            const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const storagePath = `test-runs/${run.id}/${safeName}`;
            const { error: upErr } = await supabase.storage
              .from(ATTACHMENT_BUCKET)
              .upload(storagePath, file, { contentType: file.type, upsert: false });
            if (upErr) throw upErr;
            await supabase.from('tm_attachments').insert({
              entity_type: 'test_run',
              entity_id: run.id,
              file_name: file.name,
              file_path: storagePath,
              file_size: file.size,
              mime_type: file.type || null,
              uploaded_by: user.id,
            });
          })
        );
        const failed = uploadResults.filter(r => r.status === 'rejected').length;
        if (failed > 0) catalystToast.error(`${failed} attachment(s) failed to upload`);
      }

      // Update scope status
      const { error: scopeUpdateErr } = await supabase
        .from('tm_cycle_scope')
        .update({ current_status: dbStatus })
        .eq('id', scope.id);
      if (scopeUpdateErr) throw scopeUpdateErr;

      setShowSaveModal(false);
      setPendingFiles([]);
      setCompletedRunCount(nextRunNumber);
      catalystToast.success(`Run #${nextRunNumber} saved: ${runStatus}`);
      setForcePassReason('');
      if (run && (dbStatus === 'failed' || dbStatus === 'blocked')) {
        setDefectRun({
          runId: run.id,
          status: dbStatus,
          stepResultId: failedStepResult?.id ?? null,
          failedStepLabel: failedStepResult ? `step ${failedStepResult.step_number}` : null,
        });
      }
      timer.reset();
      onSaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      catalystToast.error('Failed to save', message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (!caseDetail) {
    return <div style={{ padding: 32, color: 'var(--ds-text-danger)' }}>Case not found</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Offline banner */}
      {(!isOnline || offlineQueueCount > 0) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', marginBottom: 12, borderRadius: 6,
          background: isOnline
            ? 'var(--ds-background-warning)'
            : 'var(--ds-background-danger)',
          border: `1px solid ${isOnline ? 'var(--ds-border)' : 'var(--ds-border-danger)'}`,
          fontSize: 'var(--ds-font-size-300)', color: isOnline ? 'var(--ds-text-warning)' : 'var(--ds-text-danger)',
          fontWeight: 500,
        }}>
          {isOnline
            ? `Back online — syncing ${offlineQueueCount} queued result${offlineQueueCount !== 1 ? 's' : ''}…`
            : `You're offline — results will be queued and synced when connection is restored${offlineQueueCount > 0 ? ` (${offlineQueueCount} queued)` : ''}`
          }
        </div>
      )}
      {/* Timer bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
        padding: '8px 16px', borderRadius: 8,
        background: timer.running
          ? 'var(--ds-background-information-subtle)'
          : 'var(--ds-surface-sunken)',
        border: '1px solid var(--ds-border)',
      }}>
        <span style={{
          fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 'var(--ds-font-size-600)', fontWeight: 600,
          color: timer.running ? 'var(--ds-text-information)' : 'var(--ds-text-subtle)',
          minWidth: 72,
        }}>
          {timer.fmt(timer.elapsed)}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {!timer.running ? (
            <button onClick={timer.start} style={timerBtnStyle('var(--ds-text-success)')}>▶ Start</button>
          ) : (
            <button onClick={timer.pause} style={timerBtnStyle('var(--ds-text-warning)')}>⏸ Pause</button>
          )}
          <button onClick={timer.reset} disabled={timer.elapsed === 0 && !timer.running} style={timerBtnStyle('var(--ds-text-subtle)')}>
            ↺ Reset
          </button>
        </div>
        <div style={{ flex: 1 }} />
        {/* F2 (CAT-TESTHUB-V2): force pass — deliberate override with mandatory reason */}
        <button
          onClick={() => setForcePassOpen(true)}
          style={{
            padding: '4px 12px', borderRadius: 4, border: '1px solid var(--ds-border)',
            background: forcePassReason ? 'var(--ds-background-success-subtle)' : 'none',
            cursor: 'pointer', fontSize: 'var(--ds-font-size-200)',
            color: 'var(--ds-text-success)', fontFamily: 'var(--ds-font-family-body)', fontWeight: 600,
          }}
          title={forcePassReason ? `Force pass armed: ${forcePassReason}` : 'Pass this case regardless of step results (reason required)'}
        >
          {forcePassReason ? '✓ Force pass armed' : 'Force pass…'}
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '4px 12px', borderRadius: 4, border: '1px solid var(--ds-border)',
            background: 'none', cursor: 'pointer', fontSize: 'var(--ds-font-size-200)',
            color: 'var(--ds-text-subtle)', fontFamily: 'var(--ds-font-family-body)',
          }}
        >
          Reset run
        </button>
      </div>

      {forcePassOpen && (
        <ForcePassModal
          initialReason={forcePassReason}
          onCancel={() => setForcePassOpen(false)}
          onConfirm={(reason) => {
            setForcePassReason(reason);
            setForcePassOpen(false);
            if (!timer.running) timer.start();
          }}
          onClear={() => {
            setForcePassReason('');
            setForcePassOpen(false);
          }}
        />
      )}

      {/* Defect-from-failure: a failed/blocked save arms this strip so the
          tester can file a fully-linked defect without leaving the runner. */}
      {defectRun && (
        <div style={{ marginBottom: 16 }}>
          <SectionMessage appearance="error" title={`Run ${defectRun.status} — log a defect?`}>
            <p style={{ margin: '0 0 8px' }}>
              The defect will be linked to this run{defectRun.failedStepLabel ? `, ${defectRun.failedStepLabel},` : ''} and the test case automatically.
            </p>
            <Button appearance="danger" onClick={() => setLogDefectOpen(true)}>Log defect</Button>
            {' '}
            <Button appearance="subtle" onClick={() => setDefectRun(null)}>Dismiss</Button>
          </SectionMessage>
        </div>
      )}

      {logDefectOpen && defectRun && cycleProjectId && (
        <LogDefectFromRunModal
          projectId={cycleProjectId}
          cycleId={cycleId}
          caseId={scope.case_id}
          caseTitle={caseDetail.title}
          run={defectRun}
          onClose={() => setLogDefectOpen(false)}
          onFiled={() => { setLogDefectOpen(false); setDefectRun(null); }}
        />
      )}

      {/* Case header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', fontFamily: 'var(--ds-font-family-code)', marginBottom: 4 }}>
          {caseDetail.key}
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 'var(--ds-font-size-700)', fontWeight: 600, color: 'var(--ds-text)' }}>
          {caseDetail.title}
        </h2>
        {caseDetail.preconditions && (
          <div style={{
            background: 'var(--ds-background-neutral-subtle)',
            border: '1px solid var(--ds-border)',
            borderRadius: 6,
            padding: 12,
            fontSize: 'var(--ds-font-size-300)',
            color: 'var(--ds-text-subtle)',
          }}>
            <strong style={{ display: 'block', marginBottom: 4, color: 'var(--ds-text)' }}>Preconditions</strong>
            {caseDetail.preconditions}
          </div>
        )}
      </div>

      {/* P3-F8: keyboard hotkey legend */}
      <div style={{
        fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)',
        marginBottom: 12, display: 'flex', gap: 12, flexWrap: 'wrap',
      }}>
        <span><strong>1</strong> Pass</span>
        <span><strong>2</strong> Fail</span>
        <span><strong>3</strong> Block</span>
        <span><strong>4</strong> Skip</span>
        <span><strong>5</strong> Hold</span>
        {steps.length > 0 && <span><strong>↑↓</strong> Navigate step</span>}
        <span><strong>Enter</strong> Save</span>
      </div>

      {/* Steps */}
      {steps.length === 0 ? (
        <div style={{
          border: '1px solid var(--ds-border)', borderRadius: 8, padding: 16, marginBottom: 24,
          background: 'var(--ds-surface)',
        }}>
          <div style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-300)', marginBottom: 12 }}>
            No steps defined for this test case — record a case-level verdict instead.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <StepBtn label="Pass" icon="✓" active={caseVerdict === 'PASSED'} color="var(--ds-text-success)" onClick={() => updateCaseVerdict('PASSED')} />
            <StepBtn label="Fail" icon="✗" active={caseVerdict === 'FAILED'} color="var(--ds-text-danger)" onClick={() => updateCaseVerdict('FAILED')} />
            <StepBtn label="Block" icon="⊘" active={caseVerdict === 'BLOCKED'} color="var(--ds-text-warning)" onClick={() => updateCaseVerdict('BLOCKED')} />
            <StepBtn label="Skip" icon="→" active={caseVerdict === 'SKIPPED'} color="var(--ds-text-subtlest)" onClick={() => updateCaseVerdict('SKIPPED')} />
            <StepBtn label="Hold" icon="⏸" active={caseVerdict === 'HOLD'} color="var(--ds-text-information)" onClick={() => updateCaseVerdict('HOLD')} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {steps.map((step, i) => {
            const state = stepStates[i];
            const stepBg = state?.status === 'PASSED'
              ? 'var(--ds-background-success-subtle)'
              : state?.status === 'FAILED'
                ? 'var(--ds-background-danger-subtle)'
                : state?.status === 'BLOCKED'
                  ? 'var(--ds-background-warning-subtle)'
                  : state?.status === 'HOLD'
                    ? 'var(--ds-background-information-subtle)'
                    : 'var(--ds-surface-sunken)';

            return (
              <div
                key={step.id}
                onClick={() => setActiveStepIndex(i)}
                style={{
                  border: `1px solid ${i === activeStepIndex ? 'var(--ds-border-focused)' : 'var(--ds-border)'}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: 'var(--ds-surface)',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  padding: '12px 16px',
                  background: stepBg,
                  borderBottom: '1px solid var(--ds-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>
                    Step {i + 1}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <StepBtn
                      label="Pass"
                      icon="✓"
                      active={state?.status === 'PASSED'}
                      color="var(--ds-text-success)"
                      onClick={() => updateStepStatus(i, 'PASSED')}
                    />
                    <StepBtn
                      label="Fail"
                      icon="✗"
                      active={state?.status === 'FAILED'}
                      color="var(--ds-text-danger)"
                      onClick={() => updateStepStatus(i, 'FAILED')}
                    />
                    <StepBtn
                      label="Block"
                      icon="⊘"
                      active={state?.status === 'BLOCKED'}
                      color="var(--ds-text-warning)"
                      onClick={() => updateStepStatus(i, 'BLOCKED')}
                    />
                    <StepBtn
                      label="Skip"
                      icon="→"
                      active={state?.status === 'SKIPPED'}
                      color="var(--ds-text-subtlest)"
                      onClick={() => updateStepStatus(i, 'SKIPPED')}
                    />
                    <StepBtn
                      label="Hold"
                      icon="⏸"
                      active={state?.status === 'HOLD'}
                      color="var(--ds-text-information)"
                      onClick={() => updateStepStatus(i, 'HOLD')}
                    />
                  </div>
                </div>
                <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', marginBottom: 4 }}>ACTION</div>
                    <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>{step.action}</div>
                    {step.test_data && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', marginBottom: 4 }}>TEST DATA</div>
                        <code style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', fontFamily: 'var(--ds-font-family-code)' }}>
                          {step.test_data}
                        </code>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', marginBottom: 4 }}>EXPECTED RESULT</div>
                    <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', marginBottom: 8 }}>
                      {step.expected_result}
                    </div>
                    <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', marginBottom: 4 }}>ACTUAL RESULT</div>
                    <Textarea
                      value={state?.actualResult ?? ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateActualResult(i, e.target.value)}
                      placeholder="Enter actual result..."
                      resize="smart"
                      minimumRows={2}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attachments */}
      <AttachmentZone
        files={pendingFiles}
        onAdd={added => setPendingFiles(prev => [...prev, ...added])}
        onRemove={i => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}
      />

      {/* Action row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
        {completedRunCount > 0 && (
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>
            {completedRunCount} prior {completedRunCount === 1 ? 'run' : 'runs'} · saving as Run #{completedRunCount + 1}
          </span>
        )}
        <button
          onClick={() => setShowSaveModal(true)}
          disabled={steps.length === 0 && caseVerdict === null}
          title={steps.length === 0 && caseVerdict === null ? 'Pick a verdict above first' : undefined}
          style={{
            padding: '8px 24px',
            background: 'var(--ds-background-brand-bold)',
            color: 'var(--ds-text-inverse)',
            border: 'none', borderRadius: 4, fontSize: 'var(--ds-font-size-400)', fontWeight: 500,
            cursor: (steps.length === 0 && caseVerdict === null) ? 'not-allowed' : 'pointer',
            opacity: (steps.length === 0 && caseVerdict === null) ? 0.5 : 1,
          }}
        >
          {completedRunCount === 0 ? 'Save execution' : 'Add run'}
        </button>
      </div>

      {showSaveModal && (
        <SaveRunModal
          saving={saving}
          onCancel={() => setShowSaveModal(false)}
          onConfirm={handleSave}
        />
      )}
    </div>
  );
}

// ─── Attachment zone ────────────────────────────────────────────────────────
function AttachmentZone({
  files,
  onAdd,
  onRemove,
}: {
  files: File[];
  onAdd: (added: File[]) => void;
  onRemove: (index: number) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) onAdd(dropped);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const fmtSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${Math.round(bytes / 1024)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', marginBottom: 8 }}>
        ATTACHMENTS (optional)
      </div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--ds-border-focused)' : 'var(--ds-border)'}`,
          borderRadius: 8,
          padding: '16px 16px',
          background: dragOver ? 'var(--ds-background-information-subtle)' : 'var(--ds-surface-sunken)',
          cursor: 'pointer',
          textAlign: 'center',
          fontSize: 'var(--ds-font-size-300)',
          color: 'var(--ds-text-subtle)',
          transition: 'all 0.15s',
          marginBottom: files.length ? 8 : 0,
        }}
      >
        Drop files here or <span style={{ color: 'var(--ds-link)', fontWeight: 500 }}>browse</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={e => {
            const picked = Array.from(e.target.files ?? []);
            if (picked.length) onAdd(picked);
            e.target.value = '';
          }}
        />
      </div>
      {files.map((f, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 8px', borderRadius: 4, marginTop: 4,
          background: 'var(--ds-surface-sunken)',
          border: '1px solid var(--ds-border)',
          fontSize: 'var(--ds-font-size-300)',
        }}>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ds-text)' }}>
            {f.name}
          </span>
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', flexShrink: 0 }}>
            {fmtSize(f.size)}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onRemove(i); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-400)', lineHeight: 1, padding: 4,
              flexShrink: 0,
            }}
            title="Remove"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

const timerBtnStyle = (color: string): React.CSSProperties => ({
  padding: '4px 8px', borderRadius: 4, border: `1px solid ${color}`,
  background: 'none', cursor: 'pointer', fontSize: 'var(--ds-font-size-200)', color,
  fontFamily: 'var(--ds-font-family-body)',
});

function RunStatusDot({ status }: { status: RunStatus }) {
  const colors: Record<RunStatus, string> = {
    PASSED:      'var(--ds-icon-success)',
    FAILED:      'var(--ds-icon-danger)',
    BLOCKED:     'var(--ds-icon-warning)',
    IN_PROGRESS: 'var(--ds-icon-information)',
    NOT_RUN:     'var(--ds-icon-subtlest)',
    SKIPPED:     'var(--ds-icon-subtle)',
  };
  return (
    <span style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: colors[status] ?? 'var(--ds-icon-subtlest)',
      flexShrink: 0,
    }} />
  );
}

function StepBtn({
  label,
  icon,
  active,
  color,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  // Active background uses DS subtle variant tokens rather than string-replacement heuristics
  const activeBgMap: Record<string, string> = {
    'var(--ds-text-success)':   'var(--ds-background-success-subtle)',
    'var(--ds-text-danger)':    'var(--ds-background-danger-subtle)',
    'var(--ds-text-warning)':   'var(--ds-background-warning-subtle)',
    'var(--ds-text-subtlest)':  'var(--ds-background-neutral-subtle)',
  };
  const activeBg = activeBgMap[color] ?? 'var(--ds-background-neutral-subtle)';

  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 8px',
        background: active ? activeBg : 'none',
        border: `1px solid ${active ? color : 'var(--ds-border)'}`,
        borderRadius: 4,
        cursor: 'pointer',
        fontSize: 'var(--ds-font-size-200)',
        color: active ? color : 'var(--ds-text-subtle)',
        fontWeight: active ? 600 : 400,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'var(--ds-font-family-body)',
      }}
    >
      {icon} {label}
    </button>
  );
}

// ── Force-pass reason modal (F2, CAT-TESTHUB-V2) ─────────────────────────────
// A force pass is a deliberate override: the reason is mandatory and lands at
// the head of the saved run's notes.
function ForcePassModal({
  initialReason,
  onConfirm,
  onCancel,
  onClear,
}: {
  initialReason: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  onClear: () => void;
}) {
  const [reason, setReason] = useState(initialReason);
  return (
    <ModalDialog onClose={onCancel} width="small">
      <ModalHeader>
        <ModalTitle appearance="warning">Force pass this case?</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p style={{ margin: '0 0 8px', color: 'var(--ds-text)', fontSize: 'var(--ds-font-size-300)' }}>
          The run will save as Passed regardless of step results. A reason is required and is recorded in the run notes.
        </p>
        <Textarea
          value={reason}
          onChange={(e) => setReason((e.target as HTMLTextAreaElement).value)}
          placeholder="Why is this pass being forced? (e.g. verified manually in staging, known cosmetic diff)"
          minimumRows={3}
        />
      </ModalBody>
      <ModalFooter>
        {initialReason && (
          <Button appearance="subtle" onClick={onClear}>Disarm force pass</Button>
        )}
        <Button appearance="subtle" onClick={onCancel}>Cancel</Button>
        <Button appearance="warning" isDisabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>
          Arm force pass
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}

// ─── Defect-from-failure modal ──────────────────────────────────────────────
// Canonical creation path (useCreateDefect): RPC-generated key, real project,
// auto tm_defect_links to case + run (+ step result) with cycle-scope lineage.
function LogDefectFromRunModal({
  projectId,
  cycleId,
  caseId,
  caseTitle,
  run,
  onClose,
  onFiled,
}: {
  projectId: string;
  cycleId: string;
  caseId: string;
  caseTitle: string;
  run: { runId: string; status: string; stepResultId: string | null; failedStepLabel: string | null };
  onClose: () => void;
  onFiled: () => void;
}) {
  const [title, setTitle] = useState(
    `${caseTitle} — ${run.status}${run.failedStepLabel ? ` at ${run.failedStepLabel}` : ''}`
  );
  const [severity, setSeverity] = useState<'critical' | 'major' | 'minor' | 'trivial'>('major');
  const [description, setDescription] = useState('');
  const createDefect = useCreateDefect();
  const saving = createDefect.isPending;

  const handleFile = async () => {
    if (!title.trim()) return;
    try {
      const created = await createDefect.mutateAsync({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        severity,
        source_test_run_id: run.runId,
        source_test_case_id: caseId,
        run_id: run.runId,
        cycle_id: cycleId,
        step_id: run.stepResultId ?? undefined,
      } as any);
      catalystToast.success(`Defect ${(created as any)?.defect_key ?? ''} filed and linked to this run`.trim());
      onFiled();
    } catch {
      // useCreateDefect surfaces its own error toast
    }
  };

  return (
    <ModalDialog onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle appearance="danger">Log defect from failed run</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>Title</label>
          <Textfield
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            placeholder="Describe the defect…"
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>Severity</label>
          <Select
            value={{ label: severity.charAt(0).toUpperCase() + severity.slice(1), value: severity }}
            options={[
              { label: 'Critical', value: 'critical' },
              { label: 'Major', value: 'major' },
              { label: 'Minor', value: 'minor' },
              { label: 'Trivial', value: 'trivial' },
            ]}
            onChange={(opt) => opt && setSeverity(opt.value as typeof severity)}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>Description (optional)</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
            placeholder="Steps observed, actual vs expected…"
            minimumRows={3}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button appearance="danger" isDisabled={!title.trim() || saving} onClick={handleFile}>
          {saving ? 'Filing…' : 'File defect'}
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}
