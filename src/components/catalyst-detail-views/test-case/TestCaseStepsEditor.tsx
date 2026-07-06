// ============================================================================
// TestCaseStepsEditor — persistence-backed step CRUD for the test-case detail.
//
// CAT-TESTHUB-REBUILD Phase 1 (P0). The detail view previously rendered steps
// READ-ONLY; the CRUD hooks (useTestSteps) and StepEditor existed but were
// never wired. This editor closes that gap with PER-ROW persistence (stable
// tm_test_steps.id per step) so each add/edit/delete/reorder is a real DB
// write and the Activity audit trail can record per-step history.
//
// StepEditor (src/pages/testhub/repository/StepEditor.tsx) stays the in-memory
// editor for the CREATE flow; the detail view needs stable ids, so it uses the
// hooks directly here while matching StepEditor's visual idiom exactly.
// ============================================================================
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ChevronUp, ChevronDown, Copy } from '@/lib/atlaskit-icons';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import {
  useAddTestStep,
  useUpdateTestStep,
  useDeleteTestStep,
  useReorderTestSteps,
} from '@/hooks/test-management/useTestSteps';

interface StepRow {
  id: string;
  step_number: number;
  action: string;
  expected_result: string;
  test_data?: string | null;
}

interface TestCaseStepsEditorProps {
  testCaseId: string;
  steps: StepRow[];
}

const taStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--ds-border)',
  borderRadius: 4,
  padding: '4px 8px',
  fontSize: 'var(--ds-font-size-300)',
  fontFamily: 'var(--ds-font-family-body)',
  color: 'var(--ds-text)',
  background: 'var(--ds-surface)',
  resize: 'vertical',
  // D2 (CAT-TESTHUB-V2): authoring canvas is content-first — no cramped rows
  minHeight: 96,
  lineHeight: 'var(--ds-line-height-body)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--ds-font-size-100)',
  fontWeight: 600,
  color: 'var(--ds-text-subtle)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const smallBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--ds-text-subtlest)',
  padding: '0px 4px',
  fontSize: 'var(--ds-font-size-200)',
  display: 'flex',
  alignItems: 'center',
};

/** One editable step card. Local draft state; persists on blur when changed. */
function StepCard({
  step,
  index,
  total,
  onUpdate,
  onDelete,
  onMove,
  onCopy,
  onQuickAdd,
  busy,
}: {
  step: StepRow;
  index: number;
  total: number;
  onUpdate: (patch: { action?: string; expected_result?: string; test_data?: string }) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onCopy: () => void;
  onQuickAdd: () => void;
  busy: boolean;
}) {
  const [action, setAction] = useState(step.action ?? '');
  const [expected, setExpected] = useState(step.expected_result ?? '');
  const [testData, setTestData] = useState(step.test_data ?? '');

  // Keep local state in sync when the underlying step changes (reorder/refetch).
  React.useEffect(() => {
    setAction(step.action ?? '');
    setExpected(step.expected_result ?? '');
    setTestData(step.test_data ?? '');
  }, [step.id, step.action, step.expected_result, step.test_data]);

  const commit = (field: 'action' | 'expected_result' | 'test_data', value: string) => {
    const original =
      field === 'action' ? (step.action ?? '')
      : field === 'expected_result' ? (step.expected_result ?? '')
      : (step.test_data ?? '');
    if (value === original) return;
    onUpdate({ [field]: value } as { action?: string; expected_result?: string; test_data?: string });
  };

  return (
    <div style={{ border: '1px solid var(--ds-border)', borderRadius: 6, padding: 12, background: 'var(--ds-surface-raised)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)' }}>Step {index + 1}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => onMove(-1)} disabled={index === 0 || busy} style={smallBtn} title="Move up" aria-label="Move step up">
            <ChevronUp size={14} />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1 || busy} style={smallBtn} title="Move down" aria-label="Move step down">
            <ChevronDown size={14} />
          </button>
          <button onClick={onCopy} disabled={busy} style={smallBtn} title="Copy step" aria-label="Copy step">
            <Copy size={12} />
          </button>
          <button onClick={onDelete} disabled={busy} style={{ ...smallBtn, color: 'var(--ds-text-danger)' }} title="Delete step" aria-label="Delete step">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
        onKeyDown={(e) => {
          // D2: keyboard add-row — Cmd/Ctrl+Enter appends the next step
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            onQuickAdd();
          }
        }}
      >
        <div>
          <label style={labelStyle}>Action</label>
          <textarea
            value={action}
            onChange={e => setAction(e.target.value)}
            onBlur={() => commit('action', action)}
            style={taStyle}
            placeholder="Describe the action to perform"
          />
        </div>
        <div>
          <label style={labelStyle}>Expected result</label>
          <textarea
            value={expected}
            onChange={e => setExpected(e.target.value)}
            onBlur={() => commit('expected_result', expected)}
            style={taStyle}
            placeholder="What should happen"
          />
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <label style={labelStyle}>Test data (optional)</label>
        <input
          type="text"
          value={testData}
          onChange={e => setTestData(e.target.value)}
          onBlur={() => commit('test_data', testData)}
          style={{ ...taStyle, minHeight: 'unset', height: 32, resize: 'none' }}
          placeholder="e.g. username=admin"
        />
      </div>
    </div>
  );
}

