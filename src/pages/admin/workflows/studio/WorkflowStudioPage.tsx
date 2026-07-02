/**
 * Workflow Studio — single admin surface for the canonical versioned engine
 * (CAT-WORKFLOW-STUDIO-20260702-001, P2.1 shell).
 *
 * Replaces the fragmented workflow admin entry point at /admin/workflows.
 * Tab 1 (Workflows) is live: grouped entity rail + version list + draft
 * lifecycle actions over the P1 RPCs. The remaining tabs hand off to the
 * engine admin page until P2.4 folds them in. The legacy board/diagram editor
 * stays reachable at /admin/workflows/classic until the P2.2 editor lands.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AtlaskitPageShell } from '@/components/ads/AtlaskitPageShell';
import {
  Button,
  DropdownMenu,
  DropdownItem,
  EmptyState,
  Lozenge,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  SectionMessage,
  Spinner,
} from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import {
  useWfVersions,
  useWfVersionStatuses,
  type WfVersion,
} from '@/hooks/workflow-v2/useWorkflowFoundation';
import {
  useCreateDraft,
  useDiscardDraft,
  usePublishVersion,
  useValidateDraft,
} from '@/hooks/workflow-v2/useWorkflowDraft';

// ── Entity taxonomy (4 groups replace the 17 flat chips) ────────────────────
interface EntityDef {
  key: string;
  label: string;
  readOnly?: boolean; // date-driven lifecycles render, never edit
}
const ENTITY_GROUPS: { label: string; entities: EntityDef[] }[] = [
  {
    label: 'Standard',
    entities: [
      { key: 'story', label: 'Story' },
      { key: 'epic', label: 'Epic' },
      { key: 'feature', label: 'Feature' },
      { key: 'task', label: 'Task' },
    ],
  },
  {
    label: 'QA',
    entities: [
      { key: 'defect', label: 'Defect' },
      { key: 'incident', label: 'Incident' },
    ],
  },
  {
    label: 'Business',
    entities: [
      { key: 'business_request', label: 'Business Request' },
      { key: 'product_milestone', label: 'Milestone' },
      { key: 'release', label: 'Release' },
      { key: 'sprint', label: 'Sprint', readOnly: true },
    ],
  },
  {
    label: 'Subtasks',
    entities: [{ key: 'subtask', label: 'Sub-task' }],
  },
];
const ENTITY_LABELS: Record<string, string> = Object.fromEntries(
  ENTITY_GROUPS.flatMap((g) => g.entities.map((e) => [e.key, e.label]))
);

type VersionRow = WfVersion & { template_name: string | null };

const LIFECYCLE_APPEARANCE: Record<string, 'success' | 'inprogress' | 'default' | 'removed'> = {
  published: 'success',
  draft: 'inprogress',
  superseded: 'default',
  archived: 'removed',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Publish confirmation modal ───────────────────────────────────────────────
function PublishModal({
  version,
  onClose,
}: {
  version: VersionRow;
  onClose: () => void;
}) {
  const validation = useValidateDraft(version.id);
  const publish = usePublishVersion();
  const [publishError, setPublishError] = useState<string | null>(null);

  const issues = validation.data?.issues ?? [];
  const canPublish = validation.data?.ok === true && !publish.isPending;

  return (
    <Modal isOpen onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>
          Publish {ENTITY_LABELS[version.entity_key] ?? version.entity_key} v{version.version_no}
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        {validation.isLoading && <Spinner size="medium" />}
        {validation.isError && (
          <SectionMessage appearance="error" title="Couldn't validate this draft">
            {(validation.error as Error)?.message}
          </SectionMessage>
        )}
        {validation.data?.ok === false && (
          <SectionMessage appearance="warning" title="Fix these before publishing">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {issues.map((i, idx) => (
                <li key={idx}>
                  <code style={{ fontSize: 'var(--ds-font-size-100)' }}>{i.code}</code> — {i.detail}
                </li>
              ))}
            </ul>
          </SectionMessage>
        )}
        {validation.data?.ok === true && !publishError && (
          <p style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-200)' }}>
            Publishing makes this version immutable and the runtime starts enforcing it
            immediately. The current published version is superseded and schemes are
            re-pointed. If this draft removed statuses that live items still use, the
            publish is refused with the list of statuses needing a remap.
          </p>
        )}
        {publishError && (
          <SectionMessage appearance="error" title="Publish refused">
            {publishError}
          </SectionMessage>
        )}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          isDisabled={!canPublish}
          onClick={() =>
            publish.mutate(
              { versionId: version.id },
              {
                onSuccess: onClose,
                onError: (e) => setPublishError((e as Error).message),
              }
            )
          }
        >
          {publish.isPending ? 'Publishing…' : 'Publish'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ── Statuses preview panel (read-only; P2.2 replaces with the editor) ───────
function StatusesPreview({ version }: { version: VersionRow }) {
  const { data, isLoading, isError, error } = useWfVersionStatuses(version.id);
  if (isError || error) {
    return (
      <SectionMessage appearance="error" title="Couldn't load statuses">
        {(error as Error)?.message}
      </SectionMessage>
    );
  }
  if (isLoading) return <Spinner size="small" />;
  if (!data?.length) {
    return (
      <EmptyState
        header="No statuses in this version"
        description="Blank drafts start empty — add statuses in the editor."
      />
    );
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {data.map((s) => (
        <span key={s.status_key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Lozenge
            appearance={
              s.category === 'done' ? 'success' : s.category === 'in_progress' ? 'inprogress' : 'default'
            }
          >
            {s.display_label}
          </Lozenge>
          {s.is_initial && (
            <span
              aria-label="initial status"
              style={{ color: 'var(--ds-icon-warning)', fontSize: 'var(--ds-font-size-100)' }}
            >
              ★
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

// ── Workflows tab ────────────────────────────────────────────────────────────
function WorkflowsTab() {
  const [entityKey, setEntityKey] = useState('story');
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [publishTarget, setPublishTarget] = useState<VersionRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const versionsQuery = useWfVersions();
  const createDraft = useCreateDraft();
  const discardDraft = useDiscardDraft();

  const entityDef = ENTITY_GROUPS.flatMap((g) => g.entities).find((e) => e.key === entityKey);
  const readOnly = entityDef?.readOnly === true;

  const byEntity = useMemo(() => {
    const m = new Map<string, VersionRow[]>();
    for (const v of (versionsQuery.data ?? []) as VersionRow[]) {
      if (!m.has(v.entity_key)) m.set(v.entity_key, []);
      m.get(v.entity_key)!.push(v);
    }
    for (const list of m.values()) list.sort((a, b) => b.version_no - a.version_no);
    return m;
  }, [versionsQuery.data]);

  const rows = byEntity.get(entityKey) ?? [];
  const hasDraft = rows.some((r) => r.lifecycle === 'draft');
  const published = rows.find((r) => r.lifecycle === 'published');
  const previewVersion = rows.find((r) => r.id === previewVersionId) ?? null;

  const onError = (e: unknown) => setActionError((e as Error).message);

  const columns: Column<VersionRow>[] = [
    {
      id: 'version',
      label: 'Version',
      width: 10,
      cell: ({ row }) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>v{row.version_no}</span>,
    },
    {
      id: 'lifecycle',
      label: 'Lifecycle',
      width: 14,
      cell: ({ row }) => (
        <Lozenge appearance={LIFECYCLE_APPEARANCE[row.lifecycle] ?? 'default'}>
          {row.lifecycle}
        </Lozenge>
      ),
    },
    {
      id: 'notes',
      label: 'Notes',
      flex: true,
      cell: ({ row }) => (
        <span style={{ color: 'var(--ds-text-subtle)' }}>{row.notes ?? '—'}</span>
      ),
    },
    {
      id: 'published_at',
      label: 'Published',
      width: 12,
      cell: ({ row }) => <span>{fmtDate(row.published_at)}</span>,
    },
    {
      id: 'created_at',
      label: 'Created',
      width: 12,
      cell: ({ row }) => <span>{fmtDate(row.created_at)}</span>,
    },
    {
      id: 'actions',
      label: '',
      width: 8,
      align: 'end',
      cell: ({ row }) => (
        <DropdownMenu trigger="⋯" ariaLabel={`Actions for v${row.version_no}`}>
          <DropdownItem onClick={() => setPreviewVersionId(row.id)}>View statuses</DropdownItem>
          {!readOnly && row.lifecycle === 'draft' && (
            <>
              <DropdownItem onClick={() => setPublishTarget(row)}>Publish…</DropdownItem>
              <DropdownItem
                onClick={() =>
                  discardDraft.mutate(row.id, { onError })
                }
              >
                Discard draft
              </DropdownItem>
            </>
          )}
          {!readOnly && row.lifecycle !== 'draft' && (
            <DropdownItem
              onClick={() =>
                createDraft.mutate(
                  { fromVersionId: row.id },
                  { onSuccess: (id) => setPreviewVersionId(id), onError }
                )
              }
            >
              {hasDraft ? 'Open existing draft' : 'Create draft from this version'}
            </DropdownItem>
          )}
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, alignItems: 'stretch' }}>
      {/* Rail */}
      <nav
        aria-label="Workflow entities"
        style={{
          width: 210,
          flexShrink: 0,
          borderRight: '1px solid var(--ds-border)',
          padding: '12px 8px',
          overflowY: 'auto',
        }}
      >
        {ENTITY_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 'var(--ds-font-size-100)',
                fontWeight: 600,
                color: 'var(--ds-text-subtlest)',
                padding: '0 8px 4px',
              }}
            >
              {group.label}
            </div>
            {group.entities.map((e) => {
              const list = byEntity.get(e.key) ?? [];
              const pub = list.find((v) => v.lifecycle === 'published');
              const draft = list.some((v) => v.lifecycle === 'draft');
              const selected = e.key === entityKey;
              return (
                <button
                  key={e.key}
                  type="button"
                  onClick={() => {
                    setEntityKey(e.key);
                    setPreviewVersionId(null);
                    setActionError(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 'var(--ds-font-size-200)',
                    fontFamily: 'inherit',
                    background: selected ? 'var(--ds-background-selected)' : 'transparent',
                    color: selected ? 'var(--ds-text-brand)' : 'var(--ds-text)',
                    fontWeight: selected ? 600 : 400,
                  }}
                >
                  <span>{e.label}</span>
                  <span
                    style={{
                      fontSize: 'var(--ds-font-size-100)',
                      color: 'var(--ds-text-subtlest)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {draft ? '◐ ' : ''}
                    {e.readOnly ? 'auto' : pub ? `v${pub.version_no}` : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Version list */}
      <div style={{ flex: 1, minWidth: 0, padding: '12px 16px', overflowY: 'auto' }}>
        {actionError && (
          <div style={{ marginBottom: 12 }}>
            <SectionMessage
              appearance="error"
              title="Action failed"
              actions={[{ key: 'dismiss', text: 'Dismiss', onClick: () => setActionError(null) }]}
            >
              {actionError}
            </SectionMessage>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600 }}>
            {entityDef?.label ?? entityKey}
          </span>
          {readOnly ? (
            <Lozenge appearance="new">system-managed · date-driven</Lozenge>
          ) : (
            <Button
              appearance="primary"
              spacing="compact"
              isDisabled={createDraft.isPending}
              onClick={() =>
                createDraft.mutate(
                  published ? { fromVersionId: published.id } : { entityKey },
                  { onSuccess: (id) => setPreviewVersionId(id), onError }
                )
              }
            >
              {hasDraft ? 'Open draft' : createDraft.isPending ? 'Creating…' : 'Create draft'}
            </Button>
          )}
        </div>

        {versionsQuery.isError || versionsQuery.error ? (
          <SectionMessage
            appearance="error"
            title="Couldn't load workflows"
            actions={[{ key: 'retry', text: 'Retry', onClick: () => versionsQuery.refetch() }]}
          >
            {(versionsQuery.error as Error)?.message}
          </SectionMessage>
        ) : versionsQuery.isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spinner size="medium" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            header={`No workflow versions for ${entityDef?.label ?? entityKey}`}
            description="Create a draft to start defining statuses and transitions."
          />
        ) : (
          <JiraTable<VersionRow>
            columns={columns}
            data={rows}
            getRowId={(r) => r.id}
            onRowClick={(row) => setPreviewVersionId(row.id)}
            density="compact"
            ariaLabel={`${entityDef?.label ?? entityKey} workflow versions`}
          />
        )}

        {previewVersion && (
          <div
            style={{
              marginTop: 16,
              border: '1px solid var(--ds-border)',
              borderRadius: 6,
              padding: '12px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-200)' }}>
                Statuses · v{previewVersion.version_no}
              </span>
              <Lozenge appearance={LIFECYCLE_APPEARANCE[previewVersion.lifecycle] ?? 'default'}>
                {previewVersion.lifecycle}
              </Lozenge>
              <span style={{ flex: 1 }} />
              <Button appearance="subtle" spacing="compact" onClick={() => setPreviewVersionId(null)}>
                Close
              </Button>
            </div>
            <StatusesPreview version={previewVersion} />
            {previewVersion.lifecycle === 'draft' && (
              <p style={{ marginTop: 12, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
                Full status + transition editing lands with the Studio editor (P2.2). Until
                then drafts can be shaped via the classic builder or published as-is.
              </p>
            )}
          </div>
        )}
      </div>

      {publishTarget && <PublishModal version={publishTarget} onClose={() => setPublishTarget(null)} />}
    </div>
  );
}

// ── Interim tab: hands off to the engine admin page until P2.4 ──────────────
function InterimTab({ label, targetTab }: { label: string; targetTab: string }) {
  return (
    <div style={{ padding: '24px 16px', maxWidth: 720 }}>
      <SectionMessage appearance="information" title={`${label} moves into the Studio in an upcoming slice`}>
        <p style={{ marginBottom: 8 }}>
          Until then it is managed on the engine admin page.
        </p>
        <Link to={`/admin/workflows/versions?tab=${targetTab}`} style={{ color: 'var(--ds-text-brand)' }}>
          Open {label} on the engine page →
        </Link>
      </SectionMessage>
    </div>
  );
}

const STUDIO_TABS = [
  { label: 'Workflows' },
  { label: 'Schemes', target: 'schemes' },
  { label: 'Statuses', target: 'statuses' },
  { label: 'Work item types', target: 'statuses' },
  { label: 'Enforcement', target: 'enforcement' },
  { label: 'Audit', target: 'audit' },
];

export default function WorkflowStudioPage() {
  return (
    <AdminGuard>
      <AtlaskitPageShell
        flush
        title="Workflow Studio"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link
              to="/admin/workflows/classic"
              style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-brand)' }}
            >
              Classic builder →
            </Link>
            <Link
              to="/admin/workflows/versions"
              style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-brand)' }}
            >
              Engine admin →
            </Link>
          </div>
        }
        testId="workflow-studio"
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <Tabs id="workflow-studio-tabs">
            <TabList>
              {STUDIO_TABS.map((t) => (
                <Tab key={t.label}>{t.label}</Tab>
              ))}
            </TabList>
            <TabPanel>
              <WorkflowsTab />
            </TabPanel>
            {STUDIO_TABS.slice(1).map((t) => (
              <TabPanel key={t.label}>
                <InterimTab label={t.label} targetTab={t.target as string} />
              </TabPanel>
            ))}
          </Tabs>
        </div>
      </AtlaskitPageShell>
    </AdminGuard>
  );
}
