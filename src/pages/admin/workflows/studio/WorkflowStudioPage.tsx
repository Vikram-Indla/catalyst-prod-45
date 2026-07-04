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
import { Link, useNavigate } from 'react-router-dom';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AtlaskitPageShell } from '@/components/ads/AtlaskitPageShell';
import {
  Button,
  EmptyState,
  CatalystTag,
  Lozenge,
  SectionMessage,
  Spinner,
} from '@/components/ads';
import {
  useWfVersions,
  useWfVersionStatuses,
  useWfVersionTransitions,
  type WfVersion,
} from '@/hooks/workflow-v2/useWorkflowFoundation';
import { useCreateDraft, useDiscardDraft } from '@/hooks/workflow-v2/useWorkflowDraft';
import { ENTITY_GROUPS, LIFECYCLE_APPEARANCE, fmtDate } from './entities';
import { PublishModal } from './PublishModal';
import { AuditTab, EnforcementTab, SchemesTab, StatusesTab } from './StudioTabs';
import { WorkItemTypesTab } from './WorkItemTypesTab';
import { GenerateWorkflowModal } from './GenerateWorkflowModal';
import { HistoryDrawer } from './HistoryDrawer';

type VersionRow = WfVersion & { template_name: string | null };

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

// ── Workflows tab — ONE BASELINE per entity (Vikram directive 2026-07-03) ────
// Version history is an implementation detail: the main pane shows only the
// current baseline (published) + at most one open draft. Superseded/archived
// versions live exclusively in the History drawer. No per-row dropdown menu
// (the @atlaskit/popup detach bug dies with it).
function WorkflowsTab() {
  const navigate = useNavigate();
  const [entityKey, setEntityKey] = useState('story');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState<VersionRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const versionsQuery = useWfVersions();
  const createDraft = useCreateDraft();
  const discardDraft = useDiscardDraft();
  const openEditor = (versionId: string) => navigate(`/admin/workflows/${versionId}/edit`);

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
  const draft = rows.find((r) => r.lifecycle === 'draft') ?? null;
  const published = rows.find((r) => r.lifecycle === 'published') ?? null;

  const onError = (e: unknown) => setActionError((e as Error).message);

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

      {/* Baseline pane */}
      <div style={{ flex: 1, minWidth: 0, padding: 16, overflowY: 'auto' }}>
        {actionError && (
          <div style={{ marginBottom: 16 }}>
            <SectionMessage
              appearance="error"
              title="Action failed"
              actions={[{ key: 'dismiss', text: 'Dismiss', onClick: () => setActionError(null) }]}
            >
              {actionError}
            </SectionMessage>
          </div>
        )}

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
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600 }}>
                {entityDef?.label ?? entityKey} workflow
              </span>
              {readOnly && <Lozenge appearance="new">system-managed · date-driven</Lozenge>}
              <span style={{ flex: 1 }} />
              {!readOnly && (
                <>
                  <Button
                    appearance="primary"
                    isDisabled={createDraft.isPending}
                    onClick={() =>
                      draft
                        ? openEditor(draft.id)
                        : createDraft.mutate(
                            published ? { fromVersionId: published.id } : { entityKey },
                            { onSuccess: (id) => openEditor(id), onError }
                          )
                    }
                  >
                    {createDraft.isPending ? 'Opening…' : 'Edit workflow'}
                  </Button>
                  {draft && (
                    <>
                      <Button appearance="default" onClick={() => setPublishTarget(draft)}>
                        Publish changes…
                      </Button>
                      <Button
                        appearance="subtle"
                        isDisabled={discardDraft.isPending}
                        onClick={() => discardDraft.mutate(draft.id, { onError })}
                      >
                        Discard changes
                      </Button>
                    </>
                  )}
                  <Button appearance="subtle" onClick={() => setHistoryOpen(true)}>
                    History
                  </Button>
                </>
              )}
            </div>

            {/* Baseline card */}
            {published ? (
              <BaselineCard
                baseline={published}
                draft={draft}
                readOnly={readOnly}
                onOpenDiagram={() => openEditor((draft ?? published).id)}
              />
            ) : draft ? (
              <SectionMessage appearance="information" title="No baseline yet — a draft is in progress">
                Publish the draft to establish this entity's baseline workflow.
              </SectionMessage>
            ) : (
              <EmptyState
                header={`No workflow for ${entityDef?.label ?? entityKey}`}
                description="Edit workflow creates the first draft; publish it to set the baseline."
              />
            )}
          </div>
        )}
      </div>

      {publishTarget && <PublishModal version={publishTarget} onClose={() => setPublishTarget(null)} />}
      <HistoryDrawer
        entityKey={entityKey}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onError={onError}
      />
    </div>
  );
}

// One card = the baseline. Statuses shown inline; counts + meta quiet.
function BaselineCard({
  baseline,
  draft,
  readOnly,
  onOpenDiagram,
}: {
  baseline: VersionRow;
  draft: VersionRow | null;
  readOnly: boolean;
  onOpenDiagram: () => void;
}) {
  const statuses = useWfVersionStatuses(baseline.id);
  const transitions = useWfVersionTransitions(baseline.id);
  const meta = [
    statuses.data ? `${statuses.data.length} statuses` : null,
    transitions.data ? `${transitions.data.length} transitions` : null,
    baseline.published_at ? `baseline since ${fmtDate(baseline.published_at)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      style={{
        border: '1px solid var(--ds-border)',
        borderRadius: 6,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 600 }}>{baseline.template_name ?? 'Baseline workflow'}</span>
        {draft && !readOnly && <CatalystTag color="blue" text="unpublished changes" />}
        <span style={{ flex: 1, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
          {meta}
        </span>
        <Button appearance="subtle" spacing="compact" onClick={onOpenDiagram}>
          Open diagram
        </Button>
      </div>
      <StatusesPreview version={baseline} />
    </div>
  );
}

const STUDIO_TABS = [
  'Workflows',
  'Schemes',
  'Statuses',
  'Work item types',
  'Enforcement',
  'Audit',
] as const;

export default function WorkflowStudioPage() {
  const [generateOpen, setGenerateOpen] = useState(false);
  return (
    <AdminGuard>
      <AtlaskitPageShell
        flush
        title="Workflow Studio"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button appearance="primary" spacing="compact" onClick={() => setGenerateOpen(true)}>
              ⚡ Generate with Caty
            </Button>
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
        {/* D6/D7/D8: breathing room above the tab strip + align the tablist and
            every tab panel with the shell title's 24px left inset. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            padding: '12px 24px 0',
          }}
        >
          <Tabs id="workflow-studio-tabs">
            <TabList>
              {STUDIO_TABS.map((t) => (
                <Tab key={t}>{t}</Tab>
              ))}
            </TabList>
            <TabPanel>
              <WorkflowsTab />
            </TabPanel>
            <TabPanel>
              <SchemesTab />
            </TabPanel>
            <TabPanel>
              <StatusesTab />
            </TabPanel>
            <TabPanel>
              <WorkItemTypesTab />
            </TabPanel>
            <TabPanel>
              <EnforcementTab />
            </TabPanel>
            <TabPanel>
              <AuditTab />
            </TabPanel>
          </Tabs>
        </div>
        {generateOpen && <GenerateWorkflowModal onClose={() => setGenerateOpen(false)} />}
      </AtlaskitPageShell>
    </AdminGuard>
  );
}
