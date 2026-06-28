import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@atlaskit/button/standard-button';
import Spinner from '@atlaskit/spinner';
import Textfield from '@atlaskit/textfield';
import { PageHeader } from '@/components/ads/PageHeader';
import { Breadcrumbs } from '@/components/ads/Breadcrumbs';
import { catalystToast } from '@/lib/catalystToast';
import { supabase } from '@/integrations/supabase/client';
import { RunStatus } from '@/types/test-management';

interface RunStatusRow {
  id: string;
  name: string;
  status_type: RunStatus;
  highlight_color: string | null;
  execution_completed: boolean;
  display_order: number;
  is_system: boolean;
  program_id: string | null;
}

const STATUS_TYPE_COLORS: Record<RunStatus, string> = {
  NOT_RUN:     'var(--ds-background-neutral)',
  IN_PROGRESS: 'var(--ds-background-information)',
  PASSED:      'var(--ds-background-success)',
  FAILED:      'var(--ds-background-danger)',
  BLOCKED:     'var(--ds-background-warning)',
  SKIPPED:     'var(--ds-background-neutral)',
};

const STATUS_TYPE_TEXT: Record<RunStatus, string> = {
  NOT_RUN:     'var(--ds-text-subtle)',
  IN_PROGRESS: 'var(--ds-text-information)',
  PASSED:      'var(--ds-text-success)',
  FAILED:      'var(--ds-text-danger)',
  BLOCKED:     'var(--ds-text-warning)',
  SKIPPED:     'var(--ds-text-subtlest)',
};

function StatusChip({ row }: { row: RunStatusRow }) {
  const bg = row.highlight_color ?? STATUS_TYPE_COLORS[row.status_type] ?? STATUS_TYPE_COLORS.NOT_RUN;
  const color = STATUS_TYPE_TEXT[row.status_type] ?? 'var(--ds-text)';
  return (
    <span style={{
      display: 'inline-block', padding: '0px 8px', borderRadius: 3, fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
      background: bg, color,
    }}>
      {row.name}
    </span>
  );
}

export default function TestRunStatusesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: statuses = [], isLoading } = useQuery({
    queryKey: ['test_run_statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_run_statuses')
        .select('id, name, status_type, highlight_color, execution_completed, display_order, is_system, program_id')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as RunStatusRow[];
    },
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, highlight_color }: { id: string; name: string; highlight_color: string }) => {
      const { error } = await supabase
        .from('test_run_statuses')
        .update({ name, highlight_color: highlight_color || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['test_run_statuses'] });
      setEditingId(null);
      catalystToast.success('Status updated');
    },
    onError: (e: Error) => catalystToast.error(e.message),
  });

  const startEdit = (row: RunStatusRow) => {
    setEditingId(row.id);
    setEditName(row.name);
    setEditColor(row.highlight_color ?? '');
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="large" /></div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 860, fontFamily: 'var(--ds-font-family-body)' }}>
      <PageHeader
        title="Run statuses"
        breadcrumbs={
          <Breadcrumbs items={[
            { key: 'admin', text: 'Admin', onClick: () => navigate('/admin/overview') },
            { key: 'test', text: 'Test Hub', isCurrent: false },
            { key: 'run-statuses', text: 'Run statuses', isCurrent: true },
          ]} />
        }
      />

      <p style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtle)', margin: '4px 0 24px' }}>
        Statuses applied to individual test run results. System statuses cannot be deleted but display names and colors can be customized.
      </p>

      <div style={{ border: '1px solid var(--ds-border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--ds-font-size-400)' }}>
          <thead>
            <tr style={{ background: 'var(--ds-surface-sunken)', borderBottom: '1px solid var(--ds-border)' }}>
              {['Preview', 'Name', 'Type', 'Marks complete', 'System', 'Actions'].map((h, i) => (
                <th key={i} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {statuses.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--ds-text-subtlest)' }}>
                  No run statuses found.
                </td>
              </tr>
            ) : statuses.map(row => (
              <tr key={row.id} style={{ borderBottom: '1px solid var(--ds-border)' }}>
                <td style={{ padding: '8px 12px', width: 100 }}>
                  <StatusChip row={row} />
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {editingId === row.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <Textfield
                        value={editName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                        autoFocus
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>Color override:</label>
                        <input
                          type="color"
                          value={editColor || 'var(--ds-background-neutral)'}
                          onChange={e => setEditColor(e.target.value)}
                          style={{ width: 32, height: 24, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                        />
                        {editColor && (
                          <button
                            onClick={() => setEditColor('')}
                            style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-link)', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            Reset to default
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontWeight: 500, color: 'var(--ds-text)' }}>{row.name}</span>
                  )}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ fontSize: 'var(--ds-font-size-100)', fontFamily: 'var(--ds-font-family-code, monospace)', color: 'var(--ds-text-subtle)' }}>
                    {row.status_type}
                  </span>
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {row.execution_completed ? (
                    <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-success)' }}>✓ Yes</span>
                  ) : (
                    <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {row.is_system ? (
                    <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>System</span>
                  ) : (
                    <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>Custom</span>
                  )}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {editingId === row.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button
                        appearance="primary"
                        spacing="compact"
                        isDisabled={!editName.trim() || updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ id: row.id, name: editName.trim(), highlight_color: editColor })}
                      >
                        Save
                      </Button>
                      <Button appearance="subtle" spacing="compact" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button appearance="subtle" spacing="compact" onClick={() => startEdit(row)}>Edit</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