export function TestCaseStepsEditor({ testCaseId, steps }: TestCaseStepsEditorProps) {
  const addStep = useAddTestStep();
  const updateStep = useUpdateTestStep();
  const deleteStep = useDeleteTestStep();
  const reorderSteps = useReorderTestSteps();
  const queryClient = useQueryClient();

  // D2: copy step via the existing tm_clone_step RPC (inserts right after the
  // source, renumbers server-side)
  const cloneStep = useMutation({
    mutationFn: async (input: { stepId: string; insertAfter: number }) => {
      const { error } = await supabase.rpc(
        'tm_clone_step' as never,
        { p_step_id: input.stepId, p_insert_after: input.insertAfter } as never,
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-case', testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-steps', testCaseId] });
    },
    onError: (e: Error) => catalystToast.error('Failed to copy step', e.message),
  });

  const ordered = [...steps].sort((a, b) => a.step_number - b.step_number);
  const busy = addStep.isPending || updateStep.isPending || deleteStep.isPending || reorderSteps.isPending || cloneStep.isPending;

  const quickAdd = () =>
    addStep.mutate({
      test_case_id: testCaseId,
      step_number: (ordered[ordered.length - 1]?.step_number ?? 0) + 1,
      action: '',
      expected_result: '',
    });

  const handleMove = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= ordered.length) return;
    const ids = ordered.map(s => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderSteps.mutate({ test_case_id: testCaseId, stepIds: ids });
  };

  return (
    <div style={{ padding: '8px 16px' }}>
      {ordered.length === 0 ? (
        <p style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)', margin: '0 0 12px' }}>No steps yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
          {ordered.map((s, i) => (
            <StepCard
              key={s.id}
              step={s}
              index={i}
              total={ordered.length}
              busy={busy}
              onUpdate={patch => updateStep.mutate({ id: s.id, test_case_id: testCaseId, ...patch })}
              onDelete={() => deleteStep.mutate({ id: s.id, test_case_id: testCaseId })}
              onMove={dir => handleMove(i, dir)}
              onCopy={() => cloneStep.mutate({ stepId: s.id, insertAfter: s.step_number })}
              onQuickAdd={quickAdd}
            />
          ))}
        </div>
      )}

      <button
        onClick={() =>
          addStep.mutate({
            test_case_id: testCaseId,
            step_number: (ordered[ordered.length - 1]?.step_number ?? 0) + 1,
            action: '',
            expected_result: '',
          })
        }
        disabled={busy}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 12px',
          background: 'none',
          border: '1px dashed var(--ds-border)',
          borderRadius: 4,
          fontSize: 'var(--ds-font-size-300)',
          color: 'var(--ds-text-subtle)',
          cursor: busy ? 'default' : 'pointer',
          width: '100%',
          justifyContent: 'center',
        }}
      >
        <Plus size={14} />
        Add step
      </button>
    </div>
  );
}
