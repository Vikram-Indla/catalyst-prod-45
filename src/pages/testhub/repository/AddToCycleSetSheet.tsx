import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import { Search } from '@/lib/atlaskit-icons';
import { supabase } from '@/integrations/supabase/client';
import { useTestCycles, useAddCasesToScope } from '@/hooks/test-management/useTestCycles';
import { catalystToast } from '@/lib/catalystToast';

/**
 * S5 (CAT-TESTHUB-REPOSITORY-REDESIGN-20260705-001) — add selected repository
 * cases to a cycle or a set, from the repository itself. Previously this only
 * worked from the cycle/set detail side. Reuses the canonical write paths:
 * `useAddCasesToScope` for cycles (tm_cycle_scope) and a tm_set_cases insert
 * for sets — no new mutation logic. One component, opened from the bulk bar or
 * a row action, mode-switched by `mode`.
 */
export type LinkTarget = 'cycle' | 'set';

interface TestSetRow { id: string; name: string; set_type: string | null; is_active: boolean | null }

export function AddToCycleSetSheet({
  mode, projectId, caseIds, onClose, onDone,
}: {
  mode: LinkTarget;
  projectId: string | undefined;
  caseIds: string[];
  onClose: () => void;
  onDone?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: cyclesData, isLoading: cyclesLoading } = useTestCycles(mode === 'cycle' ? projectId : undefined);
  const cycles = cyclesData ?? [];

  const { data: sets = [], isLoading: setsLoading } = useQuery({
    queryKey: ['tm-sets-picker', projectId],
    enabled: mode === 'set' && !!projectId,
    queryFn: async (): Promise<TestSetRow[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('tm_test_sets')
        .select('id, name, set_type, is_active')
        .eq('project_id', projectId)
        .order('name');
      if (error || !data) return [];
      return data as TestSetRow[];
    },
  });

  const addToCycle = useAddCasesToScope();

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (mode === 'cycle') {
      return cycles
        .filter(c => !q || (c.name ?? '').toLowerCase().includes(q))
        .map(c => ({ id: c.id, name: c.name ?? 'Cycle', meta: c.status ?? null }));
    }
    return sets
      .filter(s => !q || (s.name ?? '').toLowerCase().includes(q))
      .map(s => ({ id: s.id, name: s.name, meta: s.set_type }));
  }, [mode, cycles, sets, search]);

  const loading = mode === 'cycle' ? cyclesLoading : setsLoading;

  const handleAdd = async () => {
    if (!selectedId || caseIds.length === 0) return;
    setSaving(true);
    try {
      if (mode === 'cycle') {
        await addToCycle.mutateAsync({ cycle_id: selectedId, case_ids: caseIds });
      } else {
        const rows = caseIds.map((id, i) => ({ test_set_id: selectedId, test_case_id: id, sort_order: i }));
        const { error } = await (supabase.from('tm_set_cases') as never as { insert: (r: unknown) => Promise<{ error: { message: string } | null }> }).insert(rows);
        if (error) throw new Error(error.message);
        catalystToast.success(`Added ${caseIds.length} case${caseIds.length > 1 ? 's' : ''} to set`);
      }
      onDone?.();
      onClose();
    } catch (e) {
      catalystToast.error(e instanceof Error ? e.message : 'Failed to add cases');
    } finally {
      setSaving(false);
    }
  };

  const noun = mode === 'cycle' ? 'cycle' : 'set';

  return (
    <ModalDialog onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>Add {caseIds.length} case{caseIds.length > 1 ? 's' : ''} to a {noun}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--ds-space-100)',
          border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-border-radius)',
          padding: 'var(--ds-space-075) var(--ds-space-150)', marginBottom: 'var(--ds-space-150)',
        }}>
          <Search size={16} style={{ color: 'var(--ds-text-subtlest)', flexShrink: 0 }} />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Find a ${noun}…`}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)', color: 'var(--ds-text)',
            }}
          />
        </div>

        {loading ? (
          <div style={{ padding: 'var(--ds-space-300)', display: 'flex', justifyContent: 'center' }}><Spinner /></div>
        ) : items.length === 0 ? (
          <div style={{ padding: 'var(--ds-space-300)', textAlign: 'center', color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)' }}>
            No {noun}s found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-025)', maxHeight: 320, overflowY: 'auto' }}>
            {items.map(it => {
              const sel = selectedId === it.id;
              return (
                <div
                  key={it.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(it.id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedId(it.id); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: 'var(--ds-space-100) var(--ds-space-150)', cursor: 'pointer',
                    borderRadius: 'var(--ds-border-radius)',
                    border: sel ? '1px solid var(--ds-border-selected)' : '1px solid transparent',
                    background: sel ? 'var(--ds-background-selected)' : 'transparent',
                  }}
                >
                  <span style={{
                    fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)',
                    color: sel ? 'var(--ds-text-selected)' : 'var(--ds-text)', fontWeight: 500,
                  }}>
                    {it.name}
                  </span>
                  {it.meta && <Lozenge>{String(it.meta).replace(/_/g, ' ')}</Lozenge>}
                </div>
              );
            })}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--ds-space-050) var(--ds-space-150)', fontWeight: 500, color: 'var(--ds-text-subtle)' }}
        >
          Cancel
        </button>
        <button
          onClick={handleAdd}
          disabled={!selectedId || saving}
          style={{
            padding: 'var(--ds-space-050) var(--ds-space-200)', borderRadius: 'var(--ds-border-radius)', border: 'none', fontWeight: 600,
            cursor: !selectedId || saving ? 'not-allowed' : 'pointer',
            background: !selectedId || saving ? 'var(--ds-background-disabled)' : 'var(--ds-background-brand-bold)',
            color: !selectedId || saving ? 'var(--ds-text-disabled)' : 'var(--ds-text-inverse)',
          }}
        >
          {saving ? 'Adding…' : `Add to ${noun}`}
        </button>
      </ModalFooter>
    </ModalDialog>
  );
}
