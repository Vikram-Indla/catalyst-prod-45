import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTestHubProject } from '@/hooks/test-management/useTestHubProject';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { JiraTable, makeSummaryCell } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import { catalystToast } from '@/lib/catalystToast';
import { Plus } from '@/lib/atlaskit-icons';

/**
 * S6 (CAT-TESTHUB-REPOSITORY-REDESIGN-20260705-001) — Test Plans surface.
 * tm_test_plans previously had ZERO UI (typed table, no list/create/detail).
 * This is the Organize-plane list: a canonical JiraTable over tm_test_plans,
 * navigating by the existing plan_key display key (Grid F — no slug migration
 * needed). Progress renders from the denormalized *_count columns.
 */

interface TmTestPlan {
  id: string;
  plan_key: string | null;
  name: string;
  status: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  total_tests: number | null;
  passed_count: number | null;
  failed_count: number | null;
  blocked_count: number | null;
}

const PLAN_STATUS: Record<string, { appearance: 'default' | 'inprogress' | 'success' | 'removed'; label: string }> = {
  draft: { appearance: 'default', label: 'Draft' },
  active: { appearance: 'inprogress', label: 'Active' },
  in_progress: { appearance: 'inprogress', label: 'In progress' },
  completed: { appearance: 'success', label: 'Completed' },
  archived: { appearance: 'removed', label: 'Archived' },
  cancelled: { appearance: 'removed', label: 'Cancelled' },
};

function fmtDate(d: string | null): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
}

export default function TestPlansPage() {
  const { projectId } = useTestHubProject();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['tm-test-plans', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<TmTestPlan[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('tm_test_plans')
        .select('id, plan_key, name, status, planned_start_date, planned_end_date, total_tests, passed_count, failed_count, blocked_count')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error || !data) return [];
      return data as TmTestPlan[];
    },
  });

  const createPlan = useMutation({
    mutationFn: async (name: string) => {
      if (!projectId) throw new Error('No project');
      const { error } = await supabase.from('tm_test_plans').insert({ project_id: projectId, name, status: 'draft' });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      catalystToast.success('Test plan created');
      qc.invalidateQueries({ queryKey: ['tm-test-plans', projectId] });
      setCreateOpen(false);
      setNewName('');
    },
    onError: (e: Error) => catalystToast.error(e.message),
  });

  const columns: Column<TmTestPlan>[] = useMemo(() => [
    {
      id: 'key', label: 'Key', width: 12, alwaysVisible: true,
      cell: ({ row }) => (
        <span style={{
          fontFamily: 'var(--ds-font-family-code, monospace)',
          fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)',
          color: 'var(--ds-text-subtle)',
        }}>
          {row.plan_key ?? '—'}
        </span>
      ),
    },
    { id: 'name', label: 'Name', flex: true, alwaysVisible: true, cell: makeSummaryCell((r: TmTestPlan) => r.name) },
    {
      id: 'status', label: 'Status', width: 12,
      cell: ({ row }) => {
        const cfg = (row.status && PLAN_STATUS[row.status]) || { appearance: 'default' as const, label: row.status ?? '—' };
        return <Lozenge appearance={cfg.appearance}>{cfg.label}</Lozenge>;
      },
    },
    {
      id: 'progress', label: 'Progress', width: 18,
      cell: ({ row }) => {
        const total = row.total_tests ?? 0;
        const done = (row.passed_count ?? 0) + (row.failed_count ?? 0) + (row.blocked_count ?? 0);
        if (total === 0) return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
        const pct = Math.round((done / total) * 100);
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-100)' }}>
            <span style={{ width: 80, height: 6, borderRadius: 'var(--ds-border-radius)', background: 'var(--ds-background-neutral)', overflow: 'hidden', flexShrink: 0 }}>
              <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--ds-background-success-bold)' }} />
            </span>
            <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>{done}/{total}</span>
          </span>
        );
      },
    },
    {
      id: 'dates', label: 'Timeline', width: 18,
      cell: ({ row }) => (
        <span style={{ fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)', color: 'var(--ds-text-subtle)' }}>
          {fmtDate(row.planned_start_date)} → {fmtDate(row.planned_end_date)}
        </span>
      ),
    },
  ], []);

  return (
    <>
      <ProjectPageHeader projectKey="TESTHUB" hubType="test" />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{
          padding: 'var(--ds-space-200) var(--ds-space-300)', borderBottom: '1px solid var(--ds-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--ds-surface)',
        }}>
          <div>
            <div style={{ fontSize: 'var(--ds-font-size-500)', lineHeight: 'var(--ds-line-height-500)', fontWeight: 600, color: 'var(--ds-text)' }}>Test plans</div>
            <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>Release-scoped strategy grouping sets and cycles.</div>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            style={{
              padding: 'var(--ds-space-075) var(--ds-space-200)', background: 'var(--ds-background-brand-bold)',
              color: 'var(--ds-text-inverse)', border: 'none', borderRadius: 'var(--ds-border-radius)',
              fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--ds-space-050)',
            }}
          >
            <Plus size={16} /> Create plan
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 'var(--ds-space-050) var(--ds-space-150) var(--ds-space-300)' }}>
          {isLoading ? (
            <div style={{ padding: 'var(--ds-space-400)', display: 'flex', justifyContent: 'center' }}><Spinner size="large" /></div>
          ) : plans.length === 0 ? (
            <div style={{ padding: 'var(--ds-space-600, 48px)', textAlign: 'center', color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)' }}>
              No test plans yet. Create one to group your sets and cycles for a release.
            </div>
          ) : (
            <JiraTable<TmTestPlan>
              columns={columns}
              data={plans}
              getRowId={r => r.id}
              showRowCount
              totalRowCount={plans.length}
            />
          )}
        </div>
      </div>

      {createOpen && (
        <ModalDialog onClose={() => setCreateOpen(false)} width="small">
          <ModalHeader><ModalTitle>Create test plan</ModalTitle></ModalHeader>
          <ModalBody>
            <Textfield
              autoFocus
              placeholder="Plan name"
              value={newName}
              onChange={e => setNewName((e.target as HTMLInputElement).value)}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' && newName.trim()) createPlan.mutate(newName.trim()); }}
            />
          </ModalBody>
          <ModalFooter>
            <button onClick={() => setCreateOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--ds-space-050) var(--ds-space-150)', fontWeight: 500, color: 'var(--ds-text-subtle)' }}>Cancel</button>
            <button
              onClick={() => { if (newName.trim()) createPlan.mutate(newName.trim()); }}
              disabled={!newName.trim() || createPlan.isPending}
              style={{
                padding: 'var(--ds-space-050) var(--ds-space-200)', borderRadius: 'var(--ds-border-radius)', border: 'none', fontWeight: 600,
                cursor: !newName.trim() || createPlan.isPending ? 'not-allowed' : 'pointer',
                background: !newName.trim() || createPlan.isPending ? 'var(--ds-background-disabled)' : 'var(--ds-background-brand-bold)',
                color: !newName.trim() || createPlan.isPending ? 'var(--ds-text-disabled)' : 'var(--ds-text-inverse)',
              }}
            >
              {createPlan.isPending ? 'Creating…' : 'Create'}
            </button>
          </ModalFooter>
        </ModalDialog>
      )}
    </>
  );
}
