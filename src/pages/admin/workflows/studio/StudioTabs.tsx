/**
 * Workflow Studio — Schemes / Statuses / Enforcement / Audit tabs (P2.4).
 * Replaces the interim handoffs to the legacy engine admin page.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  EmptyState,
  Lozenge,
  SectionMessage,
  Select,
  Spinner,
  type SelectOption,
} from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import { usePhProjects } from '@/hooks/useProjects';
import {
  useEnforcementConfig,
  useSetEnforcementMode,
  useWfAuditFiltered,
  useWfSchemeAssignments,
  useWfSchemeEntries,
  useWfSchemes,
  useWfVersions,
  useWfVersionStatuses,
  type WfAudit,
  type EnforcementRow,
} from '@/hooks/workflow-v2/useWorkflowFoundation';
import { useApplyScheme } from '@/hooks/workflow-v2/useWorkflowDraft';
import { ENTITY_GROUPS, ENTITY_LABELS, fmtDate } from './entities';

const tabWrap: React.CSSProperties = { padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 };

function QueryStates({
  isLoading,
  error,
  refetch,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  children: React.ReactNode;
}) {
  if (error) {
    return (
      <SectionMessage
        appearance="error"
        title="Couldn't load this tab"
        actions={[{ key: 'retry', text: 'Retry', onClick: refetch }]}
      >
        {(error as Error).message}
      </SectionMessage>
    );
  }
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spinner size="medium" />
      </div>
    );
  }
  return <>{children}</>;
}

// ── Schemes ──────────────────────────────────────────────────────────────────
export function SchemesTab() {
  const schemes = useWfSchemes();
  const entries = useWfSchemeEntries();
  const assignments = useWfSchemeAssignments();
  const versions = useWfVersions();
  const projects = usePhProjects();
  const applyScheme = useApplyScheme();

  const [applyTarget, setApplyTarget] = useState<{ schemeId: string; project: SelectOption | null } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const versionNo = (id: string) => {
    const v = (versions.data ?? []).find((x) => x.id === id);
    return v ? `v${v.version_no}` : '—';
  };

  const projectOptions: SelectOption[] = ((projects.data as { id: string; key: string; name: string }[] | undefined) ?? []).map(
    (p) => ({ value: p.id, label: `${p.name} (${p.key})` })
  );

  return (
    <div style={tabWrap}>
      {actionError && (
        <SectionMessage
          appearance="error"
          title="Action failed"
          actions={[{ key: 'x', text: 'Dismiss', onClick: () => setActionError(null) }]}
        >
          {actionError}
        </SectionMessage>
      )}
      <QueryStates
        isLoading={schemes.isLoading || entries.isLoading}
        error={schemes.error ?? entries.error}
        refetch={() => {
          schemes.refetch();
          entries.refetch();
        }}
      >
        {(schemes.data ?? []).map((s) => {
          const rows = (entries.data ?? []).filter((e) => e.scheme_id === s.id);
          const assigned = (assignments.data ?? []).filter((a) => a.scheme_id === s.id);
          return (
            <div key={s.id} style={{ border: '1px solid var(--ds-border)', borderRadius: 6, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{s.name}</span>
                {s.is_default && <Lozenge appearance="inprogress">default</Lozenge>}
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', flex: 1 }}>
                  {assigned.length} project{assigned.length === 1 ? '' : 's'} assigned
                </span>
                <Button spacing="compact" onClick={() => setApplyTarget({ schemeId: s.id, project: null })}>
                  Assign to project…
                </Button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {rows.map((e) => (
                  <Lozenge key={e.id} appearance="default">
                    {`${ENTITY_LABELS[e.entity_key] ?? e.entity_key} ${versionNo(e.version_id)}`}
                  </Lozenge>
                ))}
              </div>
              {applyTarget?.schemeId === s.id && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', maxWidth: 480 }}>
                  <div style={{ flex: 1 }}>
                    <Select
                      options={projectOptions}
                      value={applyTarget.project}
                      onChange={(o) => setApplyTarget({ schemeId: s.id, project: o })}
                      placeholder="Pick project…"
                      ariaLabel="Project to assign"
                    />
                  </div>
                  <Button
                    appearance="primary"
                    spacing="compact"
                    isDisabled={!applyTarget.project || applyScheme.isPending}
                    onClick={() =>
                      applyScheme.mutate(
                        { schemeId: s.id, projectId: applyTarget.project!.value as string },
                        {
                          onSuccess: () => setApplyTarget(null),
                          onError: (e) => setActionError((e as Error).message),
                        }
                      )
                    }
                  >
                    Assign
                  </Button>
                  <Button appearance="subtle" spacing="compact" onClick={() => setApplyTarget(null)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {(schemes.data ?? []).length === 0 && (
          <EmptyState header="No schemes" description="Schemes bundle entity workflows for project assignment." />
        )}
      </QueryStates>
    </div>
  );
}

// ── Statuses (published registry per entity) ─────────────────────────────────
function EntityStatuses({ entityKey }: { entityKey: string }) {
  const navigate = useNavigate();
  const versions = useWfVersions();
  const published = (versions.data ?? []).find(
    (v) => v.entity_key === entityKey && v.lifecycle === 'published'
  );
  const statuses = useWfVersionStatuses(published?.id ?? null);

  if (!published) return null;
  return (
    <div style={{ border: '1px solid var(--ds-border)', borderRadius: 6, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 600 }}>{ENTITY_LABELS[entityKey] ?? entityKey}</span>
        <Lozenge appearance="success">v{published.version_no}</Lozenge>
        <span style={{ flex: 1 }} />
        <Button
          appearance="subtle"
          spacing="compact"
          onClick={() => navigate(`/admin/workflows/${published.id}/edit`)}
        >
          Open diagram
        </Button>
      </div>
      {statuses.error ? (
        <SectionMessage appearance="error" title="Couldn't load statuses">
          {(statuses.error as Error).message}
        </SectionMessage>
      ) : statuses.isLoading ? (
        <Spinner size="small" />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(statuses.data ?? []).map((s) => (
            <span key={s.status_key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Lozenge
                appearance={
                  s.category === 'done' ? 'success' : s.category === 'in_progress' ? 'inprogress' : 'default'
                }
              >
                {s.display_label}
              </Lozenge>
              {s.is_initial && (
                <span aria-label="initial" style={{ color: 'var(--ds-icon-warning)', fontSize: 'var(--ds-font-size-100)' }}>
                  ★
                </span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function StatusesTab() {
  return (
    <div style={tabWrap}>
      <SectionMessage appearance="information" title="Statuses live inside workflow versions">
        Statuses are edited in a draft (open the diagram, click a node). This registry shows
        every published workflow's statuses; changes go through draft → publish so live items
        are always remapped safely.
      </SectionMessage>
      {ENTITY_GROUPS.flatMap((g) => g.entities).map((e) => (
        <EntityStatuses key={e.key} entityKey={e.key} />
      ))}
    </div>
  );
}

// ── Enforcement ──────────────────────────────────────────────────────────────
export function EnforcementTab() {
  const config = useEnforcementConfig();
  const setMode = useSetEnforcementMode();
  const [actionError, setActionError] = useState<string | null>(null);

  const columns: Column<EnforcementRow>[] = [
    {
      id: 'project',
      label: 'Project',
      width: 14,
      cell: ({ row }) => <span style={{ fontWeight: 600 }}>{row.project_key ?? '—'}</span>,
    },
    {
      id: 'entity',
      label: 'Entity',
      width: 16,
      cell: ({ row }) => <span>{ENTITY_LABELS[row.entity_key] ?? row.entity_key}</span>,
    },
    {
      id: 'mode',
      label: 'Mode',
      width: 14,
      cell: ({ row }) => (
        <Lozenge appearance={row.mode === 'blocking' ? 'removed' : 'inprogress'}>{row.mode}</Lozenge>
      ),
    },
    {
      id: 'version',
      label: 'Version',
      width: 10,
      cell: ({ row }) => <span>{row.version_no ? `v${row.version_no}` : '—'}</span>,
    },
    {
      id: 'reason',
      label: 'Reason',
      flex: true,
      cell: ({ row }) => <span style={{ color: 'var(--ds-text-subtle)' }}>{row.reason ?? '—'}</span>,
    },
    {
      id: 'toggle',
      label: '',
      width: 16,
      align: 'end',
      cell: ({ row }) => (
        <Button
          spacing="compact"
          isDisabled={setMode.isPending}
          onClick={() =>
            setMode.mutate(
              {
                configId: row.id,
                entityKey: row.entity_key,
                currentMode: row.mode,
                versionId: row.workflow_version_id,
              },
              { onError: (e) => setActionError((e as Error).message) }
            )
          }
        >
          {row.mode === 'blocking' ? 'Switch to advisory' : 'Enable blocking'}
        </Button>
      ),
    },
  ];

  return (
    <div style={tabWrap}>
      <SectionMessage appearance="information" title="Advisory logs, blocking enforces">
        Blocking is refused while the version carries blocking guards without an evidence
        source (the pre-flight lists them).
      </SectionMessage>
      {actionError && (
        <SectionMessage
          appearance="error"
          title="Toggle refused"
          actions={[{ key: 'x', text: 'Dismiss', onClick: () => setActionError(null) }]}
        >
          {actionError}
        </SectionMessage>
      )}
      <QueryStates isLoading={config.isLoading} error={config.error} refetch={() => config.refetch()}>
        {(config.data ?? []).length === 0 ? (
          <EmptyState header="No enforcement rows" description="Enforcement is configured per project + entity." />
        ) : (
          <JiraTable<EnforcementRow>
            columns={columns}
            data={config.data ?? []}
            getRowId={(r) => r.id}
            density="compact"
            ariaLabel="Enforcement configuration"
          />
        )}
      </QueryStates>
    </div>
  );
}

// ── Audit ────────────────────────────────────────────────────────────────────
const MODE_OPTIONS: SelectOption[] = [
  { value: '', label: 'All modes' },
  { value: 'advisory', label: 'Advisory' },
  { value: 'blocking', label: 'Blocking' },
];

export function AuditTab() {
  const [entity, setEntity] = useState<SelectOption | null>(null);
  const [mode, setMode] = useState<SelectOption | null>(null);
  const audit = useWfAuditFiltered({
    entityKey: (entity?.value as string) || undefined,
    mode: (mode?.value as string) || undefined,
    limit: 100,
  });

  const entityOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'All entities' },
      ...ENTITY_GROUPS.flatMap((g) => g.entities).map((e) => ({ value: e.key, label: e.label })),
    ],
    []
  );

  const columns: Column<WfAudit>[] = [
    { id: 'at', label: 'When', width: 12, cell: ({ row }) => <span>{fmtDate(row.at)}</span> },
    {
      id: 'entity',
      label: 'Entity',
      width: 12,
      cell: ({ row }) => <span>{ENTITY_LABELS[row.entity_key] ?? row.entity_key}</span>,
    },
    {
      id: 'change',
      label: 'Change',
      flex: true,
      cell: ({ row }) => (
        <span>
          {row.from_status_key ?? '—'} → <b>{row.to_status_key}</b>
        </span>
      ),
    },
    {
      id: 'decision',
      label: 'Decision',
      width: 10,
      cell: ({ row }) => (
        <Lozenge appearance={row.role_decision === 'deny' ? 'removed' : 'success'}>{row.role_decision}</Lozenge>
      ),
    },
    {
      id: 'mode',
      label: 'Mode',
      width: 10,
      cell: ({ row }) => (
        <Lozenge appearance={row.mode === 'blocking' ? 'removed' : 'inprogress'}>{row.mode}</Lozenge>
      ),
    },
    {
      id: 'surface',
      label: 'Surface',
      width: 14,
      cell: ({ row }) => <span style={{ color: 'var(--ds-text-subtle)' }}>{row.source_surface ?? '—'}</span>,
    },
  ];

  return (
    <div style={tabWrap}>
      <div style={{ display: 'flex', gap: 8, maxWidth: 480 }}>
        <div style={{ flex: 1 }}>
          <Select options={entityOptions} value={entity} onChange={setEntity} placeholder="All entities" ariaLabel="Filter entity" />
        </div>
        <div style={{ flex: 1 }}>
          <Select options={MODE_OPTIONS} value={mode} onChange={setMode} placeholder="All modes" ariaLabel="Filter mode" />
        </div>
      </div>
      <QueryStates isLoading={audit.isLoading} error={audit.error} refetch={() => audit.refetch()}>
        {(audit.data ?? []).length === 0 ? (
          <EmptyState header="No audit rows match" description="Every transition attempt is logged here, allowed or not." />
        ) : (
          <JiraTable<WfAudit>
            columns={columns}
            data={audit.data ?? []}
            getRowId={(r) => r.id}
            density="compact"
            ariaLabel="Workflow audit log"
          />
        )}
      </QueryStates>
    </div>
  );
}
