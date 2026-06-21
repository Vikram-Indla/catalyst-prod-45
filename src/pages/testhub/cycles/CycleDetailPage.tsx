import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useTestCycle,
  useCycleScope,
  useAddCasesToScope,
  useRemoveFromScope,
  useStartCycle,
  useCompleteCycle,
} from '@/hooks/test-management/useTestCycles';
import { useTestCases } from '@/hooks/test-management/useTestCases';
import { useProjects } from '@/hooks/test-management/useProjects';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import { ArrowLeft, Play, CheckCircle, Plus, Trash2 } from '@/lib/atlaskit-icons';
import { TMCycleScope, RunStatus } from '@/types/test-management';

export default function CycleDetailPage() {
  const { id: cycleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const projectId = projects[0]?.id;

  const { data: cycle, isLoading: cycleLoading } = useTestCycle(cycleId);
  const { data: scopeItems = [], isLoading: scopeLoading } = useCycleScope(cycleId);

  const addCases = useAddCasesToScope();
  const removeCases = useRemoveFromScope();
  const startCycle = useStartCycle();
  const completeCycle = useCompleteCycle();

  const [showAddCases, setShowAddCases] = useState(false);

  if (cycleLoading) {
    return (
      <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (!cycle) {
    return <div style={{ padding: 32, color: 'var(--ds-text-danger, #AE2A19)' }}>Cycle not found</div>;
  }

  const total = cycle.total_cases ?? 0;
  const passed = cycle.passed_count ?? 0;
  const failed = cycle.failed_count ?? 0;
  const blocked = cycle.blocked_count ?? 0;
  const executed = passed + failed + blocked;
  const pct = total > 0 ? Math.round((executed / total) * 100) : 0;

  return (
    <div style={{ padding: '24px', maxWidth: 1200, fontFamily: 'var(--ds-font-family-body)' }}>
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/testhub/cycles')}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ds-link, #0052CC)',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 16,
          padding: 0,
        }}
      >
        <ArrowLeft size={14} />
        Back to cycles
      </button>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <span style={{
              fontSize: 12,
              color: 'var(--ds-text-subtlest, #6B778C)',
              fontFamily: 'var(--ds-font-family-code)',
              marginRight: 8,
            }}>
              {cycle.key}
            </span>
            <h1 style={{ display: 'inline', fontSize: 24, fontWeight: 653, color: 'var(--ds-text, #172B4D)', margin: 0 }}>
              {cycle.name}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {cycle.status === 'PLANNED' && (
              <button
                onClick={() => startCycle.mutate({ id: cycle.id, project_id: cycle.project_id })}
                disabled={startCycle.isPending}
                style={{
                  padding: '8px 16px',
                  background: 'var(--ds-background-brand-bold, #0052CC)',
                  color: 'var(--ds-text-inverse, #FFFFFF)',
                  border: 'none',
                  borderRadius: 4,
                  cursor: startCycle.isPending ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: startCycle.isPending ? 0.7 : 1,
                }}
              >
                <Play size={13} />
                {startCycle.isPending ? 'Starting...' : 'Start cycle'}
              </button>
            )}
            {cycle.status === 'IN_PROGRESS' && (
              <>
                <button
                  onClick={() => navigate(`/testhub/cycles/${cycle.id}/execute`)}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--ds-background-brand-bold, #0052CC)',
                    color: 'var(--ds-text-inverse, #FFFFFF)',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Play size={13} />
                  Execute
                </button>
                <button
                  onClick={() => completeCycle.mutate({ id: cycle.id, project_id: cycle.project_id })}
                  disabled={completeCycle.isPending}
                  style={{
                    padding: '8px 16px',
                    background: 'none',
                    border: '1px solid var(--ds-border, #DFE1E6)',
                    borderRadius: 4,
                    cursor: completeCycle.isPending ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    color: 'var(--ds-text, #172B4D)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    opacity: completeCycle.isPending ? 0.7 : 1,
                  }}
                >
                  <CheckCircle size={13} />
                  {completeCycle.isPending ? 'Completing...' : 'Complete'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <div style={{
            flex: 1,
            maxWidth: 320,
            height: 8,
            background: 'var(--ds-background-neutral, #F1F2F4)',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: 'var(--ds-background-brand-bold, #0052CC)',
              borderRadius: 4,
            }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)' }}>
            {pct}% — {executed}/{total} executed
          </span>
          <span style={{ fontSize: 12, color: 'var(--ds-text-success, #006644)' }}>{passed} passed</span>
          <span style={{ fontSize: 12, color: 'var(--ds-text-danger, #AE2A19)' }}>{failed} failed</span>
          <span style={{ fontSize: 12, color: 'var(--ds-text-warning, #974F0C)' }}>{blocked} blocked</span>
        </div>
      </div>

      {/* Scope section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)', margin: 0 }}>
          Scope ({scopeItems.length} {scopeItems.length === 1 ? 'case' : 'cases'})
        </h2>
        <button
          onClick={() => setShowAddCases(true)}
          style={{
            padding: '6px 12px',
            background: 'none',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
            color: 'var(--ds-text, #172B4D)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={13} />
          Add cases
        </button>
      </div>

      {scopeLoading ? (
        <Spinner size="medium" />
      ) : scopeItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14 }}>
          No cases in scope yet. Add cases to start executing.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8, overflow: 'hidden', background: 'var(--ds-surface, #FFFFFF)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--ds-surface-sunken, #F7F8F9)', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
                <th style={thStyle}>Key</th>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Assignee</th>
                <th style={{ ...thStyle, width: 48 }}></th>
              </tr>
            </thead>
            <tbody>
              {scopeItems.map(item => (
                <ScopeRow
                  key={item.id}
                  item={item}
                  cycleId={cycleId ?? ''}
                  onRemove={() => removeCases.mutate({ cycle_id: cycleId!, scope_ids: [item.id] })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddCases && cycleId && projectId && (
        <AddCasesModal
          cycleId={cycleId}
          projectId={projectId}
          existingCaseIds={scopeItems.map(s => s.case_id)}
          onClose={() => setShowAddCases(false)}
        />
      )}
    </div>
  );
}

function ScopeRow({ item, cycleId, onRemove }: { item: TMCycleScope; cycleId: string; onRemove: () => void }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
      <td style={{ ...tdStyle, fontFamily: 'var(--ds-font-family-code)', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 12 }}>
        {item.test_case?.key ?? '—'}
      </td>
      <td style={{ ...tdStyle, color: 'var(--ds-text, #172B4D)' }}>
        {item.test_case?.title ?? '—'}
      </td>
      <td style={tdStyle}>
        <RunStatusPill status={item.status} />
      </td>
      <td style={{ ...tdStyle, color: 'var(--ds-text-subtle, #42526E)' }}>
        {item.assignee?.full_name ?? (
          <span style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>Unassigned</span>
        )}
      </td>
      <td style={tdStyle}>
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-subtlest, #6B778C)', padding: 4 }}
          title="Remove from scope"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}

function AddCasesModal({
  cycleId,
  projectId,
  existingCaseIds,
  onClose,
}: {
  cycleId: string;
  projectId: string;
  existingCaseIds: string[];
  onClose: () => void;
}) {
  const { data: casesResult } = useTestCases(projectId, { per_page: 100 });
  const allCases = casesResult?.cases ?? [];
  const available = allCases.filter(c => !existingCaseIds.includes(c.id));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const addCases = useAddCasesToScope();

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    await addCases.mutateAsync({ cycle_id: cycleId, case_ids: Array.from(selected) });
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(9,30,66,0.32)', zIndex: 300 }}
      />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 560,
        maxHeight: '80vh',
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(9,30,66,0.32)',
        zIndex: 301,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
            Add cases to scope
          </h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {available.length === 0 ? (
            <p style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14 }}>
              No cases available to add
            </p>
          ) : (
            available.map(c => (
              <label
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 0',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--ds-border, #DFE1E6)',
                }}
              >
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', fontFamily: 'var(--ds-font-family-code)' }}>
                  {c.key}
                </span>
                <span style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>{c.title}</span>
              </label>
            ))
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--ds-border, #DFE1E6)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: '1px solid var(--ds-border, #DFE1E6)',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14,
              color: 'var(--ds-text, #172B4D)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0 || addCases.isPending}
            style={{
              padding: '8px 20px',
              background: 'var(--ds-background-brand-bold, #0052CC)',
              color: 'var(--ds-text-inverse, #FFFFFF)',
              border: 'none',
              borderRadius: 4,
              cursor: selected.size === 0 || addCases.isPending ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 500,
              opacity: selected.size === 0 ? 0.7 : 1,
            }}
          >
            {addCases.isPending
              ? 'Adding...'
              : selected.size > 0
                ? `Add ${selected.size} case${selected.size > 1 ? 's' : ''}`
                : 'Add cases'}
          </button>
        </div>
      </div>
    </>
  );
}

function RunStatusPill({ status }: { status: RunStatus }) {
  const map: Record<RunStatus, { appearance: 'success' | 'moved' | 'removed' | 'inprogress' | 'default'; label: string }> = {
    PASSED:      { appearance: 'success',    label: 'Passed' },
    FAILED:      { appearance: 'removed',    label: 'Failed' },
    BLOCKED:     { appearance: 'moved',      label: 'Blocked' },
    IN_PROGRESS: { appearance: 'inprogress', label: 'In progress' },
    NOT_RUN:     { appearance: 'default',    label: 'Not run' },
    SKIPPED:     { appearance: 'default',    label: 'Skipped' },
  };
  const { appearance, label } = map[status] ?? { appearance: 'default' as const, label: status };
  return <Lozenge appearance={appearance}>{label}</Lozenge>;
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--ds-text-subtle, #42526E)',
};

const tdStyle: React.CSSProperties = { padding: '10px 12px' };
