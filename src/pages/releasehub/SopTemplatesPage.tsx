/**
 * Release Operations — SOP Templates list (route /release-hub/sop-templates)
 *
 * Phase 9: JiraTable list of reusable SOP templates (rh_sop_templates) +
 * Create template modal. Templates carry ordered steps that are copied into a
 * change as executable rh_sop_steps via the Change detail SOP tab.
 */
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, ListChecks } from '@/lib/atlaskit-icons';
import { useSopTemplates, type SopTemplateRow } from '@/hooks/useReleaseHub';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { EmptyState, ErrorState } from '@/components/releasehub/EmptyState';
import { CreateSopTemplateModal } from '@/components/releasehub/CreateSopTemplateModal';
import { RH } from '@/constants/releasehub.design';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  mono: 'var(--ds-font-family-code, monospace)',
};

function titleCase(v: string | null) {
  if (!v) return '—';
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}

export default function SopTemplatesPage() {
  const { data: templates = [], isLoading, error, refetch } = useSopTemplates();
  const [showCreate, setShowCreate] = useState(false);

  const columns: Column<SopTemplateRow>[] = useMemo(() => [
    {
      id: 'name', label: 'Template', flex: true, sortable: true,
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: RH.fontBody, fontSize: 14, fontWeight: 600, color: T.text }}>{row.name}</span>
          {row.description && <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.description}</span>}
        </div>
      ),
    },
    { id: 'deployment_category', label: 'Category', width: 14, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtle }}>{titleCase(row.deployment_category)}</span> },
    { id: 'target_env', label: 'Env', width: 12, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtle }}>{titleCase(row.target_env)}</span> },
    { id: 'steps', label: 'Steps', width: 10, align: 'end', accessor: (r) => r.stepCount, cell: ({ row }) => <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.text }}>{row.stepCount}</span> },
    { id: 'updated', label: 'Updated', width: 14, sortable: true, accessor: (r) => r.updated_at, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest }}>{row.updated_at ? format(new Date(row.updated_at), 'MMM d, yyyy') : '—'}</span> },
  ], []);

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: RH.fontDisplay, fontSize: 24, fontWeight: 600, color: T.text, margin: 0 }}>SOP Templates</h1>
          <p style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest, margin: '4px 0 0' }}>Reusable deployment procedures applied to changes</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--ds-background-brand-bold, #0C66E4)', color: 'var(--ds-text-inverse, #FFFFFF)', fontFamily: RH.fontBody, fontSize: 14, fontWeight: 500 }}
        >
          <Plus size={14} style={{ color: 'var(--ds-text-inverse, #FFFFFF)' }} /> New template
        </button>
      </div>

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : !isLoading && templates.length === 0 ? (
        <EmptyState icon={ListChecks} title="No SOP templates yet" subtitle="Templates capture the ordered steps a deployment follows, ready to apply to any change." actions={[{ label: '+ New template', onClick: () => setShowCreate(true), variant: 'primary' }]} />
      ) : (
        <JiraTable<SopTemplateRow>
          columns={columns}
          data={templates}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          rowsPerPage={25}
          showRowCount
          totalRowCount={templates.length}
          ariaLabel="SOP templates"
        />
      )}

      {showCreate && <CreateSopTemplateModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
