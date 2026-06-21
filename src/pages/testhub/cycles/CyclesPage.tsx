import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useProjects } from '@/hooks/test-management/useProjects';
import { useTestCycles, useCreateCycle, useDeleteCycle } from '@/hooks/test-management/useTestCycles';
import { useNavigate } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/standard-button';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { Plus, Trash2, X } from '@/lib/atlaskit-icons';
import { TMCycle, CycleStatus } from '@/types/test-management';
import { PageHeader } from '@/components/ads/PageHeader';
import { Breadcrumbs } from '@/components/ads/Breadcrumbs';

export default function CyclesPage() {
  const { data: projects = [] } = useProjects();
  const projectId = projects[0]?.id;
  const { data: cycles = [], isLoading } = useTestCycles(projectId);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  return (
    <div style={{ padding: '24px', maxWidth: 1200, fontFamily: 'var(--ds-font-family-body)' }}>
      <div style={{ marginBottom: 24 }}>
      <PageHeader
        title="Test Cycles"
        breadcrumbs={
          <Breadcrumbs items={[
            { key: 'testhub', text: 'Test Hub', onClick: () => navigate('/testhub/dashboard') },
            { key: 'cycles', text: 'Test Cycles', isCurrent: true },
          ]} />
        }
        actions={
          <Button appearance="primary" onClick={() => setShowCreate(true)} iconBefore={<Plus size={14} label="" />}>
            Create cycle
          </Button>
        }
      />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="large" />
        </div>
      ) : cycles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14 }}>
          No test cycles yet. Create your first cycle to start executing tests.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8, overflow: 'hidden', background: 'var(--ds-surface, #FFFFFF)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--ds-surface-sunken, #F7F8F9)', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
                <th style={thStyle}>Key</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Progress</th>
                <th style={thStyle}>Cases</th>
                <th style={thStyle}>Date range</th>
                <th style={{ ...thStyle, width: 64 }}></th>
              </tr>
            </thead>
            <tbody>
              {cycles.map(cycle => (
                <CycleRow
                  key={cycle.id}
                  cycle={cycle}
                  onClick={() => navigate(`/testhub/cycles/${cycle.id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && projectId && (
        <CreateCyclePanel projectId={projectId} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function CycleRow({ cycle, onClick }: { cycle: TMCycle; onClick: () => void }) {
  const deleteCycle = useDeleteCycle();
  const total = cycle.total_cases ?? 0;
  const executed = (cycle.passed_count ?? 0) + (cycle.failed_count ?? 0) + (cycle.blocked_count ?? 0);
  const pct = total > 0 ? Math.round((executed / total) * 100) : 0;

  return (
    <tr
      style={{ borderBottom: '1px solid var(--ds-border, #DFE1E6)', cursor: 'pointer' }}
      onClick={onClick}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <td style={{ ...tdStyle, fontFamily: 'var(--ds-font-family-code)', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 12, whiteSpace: 'nowrap' }}>
        {cycle.key}
      </td>
      <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>{cycle.name}</td>
      <td style={tdStyle}><CycleStatusPill status={cycle.status} /></td>
      <td style={{ ...tdStyle, minWidth: 120 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: 'var(--ds-background-neutral, #F1F2F4)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--ds-background-brand-bold, #0052CC)', borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', whiteSpace: 'nowrap' }}>{pct}%</span>
        </div>
      </td>
      <td style={{ ...tdStyle, color: 'var(--ds-text-subtle, #42526E)' }}>{total}</td>
      <td style={{ ...tdStyle, color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 12 }}>
        {cycle.planned_start_date ? new Date(cycle.planned_start_date).toLocaleDateString() : '—'}
        {cycle.planned_start_date && cycle.planned_end_date ? ' – ' : ''}
        {cycle.planned_end_date ? new Date(cycle.planned_end_date).toLocaleDateString() : ''}
      </td>
      <td style={tdStyle} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => deleteCycle.mutate({ id: cycle.id, project_id: cycle.project_id })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-subtlest, #6B778C)', padding: 4 }}
          title="Delete cycle"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

function CreateCyclePanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const createCycle = useCreateCycle();

  // Escape — capture phase so it beats any parent handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [onClose]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createCycle.mutateAsync({
      project_id: projectId,
      name: name.trim(),
      description: description || undefined,
      planned_start_date: startDate || undefined,
      planned_end_date: endDate || undefined,
    });
    onClose();
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--ds-text-subtle, #42526E)',
    marginBottom: 4,
  };

  const dateInputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid var(--ds-border, #DFE1E6)',
    borderRadius: 4,
    padding: '6px 10px',
    fontSize: 14,
    fontFamily: 'var(--ds-font-family-body)',
    color: 'var(--ds-text, #172B4D)',
    background: 'var(--ds-surface, #FFFFFF)',
    boxSizing: 'border-box',
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create test cycle"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 640,
        height: '100vh',
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        boxShadow: '-4px 0 20px rgba(9,30,66,0.25)',
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--ds-font-family-body)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--ds-border, #DFE1E6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
          Create test cycle
        </h2>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-subtlest, #6B778C)', padding: 4, display: 'flex' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>Name *</label>
          <Textfield
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="Cycle name"
            autoFocus
          />
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <TextArea
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            placeholder="Optional description"
            minimumRows={3}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Start date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={dateInputStyle} />
          </div>
          <div>
            <label style={labelStyle}>End date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={dateInputStyle} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--ds-border, #DFE1E6)',
        display: 'flex',
        gap: 8,
        justifyContent: 'flex-end',
        flexShrink: 0,
      }}>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button
          appearance="primary"
          isDisabled={!name.trim() || createCycle.isPending}
          onClick={handleCreate}
        >
          {createCycle.isPending ? 'Creating…' : 'Create cycle'}
        </Button>
      </div>
    </div>,
    document.body
  );
}

function CycleStatusPill({ status }: { status: CycleStatus }) {
  const map: Record<CycleStatus, { appearance: 'success' | 'moved' | 'removed' | 'inprogress' | 'default'; label: string }> = {
    IN_PROGRESS: { appearance: 'inprogress', label: 'In progress' },
    COMPLETED:   { appearance: 'success',    label: 'Completed' },
    PLANNED:     { appearance: 'default',    label: 'Planned' },
    CANCELLED:   { appearance: 'removed',    label: 'Cancelled' },
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
