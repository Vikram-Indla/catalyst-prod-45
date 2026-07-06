/**
 * Release Operations — SOP Templates list (route /release-hub/sop-templates)
 *
 * Phase 4 upgrade: rich reusable-runbook list — step/mandatory/technical/
 * evidence/rollback counts, estimated duration, active state, search + filters
 * (env / category / active), and activate/deactivate + edit actions. Templates
 * are applied to a change as executable rh_sop_steps from the Change SOP tab.
 */
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, ListChecks, Search } from '@/lib/atlaskit-icons';
import { useSopTemplatesFull, useSetTemplateActive, type SopTemplateFull } from '@/hooks/useSopRunbook';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { EmptyState, ErrorState } from '@/components/releasehub/EmptyState';
import { CreateSopTemplateModal } from '@/components/releasehub/CreateSopTemplateModal';
import { FacetFilterBar, type Facet } from '@/components/releasehub/FacetFilterBar';
import { useReleaseOpsPermissions } from '@/hooks/useReleaseOpsPermissions';
import { catalystToast } from '@/lib/catalystToast';
import { RH } from '@/constants/releasehub.design';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';

const T = {
  surface: 'var(--ds-surface)', card: 'var(--ds-surface-raised)', border: 'var(--ds-border)',
  text: 'var(--ds-text)', subtle: 'var(--ds-text-subtle)', subtlest: 'var(--ds-text-subtlest)',
  success: 'var(--ds-text-success)', warning: 'var(--ds-text-warning)', mono: 'var(--ds-font-family-code, monospace)',
};
const titleCase = (v: string | null) => (!v ? '—' : v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' '));

export default function SopTemplatesPage() {
  const { data: templates = [], isLoading, error, refetch } = useSopTemplatesFull();
  const setActive = useSetTemplateActive();
  const { canManage } = useReleaseOpsPermissions();
  const [showCreate, setShowCreate] = useState(false);
  const [editTemplate, setEditTemplate] = useState<SopTemplateFull | null>(null);
  const [search, setSearch] = useState('');
  const [facetValue, setFacetValue] = useState<Record<string, string[]>>({});

  const facets: Facet[] = useMemo(() => {
    const distinct = (pick: (t: SopTemplateFull) => string | null) => {
      const set = new Set<string>();
      templates.forEach((t) => { const v = pick(t); if (v) set.add(v); });
      return [...set].sort().map((v) => ({ id: v, label: titleCase(v) }));
    };
    return [
      { id: 'targetEnv', label: 'Environment', options: distinct((t) => t.targetEnv) },
      { id: 'deploymentCategory', label: 'Category', options: distinct((t) => t.deploymentCategory) },
      { id: 'active', label: 'State', options: [{ id: 'active', label: 'Active' }, { id: 'inactive', label: 'Inactive' }] },
    ];
  }, [templates]);

  const filtered = useMemo(() => templates.filter((t) => {
    if (search && !`${t.name} ${t.description ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    for (const [fid, ids] of Object.entries(facetValue)) {
      if (ids.length === 0) continue;
      if (fid === 'active') { const s = t.isActive ? 'active' : 'inactive'; if (!ids.includes(s)) return false; }
      else { const v = (t as any)[fid] as string | null; if (!v || !ids.includes(v)) return false; }
    }
    return true;
  }), [templates, search, facetValue]);

  const columns: Column<SopTemplateFull>[] = useMemo(() => [
    {
      id: 'name', label: 'Template', flex: true, sortable: true,
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text }}>{row.name}</span>
            {!row.isActive && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: T.subtle, background: 'var(--ds-background-neutral)', padding: '0 6px', borderRadius: 3, textTransform: 'uppercase' }}>Inactive</span>}
          </div>
          {row.description && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.description}</span>}
        </div>
      ),
    },
    { id: 'deploymentCategory', label: 'Category', width: 11, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>{titleCase(row.deploymentCategory)}</span> },
    { id: 'targetEnv', label: 'Env', width: 9, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>{titleCase(row.targetEnv)}</span> },
    { id: 'est', label: 'Est.', width: 8, align: 'end', cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>{row.estimatedDurationMinutes ? `${row.estimatedDurationMinutes}m` : '—'}</span> },
    { id: 'steps', label: 'Steps', width: 20, cell: ({ row }) => (
      <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
        <b style={{ color: T.text }}>{row.stepCount}</b> · {row.mandatoryCount} mand · {row.technicalCount} tech · {row.evidenceCount} ev · {row.rollbackCount} rb
      </span>
    ) },
    { id: 'updated', label: 'Updated', width: 11, sortable: true, accessor: (r) => r.updatedAt, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>{row.updatedAt ? format(new Date(row.updatedAt), 'MMM d, yyyy') : '—'}</span> },
    { id: 'actions', label: 'Actions', width: 16, cell: ({ row }) => canManage ? (
      <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setEditTemplate(row)} style={actBtn}>Edit</button>
        <button onClick={() => setActive.mutate({ id: row.id, isActive: !row.isActive }, { onSuccess: () => catalystToast.success(row.isActive ? 'Deactivated' : 'Activated') })} style={actBtn}>{row.isActive ? 'Deactivate' : 'Activate'}</button>
      </div>
    ) : <span style={{ color: T.subtlest }}>—</span> },
  ], [canManage, setActive]);

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      <div style={{ margin: '-24px -24px 0' }}>
        <ProjectPageHeader projectKey="RELEASES" hubType="release" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setShowCreate(true)} disabled={!canManage} style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', borderRadius: 6, border: 'none', cursor: canManage ? 'pointer' : 'not-allowed', opacity: canManage ? 1 : 0.5, background: 'var(--ds-background-brand-bold)', color: 'var(--ds-text-inverse)', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 500 }}>
          <Plus size={14} style={{ color: 'var(--ds-text-inverse)' }} /> New template
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
        <FacetFilterBar facets={facets} value={facetValue} onChange={(fid, ids) => setFacetValue((p) => ({ ...p, [fid]: ids }))} onClear={() => setFacetValue({})} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '48%', transform: 'translateY(-50%)', color: T.subtlest }} />
          <input type="text" placeholder="Search templates…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ height: 32, width: 240, padding: '0 8px 0 32px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', outline: 'none' }} />
        </div>
      </div>

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : !isLoading && templates.length === 0 ? (
        <EmptyState icon={ListChecks} title="No SOP templates yet" subtitle="An SOP Template is a reusable deployment runbook — ordered steps with owners, commits, evidence, timing and rollback. Apply one to a change to generate its executable SOP steps. Production deployments should always have a template." actions={[{ label: '+ New template', onClick: () => setShowCreate(true), variant: 'primary' }]} />
      ) : (
        <JiraTable<SopTemplateFull>
          columns={columns}
          data={filtered}
          getRowId={(r) => r.id}
          onRowClick={(r) => canManage && setEditTemplate(r)}
          isLoading={isLoading}
          rowsPerPage={25}
          showRowCount
          totalRowCount={filtered.length}
          ariaLabel="SOP templates"
        />
      )}

      {showCreate && <CreateSopTemplateModal onClose={() => setShowCreate(false)} />}
      {editTemplate && <CreateSopTemplateModal templateId={editTemplate.id} onClose={() => setEditTemplate(null)} />}
    </div>
  );
}

const actBtn: React.CSSProperties = { height: 26, padding: '0 8px', borderRadius: 6, border: '1px solid var(--ds-border)', background: 'transparent', color: 'var(--ds-text)', cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600 };
