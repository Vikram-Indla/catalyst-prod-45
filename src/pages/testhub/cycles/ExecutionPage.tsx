import React, { useState, useEffect, useRef, useCallback, DragEvent } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useCycleScope } from '@/hooks/test-management/useTestCycles';
import { useTestCase } from '@/hooks/test-management/useTestCases';
import { useProjects } from '@/hooks/test-management/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import Textarea from '@atlaskit/textarea';
import { ArrowLeft, ChevronRight } from '@/lib/atlaskit-icons';
import { TMCycleScope, TMCaseStep, RunStatus } from '@/types/test-management';
import { catalystToast } from '@/lib/catalystToast';

const ATTACHMENT_BUCKET = 'testhub-attachments';

type StepStatus = 'NOT_RUN' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED';

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
  if (statuses.every(s => s === 'PASSED' || s === 'SKIPPED')) return 'PASSED';
  if (statuses.every(s => s === 'NOT_RUN')) return 'NOT_RUN';
  return 'IN_PROGRESS';
}

export default function ExecutionPage() {
  const { id: cycleId, projectKey = 'BAU' } = useParams<{ id: string; projectKey: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: projects = [] } = useProjects();
  const projectId = projects[0]?.id;

  const { data: scopeItems = [], isLoading } = useCycleScope(cycleId);

  const initialCaseId = searchParams.get('caseId');
  const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null);

  // Auto-select first scope item or the one from URL
  useEffect(() => {
    if (scopeItems.length === 0) return;
    if (initialCaseId) {
      const match = scopeItems.find(s => s.case_id === initialCaseId);
      if (match) {
        setSelectedScopeId(match.id);
        return;
      }
    }
    if (!selectedScopeId) {
      setSelectedScopeId(scopeItems[0].id);
    }
  }, [scopeItems, initialCaseId]);

  const selectedScope = scopeItems.find(s => s.id === selectedScopeId) ?? null;

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
        borderRight: '1px solid var(--ds-border, #DFE1E6)',
        background: 'var(--ds-surface-sunken, #F7F8F9)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
          <button
            onClick={() => navigate(`/testhub/${projectKey}/cycles/${cycleId}`)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ds-link, #0052CC)',
              fontSize: 13,
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
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
            {scopeItems.length} {scopeItems.length === 1 ? 'case' : 'cases'}
          </h3>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {scopeItems.map(item => (
            <div
              key={item.id}
              onClick={() => setSelectedScopeId(item.id)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                background: selectedScopeId === item.id ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                borderBottom: '1px solid var(--ds-border, #DFE1E6)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <RunStatusDot status={item.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', fontFamily: 'var(--ds-font-family-code)' }}>
                  {item.test_case?.key ?? '—'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--ds-surface, #FFFFFF)' }}>
        {selectedScope ? (
          <StepRunner
            scope={selectedScope}
            cycleId={cycleId!}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['tm-cycle-scope', cycleId] })}
          />
        ) : (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14 }}>
            Select a case from the list
          </div>
        )}
      </div>
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

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'var(--ds-shadow-raised, rgba(9,30,66,0.54))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        borderRadius: 8, padding: 24, width: 480,
        boxShadow: '0 8px 28px var(--ds-shadow-raised, rgba(9,30,66,0.25))',
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
          Save execution
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ds-text-subtle, #42526E)' }}>
          Optionally add notes before saving this run result.
        </p>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)', display: 'block', marginBottom: 4 }}>
            Notes (optional)
          </label>
          <Textarea
            value={notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            placeholder="Environment details, blockers, observations…"
            minimumRows={3}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px', borderRadius: 4, border: '1px solid var(--ds-border, #DFE1E6)',
              background: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--ds-text, #172B4D)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(notes)}
            disabled={saving}
            style={{
              padding: '8px 16px', borderRadius: 4, border: 'none',
              background: 'var(--ds-background-brand-bold, #0052CC)',
              color: 'var(--ds-text-inverse, #FFFFFF)', cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 500, opacity: saving ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {saving && <Spinner size="small" appearance="invert" />}
            {saving ? 'Saving…' : 'Save run'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Step runner ────────────────────────────────────────────────────────────
function StepRunner({
  scope,
  cycleId,
  onSaved,
}: {
  scope: TMCycleScope;
  cycleId: string;
  onSaved: () => void;
}) {
  const { data: caseDetail, isLoading } = useTestCase(scope.case_id);
  const steps: TMCaseStep[] = caseDetail?.steps ?? [];
  const [stepStates, setStepStates] = useState<StepState[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const timer = useTimer();

  // Init step states when case loads
  useEffect(() => {
    if (steps.length > 0 && stepStates.length === 0) {
      setStepStates(steps.map(s => ({ stepId: s.id, status: 'NOT_RUN', actualResult: '' })));
    }
  }, [steps]);

  // Reset step states when scope changes
  useEffect(() => {
    setStepStates([]);
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

  const handleReset = () => {
    setStepStates(steps.map(s => ({ stepId: s.id, status: 'NOT_RUN', actualResult: '' })));
    setPendingFiles([]);
    timer.reset();
  };

  const handleSave = async (notes: string) => {
    setSaving(true);
    timer.pause();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const runStatus = computeRunStatus(stepStates);
      const dbStatus = runStatus.toLowerCase() as 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped';
      const isTerminal = runStatus !== 'NOT_RUN' && runStatus !== 'IN_PROGRESS';

      // Insert run record
      // tm_test_runs keys on cycle_scope_id (NOT NULL) — case + cycle are
      // derived via tm_cycle_scope. There is no cycle_id/scope_id/case_id column.
      const { data: run, error: runError } = await supabase
        .from('tm_test_runs')
        .insert({
          cycle_scope_id: scope.id,
          run_number: 1,
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
      if (run && stepStates.length > 0) {
        const stepResults = stepStates.map((ss, i) => ({
          test_run_id: run.id,
          test_step_id: ss.stepId,
          step_number: i + 1,
          status: ss.status.toLowerCase(),
          actual_result: ss.actualResult || null,
          executed_at: new Date().toISOString(),
        }));
        await supabase.from('tm_step_results').insert(stepResults);
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
      await supabase
        .from('tm_cycle_scope')
        .update({ current_status: dbStatus })
        .eq('id', scope.id);

      setShowSaveModal(false);
      setPendingFiles([]);
      catalystToast.success(`Saved: ${runStatus}`);
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
    return <div style={{ padding: 32, color: 'var(--ds-text-danger, #AE2A19)' }}>Case not found</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Timer bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
        padding: '8px 16px', borderRadius: 8,
        background: timer.running
          ? 'var(--ds-background-information-subtle, #E9F2FF)'
          : 'var(--ds-surface-sunken, #F7F8F9)',
        border: '1px solid var(--ds-border, #DFE1E6)',
      }}>
        <span style={{
          fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 18, fontWeight: 600,
          color: timer.running ? 'var(--ds-text-information, #0052CC)' : 'var(--ds-text-subtle, #42526E)',
          minWidth: 72,
        }}>
          {timer.fmt(timer.elapsed)}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {!timer.running ? (
            <button onClick={timer.start} style={timerBtnStyle('var(--ds-text-success, #006644)')}>▶ Start</button>
          ) : (
            <button onClick={timer.pause} style={timerBtnStyle('var(--ds-text-warning, #974F0C)')}>⏸ Pause</button>
          )}
          <button onClick={timer.reset} disabled={timer.elapsed === 0 && !timer.running} style={timerBtnStyle('var(--ds-text-subtle, #42526E)')}>
            ↺ Reset
          </button>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleReset}
          style={{
            padding: '4px 12px', borderRadius: 4, border: '1px solid var(--ds-border, #DFE1E6)',
            background: 'none', cursor: 'pointer', fontSize: 12,
            color: 'var(--ds-text-subtle, #42526E)', fontFamily: 'var(--ds-font-family-body)',
          }}
        >
          Reset run
        </button>
      </div>

      {/* Case header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', fontFamily: 'var(--ds-font-family-code)', marginBottom: 4 }}>
          {caseDetail.key}
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
          {caseDetail.title}
        </h2>
        {caseDetail.preconditions && (
          <div style={{
            background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 6,
            padding: 12,
            fontSize: 13,
            color: 'var(--ds-text-subtle, #42526E)',
          }}>
            <strong style={{ display: 'block', marginBottom: 4, color: 'var(--ds-text, #172B4D)' }}>Preconditions</strong>
            {caseDetail.preconditions}
          </div>
        )}
      </div>

      {/* Steps */}
      {steps.length === 0 ? (
        <div style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14, padding: '24px 0' }}>
          No steps defined for this test case.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {steps.map((step, i) => {
            const state = stepStates[i];
            const stepBg = state?.status === 'PASSED'
              ? 'var(--ds-background-success-subtle, #E3FCEF)'
              : state?.status === 'FAILED'
                ? 'var(--ds-background-danger-subtle, #FFEBE6)'
                : state?.status === 'BLOCKED'
                  ? 'var(--ds-background-warning-subtle, #FFFAE6)'
                  : 'var(--ds-surface-sunken, #F7F8F9)';

            return (
              <div key={step.id} style={{
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 8,
                overflow: 'hidden',
                background: 'var(--ds-surface, #FFFFFF)',
              }}>
                <div style={{
                  padding: '12px 16px',
                  background: stepBg,
                  borderBottom: '1px solid var(--ds-border, #DFE1E6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ds-text, #172B4D)' }}>
                    Step {i + 1}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <StepBtn
                      label="Pass"
                      icon="✓"
                      active={state?.status === 'PASSED'}
                      color="var(--ds-text-success, #006644)"
                      onClick={() => updateStepStatus(i, 'PASSED')}
                    />
                    <StepBtn
                      label="Fail"
                      icon="✗"
                      active={state?.status === 'FAILED'}
                      color="var(--ds-text-danger, #AE2A19)"
                      onClick={() => updateStepStatus(i, 'FAILED')}
                    />
                    <StepBtn
                      label="Block"
                      icon="⊘"
                      active={state?.status === 'BLOCKED'}
                      color="var(--ds-text-warning, #974F0C)"
                      onClick={() => updateStepStatus(i, 'BLOCKED')}
                    />
                    <StepBtn
                      label="Skip"
                      icon="→"
                      active={state?.status === 'SKIPPED'}
                      color="var(--ds-text-subtlest, #6B778C)"
                      onClick={() => updateStepStatus(i, 'SKIPPED')}
                    />
                  </div>
                </div>
                <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 4 }}>ACTION</div>
                    <div style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)' }}>{step.action}</div>
                    {step.test_data && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 4 }}>TEST DATA</div>
                        <code style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)', fontFamily: 'var(--ds-font-family-code)' }}>
                          {step.test_data}
                        </code>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 4 }}>EXPECTED RESULT</div>
                    <div style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)', marginBottom: 8 }}>
                      {step.expected_result}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 4 }}>ACTUAL RESULT</div>
                    <textarea
                      value={state?.actualResult ?? ''}
                      onChange={e => updateActualResult(i, e.target.value)}
                      placeholder="Enter actual result..."
                      style={{
                        width: '100%',
                        border: '1px solid var(--ds-border, #DFE1E6)',
                        borderRadius: 4,
                        padding: '8px 8px',
                        fontSize: 13,
                        fontFamily: 'var(--ds-font-family-body)',
                        color: 'var(--ds-text, #172B4D)',
                        background: 'var(--ds-surface, #FFFFFF)',
                        resize: 'vertical',
                        minHeight: 56,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          onClick={() => setShowSaveModal(true)}
          style={{
            padding: '8px 24px',
            background: 'var(--ds-background-brand-bold, #0052CC)',
            color: 'var(--ds-text-inverse, #FFFFFF)',
            border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Save execution
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
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 8 }}>
        ATTACHMENTS (optional)
      </div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--ds-border-focused, #388BFF)' : 'var(--ds-border, #DFE1E6)'}`,
          borderRadius: 8,
          padding: '16px 16px',
          background: dragOver ? 'var(--ds-background-information-subtle, #E9F2FF)' : 'var(--ds-surface-sunken, #F7F8F9)',
          cursor: 'pointer',
          textAlign: 'center',
          fontSize: 13,
          color: 'var(--ds-text-subtle, #42526E)',
          transition: 'all 0.15s',
          marginBottom: files.length ? 8 : 0,
        }}
      >
        Drop files here or <span style={{ color: 'var(--ds-link, #0052CC)', fontWeight: 500 }}>browse</span>
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
          background: 'var(--ds-surface-sunken, #F7F8F9)',
          border: '1px solid var(--ds-border, #DFE1E6)',
          fontSize: 13,
        }}>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ds-text, #172B4D)' }}>
            {f.name}
          </span>
          <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', flexShrink: 0 }}>
            {fmtSize(f.size)}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onRemove(i); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14, lineHeight: 1, padding: 4,
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
  background: 'none', cursor: 'pointer', fontSize: 12, color,
  fontFamily: 'var(--ds-font-family-body)',
});

