import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjects } from '@/hooks/test-management/useProjects';
import { useTestCycles, useCycleScope } from '@/hooks/test-management/useTestCycles';
import { useNavigate } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import { TMCycle, TMCycleScope, RunStatus } from '@/types/test-management';

export default function MyWorkPage() {
  const { data: projects = [] } = useProjects();
  const projectId = projects[0]?.id;

  const { data: cycles = [], isLoading } = useTestCycles(projectId);

  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const activeCycles = cycles.filter(c => c.status === 'IN_PROGRESS' || c.status === 'PLANNED');

  if (isLoading) {
    return <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><Spinner size="large" /></div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1200, fontFamily: 'var(--ds-font-family-body)' }}>
      <h1 style={{ fontSize: 24, fontWeight: 653, color: 'var(--ds-text, #172B4D)', marginBottom: 8, marginTop: 0 }}>My Work</h1>
      <p style={{ color: 'var(--ds-text-subtle, #42526E)', fontSize: 14, marginBottom: 24, marginTop: 0 }}>
        Test cases assigned to you across active cycles
      </p>
      {activeCycles.length === 0 ? (
        <div style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14, padding: 32, textAlign: 'center' }}>
          No active cycles found
        </div>
      ) : (
        activeCycles.map(cycle => (
          <CycleScopeSection key={cycle.id} cycle={cycle} currentUserId={currentUserId} />
        ))
      )}
    </div>
  );
}

function CycleScopeSection({ cycle, currentUserId }: { cycle: TMCycle; currentUserId: string | null }) {
  const { data: scopeItems = [], isLoading } = useCycleScope(cycle.id);
  const navigate = useNavigate();

  const myItems = currentUserId
    ? scopeItems.filter(s => s.assigned_to === currentUserId)
    : [];

  if (isLoading) return <div style={{ padding: 8 }}><Spinner size="small" /></div>;
  if (myItems.length === 0) return null;

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)', marginBottom: 12, marginTop: 0 }}>
        {cycle.key} — {cycle.name}
      </h2>
      <div style={{
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--ds-surface, #FFFFFF)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)', background: 'var(--ds-surface-sunken, #F7F8F9)' }}>Key</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)', background: 'var(--ds-surface-sunken, #F7F8F9)' }}>Title</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)', background: 'var(--ds-surface-sunken, #F7F8F9)' }}>Status</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)', background: 'var(--ds-surface-sunken, #F7F8F9)' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {myItems.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--ds-text-subtlest, #6B778C)', fontFamily: 'var(--ds-font-family-code)', fontSize: 12 }}>
                  {item.test_case?.key ?? '—'}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--ds-text, #172B4D)' }}>
                  {item.test_case?.title ?? '—'}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <RunStatusPill status={item.status} />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <button
                    onClick={() => navigate(`/testhub/cycles/${cycle.id}/execute?caseId=${item.case_id}`)}
                    style={{
                      fontSize: 12,
                      padding: '4px 12px',
                      background: 'var(--ds-background-brand-bold, #0052CC)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    Start Run
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
