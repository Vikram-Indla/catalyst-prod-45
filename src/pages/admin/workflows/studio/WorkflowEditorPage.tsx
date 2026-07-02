/**
 * Workflow Studio editor — diagram-first editing of a ph_wf_* version
 * (CAT-WORKFLOW-STUDIO-20260702-001, P2.2).
 *
 * Drafts are fully editable: add statuses, drag handle→handle to create
 * transitions, click × on an edge to delete it, drag nodes to arrange (layout
 * persists on the draft). Published/superseded versions render read-only with
 * a "Create draft" escape hatch. Every mutation goes through the P1 RPCs, so
 * the published workflow stays enforced until an explicit publish.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnConnect,
  type NodeChange,
  MarkerType,
} from '@xyflow/react';
// ads-scanner:ignore-next-line — @xyflow/react requires its base stylesheet (same pattern as CatalystWorkflowBuilder)
import '@xyflow/react/dist/style.css';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AtlaskitPageShell } from '@/components/ads/AtlaskitPageShell';
import {
  Button,
  EmptyState,
  Lozenge,
  SectionMessage,
  Select,
  Spinner,
  Textfield,
} from '@/components/ads';
import {
  NODE_TYPES,
  EDGE_TYPES,
  autoLayout,
} from '@/pages/admin/workflows/CatalystWorkflowBuilder';
import {
  useWfVersions,
  useWfVersionStatuses,
  useWfVersionTransitions,
} from '@/hooks/workflow-v2/useWorkflowFoundation';
import {
  useCreateDraft,
  useDeleteDraftTransition,
  useDiscardDraft,
  useSaveDraftLayout,
  useUpsertDraftStatus,
  useUpsertDraftTransition,
} from '@/hooks/workflow-v2/useWorkflowDraft';
import { ENTITY_LABELS, LIFECYCLE_APPEARANCE, statusKeyFromLabel } from './entities';
import { PublishModal } from './PublishModal';

const CATEGORY_OPTIONS = [
  { label: 'To do', value: 'todo' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Done', value: 'done' },
];

export default function WorkflowEditorPage() {
  const { versionId } = useParams<{ versionId: string }>();
  const navigate = useNavigate();

  const versionsQuery = useWfVersions();
  const statusesQuery = useWfVersionStatuses(versionId ?? null);
  const transitionsQuery = useWfVersionTransitions(versionId ?? null);

  const version = (versionsQuery.data ?? []).find((v) => v.id === versionId) ?? null;
  const isDraft = version?.lifecycle === 'draft';

  const upsertStatus = useUpsertDraftStatus(versionId ?? '');
  const upsertTransition = useUpsertDraftTransition(versionId ?? '');
  const deleteTransition = useDeleteDraftTransition(versionId ?? '');
  const saveLayout = useSaveDraftLayout();
  const discardDraft = useDiscardDraft();
  const createDraft = useCreateDraft();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [addingStatus, setAddingStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusCat, setNewStatusCat] = useState('todo');

  const onError = useCallback((e: unknown) => setActionError((e as Error).message), []);

  // Debounced layout persistence — collect positions after drag stops.
  const layoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodesRef = useRef<Node[]>([]);
  nodesRef.current = nodes;
  const scheduleLayoutSave = useCallback(() => {
    if (!isDraft || !versionId) return;
    if (layoutTimer.current) clearTimeout(layoutTimer.current);
    layoutTimer.current = setTimeout(() => {
      const layout: Record<string, { x: number; y: number }> = {};
      for (const n of nodesRef.current) {
        if (n.type === 'status') layout[n.id] = { x: n.position.x, y: n.position.y };
      }
      saveLayout.mutate({ versionId, layout });
    }, 800);
  }, [isDraft, versionId, saveLayout]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes as never);
      if (changes.some((c) => c.type === 'position' && c.dragging === false)) {
        scheduleLayoutSave();
      }
    },
    [onNodesChange, scheduleLayoutSave]
  );

  const statuses = statusesQuery.data ?? [];
  const transitions = transitionsQuery.data ?? [];
  const globalIn = useMemo(
    () => transitions.filter((t) => t.from_status_key === null),
    [transitions]
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      deleteTransition.mutate(edgeId, { onError });
    },
    [deleteTransition, onError]
  );

  // Build the graph whenever data changes.
  useEffect(() => {
    if (!version || !statuses.length) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const savedLayout = (version.layout ?? null) as Record<string, { x: number; y: number }> | null;
    const fallback = autoLayout(
      statuses.map((s) => ({ id: s.status_key })),
      transitions
        .filter((t) => t.from_status_key !== null)
        .map((t) => ({ from_status_id: t.from_status_key, to_status_id: t.to_status_key })),
      statuses.find((s) => s.is_initial)?.status_key ?? null
    );

    const initialKey = statuses.find((s) => s.is_initial)?.status_key ?? null;
    const firstPos = initialKey
      ? savedLayout?.[initialKey] ?? fallback.get(initialKey)
      : undefined;

    const statusNodes: Node[] = statuses.map((s) => ({
      id: s.status_key,
      type: 'status',
      position: savedLayout?.[s.status_key] ?? fallback.get(s.status_key) ?? { x: 0, y: 0 },
      draggable: isDraft,
      data: {
        name: s.display_label,
        category: s.category,
        isInitial: s.is_initial,
        readonly: !isDraft,
      },
    }));

    const startNode: Node = {
      id: '__start__',
      type: 'start',
      position: { x: (firstPos?.x ?? 0) + 56, y: (firstPos?.y ?? 0) - 110 },
      draggable: false,
      data: {},
    };

    const startEdge: Edge[] = initialKey
      ? [
          {
            id: '__start-edge__',
            source: '__start__',
            target: initialKey,
            type: 'smoothstep',
            style: { stroke: 'var(--ds-border-bold)', strokeDasharray: '4 3' },
            markerEnd: { type: MarkerType.ArrowClosed },
          },
        ]
      : [];

    const transitionEdges: Edge[] = transitions
      .filter((t) => t.from_status_key !== null)
      .map((t) => ({
        id: t.id,
        source: t.from_status_key as string,
        target: t.to_status_key,
        type: 'deletable',
        markerEnd: { type: MarkerType.ArrowClosed },
        data: isDraft ? { onDelete: handleDeleteEdge } : {},
      }));

    setNodes([startNode, ...statusNodes]);
    setEdges([...startEdge, ...transitionEdges]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version?.id, version?.lifecycle, statusesQuery.dataUpdatedAt, transitionsQuery.dataUpdatedAt]);

  const onConnect: OnConnect = useCallback(
    (conn) => {
      if (!isDraft || !conn.source || !conn.target) return;
      if (conn.source === '__start__' || conn.target === '__start__') return;
      if (conn.source === conn.target) return;
      upsertTransition.mutate(
        { from_status_key: conn.source, to_status_key: conn.target },
        { onError }
      );
    },
    [isDraft, upsertTransition, onError]
  );

  const submitAddStatus = () => {
    const label = newStatusName.trim();
    if (!label) return;
    upsertStatus.mutate(
      {
        status_key: statusKeyFromLabel(label),
        display_label: label,
        category: newStatusCat as 'todo' | 'in_progress' | 'done',
        sort_order: statuses.length * 10,
        is_initial: statuses.length === 0,
      },
      {
        onSuccess: () => {
          setNewStatusName('');
          setAddingStatus(false);
        },
        onError,
      }
    );
  };

  // ── Load / error states ────────────────────────────────────────────────────
  const loadError = versionsQuery.error ?? statusesQuery.error ?? transitionsQuery.error;
  const loading = versionsQuery.isLoading || statusesQuery.isLoading || transitionsQuery.isLoading;

  const entityLabel = version ? ENTITY_LABELS[version.entity_key] ?? version.entity_key : '';

  return (
    <AdminGuard>
      <AtlaskitPageShell
        flush
        constrainHeight
        title={
          version ? `${entityLabel} · v${version.version_no}` : 'Workflow editor'
        }
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {version && (
              <Lozenge appearance={LIFECYCLE_APPEARANCE[version.lifecycle] ?? 'default'}>
                {version.lifecycle}
              </Lozenge>
            )}
            {globalIn.length > 0 && (
              <Lozenge appearance="new">{globalIn.length} any-status transitions</Lozenge>
            )}
            {isDraft && version && (
              <>
                <Button
                  appearance="subtle"
                  spacing="compact"
                  onClick={() =>
                    discardDraft.mutate(version.id, {
                      onSuccess: () => navigate('/admin/workflows'),
                      onError,
                    })
                  }
                >
                  Discard
                </Button>
                <Button appearance="primary" spacing="compact" onClick={() => setPublishOpen(true)}>
                  Publish…
                </Button>
              </>
            )}
            {!isDraft && version && version.lifecycle !== 'archived' && (
              <Button
                appearance="primary"
                spacing="compact"
                isDisabled={createDraft.isPending}
                onClick={() =>
                  createDraft.mutate(
                    { fromVersionId: version.id },
                    { onSuccess: (id) => navigate(`/admin/workflows/${id}/edit`), onError }
                  )
                }
              >
                {createDraft.isPending ? 'Creating…' : 'Create draft to edit'}
              </Button>
            )}
            <Link
              to="/admin/workflows"
              style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-brand)' }}
            >
              ← Studio
            </Link>
          </div>
        }
        testId="workflow-editor"
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {actionError && (
            <div style={{ padding: '8px 16px' }}>
              <SectionMessage
                appearance="error"
                title="Action failed"
                actions={[{ key: 'x', text: 'Dismiss', onClick: () => setActionError(null) }]}
              >
                {actionError}
              </SectionMessage>
            </div>
          )}

          {/* Toolbar (drafts only) */}
          {isDraft && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderBottom: '1px solid var(--ds-border)',
                flexShrink: 0,
              }}
            >
              {addingStatus ? (
                <>
                  <div style={{ width: 140 }}>
                    <Select
                      options={CATEGORY_OPTIONS}
                      value={newStatusCat}
                      onChange={(v) => setNewStatusCat((v as string) ?? 'todo')}
                      ariaLabel="Status category"
                    />
                  </div>
                  <div style={{ width: 220 }}>
                    <Textfield
                      value={newStatusName}
                      onChange={(e) => setNewStatusName((e.target as HTMLInputElement).value)}
                      placeholder="Status name…"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitAddStatus();
                        if (e.key === 'Escape') setAddingStatus(false);
                      }}
                    />
                  </div>
                  <Button appearance="primary" spacing="compact" onClick={submitAddStatus}>
                    Add
                  </Button>
                  <Button appearance="subtle" spacing="compact" onClick={() => setAddingStatus(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button spacing="compact" onClick={() => setAddingStatus(true)}>
                  + Add status
                </Button>
              )}
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
                Drag handles to connect statuses · click a transition's × to delete ·{' '}
                {statuses.length} statuses · {transitions.length} transitions
              </span>
            </div>
          )}

          {/* Canvas — explicit min height guards against a broken flex chain
              (ReactFlow renders 0-height silently otherwise). */}
          <div
            style={{
              flex: 1,
              minHeight: 'calc(100vh - 220px)',
              background: 'var(--ds-surface-sunken)',
            }}
          >
            {loadError ? (
              <div style={{ padding: '16px', maxWidth: 720 }}>
                <SectionMessage
                  appearance="error"
                  title="Couldn't load this workflow version"
                  actions={[
                    {
                      key: 'retry',
                      text: 'Retry',
                      onClick: () => {
                        versionsQuery.refetch();
                        statusesQuery.refetch();
                        transitionsQuery.refetch();
                      },
                    },
                  ]}
                >
                  {(loadError as Error).message}
                </SectionMessage>
              </div>
            ) : loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
                <Spinner size="large" />
              </div>
            ) : !version ? (
              <div style={{ padding: 16 }}>
                <EmptyState
                  header="Version not found"
                  description="It may have been discarded. Go back to the Studio to pick another."
                />
              </div>
            ) : statuses.length === 0 && !isDraft ? (
              <div style={{ padding: 16 }}>
                <EmptyState
                  header="This version has no statuses"
                  description="Create a draft and add statuses to shape the workflow."
                />
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={NODE_TYPES}
                edgeTypes={EDGE_TYPES}
                onNodesChange={handleNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodesConnectable={isDraft}
                elementsSelectable
                fitView
                // ads-scanner:ignore-next-line — padding here is a viewport fraction (ReactFlow API), not px spacing
                fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={16} color="var(--ds-border)" />
                <Controls showInteractive={false} />
                <MiniMap pannable zoomable style={{ background: 'var(--ds-surface)' }} />
              </ReactFlow>
            )}
          </div>
        </div>

        {publishOpen && version && (
          <PublishModal
            version={version}
            onClose={() => setPublishOpen(false)}
            onPublished={() => navigate('/admin/workflows')}
          />
        )}
      </AtlaskitPageShell>
    </AdminGuard>
  );
}