function RunStatusDot({ status }: { status: RunStatus }) {
  const colors: Record<RunStatus, string> = {
    PASSED:      'var(--ds-icon-success, #006644)',
    FAILED:      'var(--ds-icon-danger, #AE2A19)',
    BLOCKED:     'var(--ds-icon-warning, #974F0C)',
    IN_PROGRESS: 'var(--ds-icon-information, #0052CC)',
    NOT_RUN:     'var(--ds-icon-subtlest, #6B778C)',
    SKIPPED:     'var(--ds-icon-subtle, #42526E)',
  };
  return (
    <span style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: colors[status] ?? 'var(--ds-icon-subtlest, #6B778C)',
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
    'var(--ds-text-success, #006644)':   'var(--ds-background-success-subtle, #E3FCEF)',
    'var(--ds-text-danger, #AE2A19)':    'var(--ds-background-danger-subtle, #FFEBE6)',
    'var(--ds-text-warning, #974F0C)':   'var(--ds-background-warning-subtle, #FFFAE6)',
    'var(--ds-text-subtlest, #6B778C)':  'var(--ds-background-neutral-subtle, #F7F8F9)',
  };
  const activeBg = activeBgMap[color] ?? 'var(--ds-background-neutral-subtle, #F7F8F9)';

  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 8px',
        background: active ? activeBg : 'none',
        border: `1px solid ${active ? color : 'var(--ds-border, #DFE1E6)'}`,
        borderRadius: 4,
        cursor: 'pointer',
        fontSize: 12,
        color: active ? color : 'var(--ds-text-subtle, #42526E)',
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
