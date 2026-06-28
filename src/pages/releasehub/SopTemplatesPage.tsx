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
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';

const T = {
  surface: 'var(--ds-surface)',
  text: 'var(--ds-text)',
  subtle: 'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
  mono: 'var(--ds-font-family-code, monospace)',
};

function titleCase(v: string | null) {
  if (!v) return '—';
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}

export default function SopTemplatesPage() {
  const { data: templates = [], isLoading, error, refetch } = useSopTemplates();
  const [showCreate, setShowCreate] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());

  const columns: Column<SopTemplateRow>[] = useMemo(() => [
    {
      id: 'name', label: 'Template', flex: true, sortable: true,
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text }}>{row.name}</span>
          {row.description && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.description}</span>}
        </div>
      ),
    },
    { id: 'deployment_category', label: 'Category', width: 14, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>{titleCase(row.deployment_category)}</span> },
    { id: 'target_env', label: 'Env', width: 12, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>{titleCase(row.target_env)}</span> },
    { id: 'steps', label: 'Steps', width: 10, align: 'end', accessor: (r) => r.stepCount, cell: ({ row }) => <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text }}>{row.stepCount}</span> },
    { id: 'updated', label: 'Updated', width: 14, sortable: true, accessor: (r) => r.updated_at, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>{row.updated_at ? format(new Date(row.updated_at), 'MMM d, yyyy') : '—'}</span> },
  ], []);

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      <div style={{ margin: '-24px -24px 0' }}>
        <ProjectPageHeader projectKey="RELEASES" hubType="release" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--ds-background-brand-bold)', color: 'var(--ds-text-inverse)', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 500 }}
        >
          <Plus size={14} style={{ color: 'var(--ds-text-inverse)' }} /> New template
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
          selectable
          selection={selection}
          onSelectionChange={setSelection}
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
