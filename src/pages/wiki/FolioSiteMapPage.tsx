/**
 * FolioSiteMapPage — /folio/sitemap v2 (design-critique S1-S5 + E2/E3/E5 +
 * W3 + list view, Vikram 2026-07-06).
 *
 * Canvas view: @xyflow/react pan/zoom tree — workspace filter, per-node
 * collapse/expand (+N badges), hover detail card, in-canvas search that
 * highlights matches and dims the rest, staleness heat + orphan lens,
 * theme-aware chrome, deep links (?view&ws&q&lens).
 * List view: canonical JiraTable — pagination, same filters, linked-tickets
 * column with type icons.
 */
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Tabs, { Tab, TabList } from '@atlaskit/tabs';
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Lozenge, Select, Textfield, type SelectOption } from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import { supabase } from '@/integrations/supabase/client';
import { Routes } from '@/lib/routes';
import { useWikiWorkspaces } from '@/hooks/useWiki';
import { useThemeMode } from '@/providers/ThemeProvider';
import { HUB_ICON_REGISTRY } from '@/components/icons';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

const db = supabase as unknown as { from: (t: string) => any };

interface MapDoc {
  id: string;
  space_id: string;
  title: string;
  slug: string;
  icon: string | null;
  doc_key: string | null;
  parent_id: string | null;
  position: number;
  updated_at: string;
  published_at: string | null;
  linked: Array<{ key: string; type: string }>;
}

function useSiteMapDocs() {
  return useQuery({
    queryKey: ['folio', 'sitemap', 'v3'],
    staleTime: 0,
    queryFn: async (): Promise<MapDoc[]> => {
      const { data, error } = await db
        .from('kb_documents')
        .select('id, space_id, title, slug, icon, doc_key, parent_id, position, updated_at, published_at')
        .eq('is_template', false)
        .order('position')
        .limit(1000);
      if (error) throw error;
      const rows = (data ?? []) as Array<Omit<MapDoc, 'linked'>>;
      if (!rows.length) return [];
      const { data: links } = await db
        .from('kb_document_links')
        .select('document_id, entity_type, entity_id')
        .in('document_id', rows.map((r) => r.id));
      const linkList = (links ?? []) as Array<{ document_id: string; entity_type: string; entity_id: string }>;
      const issueIds = linkList.filter((l) => l.entity_type !== 'business_request').map((l) => l.entity_id);
      const brIds = linkList.filter((l) => l.entity_type === 'business_request').map((l) => l.entity_id);
      const [issues, brs] = await Promise.all([
        issueIds.length ? db.from('ph_issues').select('id, issue_key, issue_type').in('id', issueIds) : Promise.resolve({ data: [] }),
        brIds.length ? db.from('business_requests').select('id, request_key').in('id', brIds) : Promise.resolve({ data: [] }),
      ]);
      const byEntity = new Map<string, { key: string; type: string }>();
      for (const i of (issues.data ?? []) as Array<{ id: string; issue_key: string; issue_type: string | null }>)
        byEntity.set(String(i.id), { key: i.issue_key, type: i.issue_type ?? '' });
      for (const b of (brs.data ?? []) as Array<{ id: string; request_key: string }>)
        byEntity.set(String(b.id), { key: b.request_key, type: 'Business Request' });
      const byDoc = new Map<string, Array<{ key: string; type: string }>>();
      for (const l of linkList) {
        const hit = byEntity.get(String(l.entity_id));
        if (!hit) continue;
        byDoc.set(l.document_id, [...(byDoc.get(l.document_id) ?? []), hit]);
      }
      return rows.map((r) => ({ ...r, linked: byDoc.get(r.id) ?? [] }));
    },
  });
}

const COL_W = 300;
const ROW_H = 64;
const DAY = 86400000;

const nodeBase: React.CSSProperties = {
  border: '1px solid var(--ds-border)',
  borderRadius: 8,
  background: 'var(--ds-surface-raised)',
  boxShadow: 'var(--ds-shadow-raised)',
  padding: '8px 12px',
  font: 'var(--ds-font-body-small)',
  color: 'var(--ds-text)',
  width: 240,
};

/** Staleness heat (E2): >90d danger border, >30d warning border. */
function heatBorder(updatedAt: string): string | undefined {
  const age = Date.now() - new Date(updatedAt).getTime();
  if (age > 90 * DAY) return 'var(--ds-border-danger)';
  if (age > 30 * DAY) return 'var(--ds-border-warning, var(--ds-border-bold))';
  return undefined;
}

interface HoverCard {
  x: number;
  y: number;
  doc: MapDoc;
  wsName: string;
  wsSlug: string;
  childCount: number;
}

export default function FolioSiteMapPage() {
  const navigate = useNavigate();
  const { resolvedTheme } = useThemeMode();
  const { data: workspaces } = useWikiWorkspaces();
  const { data: docs, isLoading } = useSiteMapDocs();

  // Deep links (E5): /folio/sitemap?view=list&ws=<slug>&q=<term>&lens=stale
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'list' ? 1 : 0;
  const q = (params.get('q') ?? '').trim().toLowerCase();
  const wsSlugParam = params.get('ws') ?? '';
  const lens = params.get('lens') ?? '';
  const patchParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const wsOptions: SelectOption[] = useMemo(
    () => (workspaces ?? []).map((w) => ({ label: w.name, value: w.slug })),
    [workspaces],
  );
  const lensOptions: SelectOption[] = [
    { label: 'Stale docs', value: 'stale' },
    { label: 'Orphans', value: 'orphans' },
  ];

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapse = (docId: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });

  const [hover, setHover] = useState<HoverCard | null>(null);

  const wsById = useMemo(() => new Map((workspaces ?? []).map((w) => [w.id, w])), [workspaces]);
  const childCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docs ?? []) if (d.parent_id) m.set(d.parent_id, (m.get(d.parent_id) ?? 0) + 1);
    return m;
  }, [docs]);

  const visibleWorkspaces = useMemo(
    () => (workspaces ?? []).filter((w) => !wsSlugParam || w.slug === wsSlugParam),
    [workspaces, wsSlugParam],
  );

  const matches = useMemo(() => {
    if (!q) return null;
    const set = new Set<string>();
    for (const d of docs ?? []) {
      if (
        (d.title || '').toLowerCase().includes(q) ||
        (d.doc_key || '').toLowerCase().includes(q) ||
        d.linked.some((l) => l.key.toLowerCase().includes(q))
      )
        set.add(d.id);
    }
    return set;
  }, [q, docs]);

  const lensFiltered = useMemo(() => {
    let list = docs ?? [];
    if (lens === 'orphans') list = list.filter((d) => d.linked.length === 0 && !(childCount.get(d.id) ?? 0));
    if (lens === 'stale') list = list.filter((d) => Date.now() - new Date(d.updated_at).getTime() > 30 * DAY);
    return list;
  }, [docs, lens, childCount]);

  // ---- Canvas graph ----
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let row = 0;
    const searchActive = !!matches;
    const lensIds = lens ? new Set(lensFiltered.map((d) => d.id)) : null;

    const byWs = new Map<string, MapDoc[]>();
    for (const d of docs ?? []) byWs.set(d.space_id, [...(byWs.get(d.space_id) ?? []), d]);

    for (const ws of visibleWorkspaces) {
      const wsDocs = byWs.get(ws.id) ?? [];
      if (!wsDocs.length) continue;
      const wsNodeId = `ws-${ws.id}`;
      nodes.push({
        id: wsNodeId,
        position: { x: 0, y: row * ROW_H },
        data: { kind: 'ws', href: Routes.folio.workspace(ws.slug) },
        style: { ...nodeBase, background: 'var(--ds-background-selected)', borderColor: 'var(--ds-border-focused)' },
        sourcePosition: 'right' as never,
        targetPosition: 'left' as never,
      });
      (nodes[nodes.length - 1].data as Record<string, unknown>).label = (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <img src={HUB_ICON_REGISTRY.docex} alt="" width={16} height={16} />
          <span style={{ fontWeight: 600 }}>{ws.name}</span>
        </span>
      );

      const byParent = new Map<string | null, MapDoc[]>();
      for (const d of wsDocs) byParent.set(d.parent_id, [...(byParent.get(d.parent_id) ?? []), d]);

      const walk = (parentNodeId: string, parentId: string | null, depth: number) => {
        for (const d of byParent.get(parentId) ?? []) {
          if (lensIds && !lensIds.has(d.id)) continue;
          const kids = childCount.get(d.id) ?? 0;
          // Search auto-expands (S5); otherwise collapsed subtrees are hidden.
          const isCollapsed = !searchActive && collapsed.has(d.id);
          const dim = searchActive && !matches!.has(d.id);
          const hit = searchActive && matches!.has(d.id);
          const nodeId = `doc-${d.id}`;
          nodes.push({
            id: nodeId,
            position: { x: depth * COL_W, y: row * ROW_H },
            data: { kind: 'doc', docId: d.id, hasKids: kids > 0, href: Routes.folio.page(ws.slug, d.slug), wsName: ws.name, wsSlug: ws.slug, childCount: kids },
            style: {
              ...nodeBase,
              opacity: dim ? 0.3 : 1,
              borderColor: hit ? 'var(--ds-border-focused)' : heatBorder(d.updated_at) ?? (nodeBase.border as string).split(' ')[2],
              borderWidth: hit ? 2 : 1,
            },
            sourcePosition: 'right' as never,
            targetPosition: 'left' as never,
          });
          (nodes[nodes.length - 1].data as Record<string, unknown>).doc = d;
          (nodes[nodes.length - 1].data as Record<string, unknown>).label = (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: 216 }}>
              <span aria-hidden>{d.icon || '📄'}</span>
              <span dir="auto" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                {d.title || 'Untitled'}
              </span>
              <span style={{ color: 'var(--ds-text-subtle)', flexShrink: 0 }}>{d.doc_key ?? ''}</span>
              {isCollapsed && kids > 0 ? (
                <span
                  style={{
                    flexShrink: 0,
                    borderRadius: 8,
                    padding: '0 6px',
                    background: 'var(--ds-background-neutral)',
                    color: 'var(--ds-text-subtle)',
                    fontWeight: 600,
                  }}
                >
                  +{kids}
                </span>
              ) : null}
            </span>
          );
          edges.push({ id: `e-${parentNodeId}-${nodeId}`, source: parentNodeId, target: nodeId });
          row += 1;
          if (!isCollapsed) {
            for (const l of d.linked ?? []) {
              const wiId = `wi-${d.id}-${l.key}`;
              nodes.push({
                id: wiId,
                position: { x: (depth + 1) * COL_W, y: (row - 1) * ROW_H + 6 },
                data: { kind: 'wi', href: `/browse/${l.key}` },
                style: { ...nodeBase, width: 150, padding: '4px 10px', background: 'var(--ds-surface)', opacity: dim ? 0.3 : 1 },
                targetPosition: 'left' as never,
              });
              (nodes[nodes.length - 1].data as Record<string, unknown>).label = (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {l.type ? <JiraIssueTypeIcon type={l.type} size={16} /> : null}
                  <span style={{ color: 'var(--ds-text-subtle)' }}>{l.key}</span>
                </span>
              );
              edges.push({ id: `e-${nodeId}-${wiId}`, source: nodeId, target: wiId, style: { strokeDasharray: '4 4' } });
              row += 1;
            }
            walk(nodeId, d.id, depth + 1);
          }
        }
      };
      walk(wsNodeId, null, 1);
      row += 1;
    }
    return { nodes, edges };
  }, [docs, visibleWorkspaces, collapsed, matches, lens, lensFiltered, childCount]);

  // ---- List view (canonical JiraTable, paginated) ----
  const [page, setPage] = useState(1);
  const listRows = useMemo(() => {
    let list = lensFiltered;
    if (wsSlugParam) {
      const ws = (workspaces ?? []).find((w) => w.slug === wsSlugParam);
      list = list.filter((d) => d.space_id === ws?.id);
    }
    if (matches) list = list.filter((d) => matches.has(d.id));
    return list;
  }, [lensFiltered, wsSlugParam, workspaces, matches]);

  const listColumns: Column<MapDoc>[] = useMemo(
    () => [
      {
        id: 'title',
        label: 'Doc name',
        flex: true,
        sortable: true,
        cell: ({ row }) => (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span aria-hidden>{row.icon || '📄'}</span>
            <span dir="auto" style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.title || 'Untitled'}
            </span>
          </span>
        ),
      },
      {
        id: 'doc_key',
        label: 'Key',
        width: 9,
        cell: ({ row }) => (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <img src={HUB_ICON_REGISTRY.docex} alt="" width={14} height={14} />
            <span style={{ fontFamily: 'var(--ds-font-family-code)', color: 'var(--ds-text-subtle)' }}>{row.doc_key ?? '—'}</span>
          </span>
        ),
      },
      {
        id: 'linked',
        label: 'Linked tickets',
        width: 18,
        cell: ({ row }) =>
          row.linked.length ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {row.linked.map((l) => (
                <span key={l.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {l.type ? <JiraIssueTypeIcon type={l.type} size={16} /> : null}
                  <span style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body-small)' }}>{l.key}</span>
                </span>
              ))}
            </span>
          ) : (
            <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>
          ),
      },
      {
        id: 'workspace',
        label: 'Workspace',
        width: 13,
        cell: ({ row }) => <span style={{ color: 'var(--ds-text-subtle)' }}>{wsById.get(row.space_id)?.name ?? '—'}</span>,
      },
      {
        id: 'status',
        label: 'Status',
        width: 9,
        cell: ({ row }) => (
          <Lozenge appearance={row.published_at ? 'success' : 'default'}>{row.published_at ? 'Published' : 'Draft'}</Lozenge>
        ),
      },
      {
        id: 'updated_at',
        label: 'Updated',
        width: 10,
        sortable: true,
        cell: ({ row }) => <span style={{ color: 'var(--ds-text-subtle)' }}>{new Date(row.updated_at).toLocaleDateString()}</span>,
      },
    ],
    [wsById],
  );

  return (
    <div style={{ width: '100%', padding: '16px 32px 24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      <ProjectPageHeader hubType="folio" paddingX={0} title="Site map" />

      {/* Toolbar — view tabs · workspace filter · search · lens · expand controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>
        <Tabs id="sitemap-view" selected={view} onChange={(i) => patchParams({ view: i === 1 ? 'list' : null })}>
          <TabList>
            <Tab>Canvas</Tab>
            <Tab>List</Tab>
          </TabList>
        </Tabs>
        <div style={{ width: 200 }}>
          <Select
            options={wsOptions}
            value={wsOptions.find((o) => o.value === wsSlugParam) ?? null}
            onChange={(o) => patchParams({ ws: o ? String(o.value) : null })}
            placeholder="All workspaces"
            isClearable
            aria-label="Filter by workspace"
          />
        </div>
        <div style={{ width: 240 }}>
          <Textfield
            value={params.get('q') ?? ''}
            onChange={(e) => patchParams({ q: e.target.value || null })}
            placeholder="Search title, DOC-n, or ticket key"
            aria-label="Search site map"
            spacing="compact"
          />
        </div>
        <div style={{ width: 150 }}>
          <Select
            options={lensOptions}
            value={lensOptions.find((o) => o.value === lens) ?? null}
            onChange={(o) => patchParams({ lens: o ? String(o.value) : null })}
            placeholder="Lens"
            isClearable
            isSearchable={false}
            aria-label="Insight lens"
          />
        </div>
        {view === 0 ? (
          <>
            <button type="button" className="folio-toolbar-btn" onClick={() => setCollapsed(new Set())}>
              Expand all
            </button>
            <button
              type="button"
              className="folio-toolbar-btn"
              onClick={() => setCollapsed(new Set((docs ?? []).filter((d) => childCount.get(d.id)).map((d) => d.id)))}
            >
              Collapse all
            </button>
          </>
        ) : null}
        <style>{`
          .folio-toolbar-btn { padding: 6px 12px; border: 1px solid var(--ds-border); border-radius: 6px; background: var(--ds-surface); color: var(--ds-text); font: var(--ds-font-body-small); font-weight: 500; cursor: pointer; }
          .folio-toolbar-btn:hover { background: var(--ds-background-neutral-subtle); }
        `}</style>
      </div>

      {isLoading ? (
        <Skeleton style={{ flex: 1, borderRadius: 8 }} />
      ) : view === 1 ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <JiraTable<MapDoc>
            columns={listColumns}
            data={listRows}
            getRowId={(r) => r.id}
            density="comfortable"
            rowsPerPage={25}
            page={page}
            onPageChange={setPage}
            onRowClick={(d) => {
              const ws = wsById.get(d.space_id);
              if (ws) navigate(Routes.folio.page(ws.slug, d.slug));
            }}
            showRowCount
            totalRowCount={listRows.length}
            emptyView={
              <p style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body)', padding: 32, margin: 0 }}>
                No documents match these filters.
              </p>
            }
          />
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 420, border: '1px solid var(--ds-border)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            minZoom={0.1}
            colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
            nodesDraggable={false}
            nodesConnectable={false}
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_, node) => {
              const d = node.data as { kind?: string; docId?: string; hasKids?: boolean; href?: string };
              // S2: click a parent toggles its subtree; leaves navigate.
              if (d.kind === 'doc' && d.hasKids && d.docId) toggleCollapse(d.docId);
              else if (d.href) navigate(d.href);
            }}
            onNodeMouseEnter={(e, node) => {
              const d = node.data as { kind?: string; doc?: MapDoc; wsName?: string; wsSlug?: string; childCount?: number };
              if (d.kind === 'doc' && d.doc) {
                setHover({
                  x: Math.min(e.clientX + 14, window.innerWidth - 320),
                  y: Math.min(e.clientY + 10, window.innerHeight - 220),
                  doc: d.doc,
                  wsName: d.wsName ?? '',
                  wsSlug: d.wsSlug ?? '',
                  childCount: d.childCount ?? 0,
                });
              }
            }}
            onNodeMouseLeave={() => setHover(null)}
          >
            <Background gap={24} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable />
          </ReactFlow>

          {/* S4 — hover detail card */}
          {hover ? (
            <div
              style={{
                position: 'fixed',
                left: hover.x,
                top: hover.y,
                zIndex: 60,
                width: 300,
                background: 'var(--ds-surface-overlay)',
                border: '1px solid var(--ds-border)',
                borderRadius: 8,
                boxShadow: 'var(--ds-shadow-overlay)',
                padding: 12,
                pointerEvents: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span aria-hidden>{hover.doc.icon || '📄'}</span>
                <span dir="auto" style={{ font: 'var(--ds-font-body)', fontWeight: 600, color: 'var(--ds-text)' }}>
                  {hover.doc.title || 'Untitled'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--ds-font-family-code)', font: 'var(--ds-font-body-small)', color: 'var(--ds-text-subtle)' }}>
                  {hover.doc.doc_key}
                </span>
                <Lozenge appearance={hover.doc.published_at ? 'success' : 'default'}>
                  {hover.doc.published_at ? 'Published' : 'Draft'}
                </Lozenge>
              </div>
              <p style={{ margin: '0 0 4px', font: 'var(--ds-font-body-small)', color: 'var(--ds-text-subtle)' }}>
                {hover.wsName} · {hover.childCount} sub-page{hover.childCount === 1 ? '' : 's'} · updated{' '}
                {new Date(hover.doc.updated_at).toLocaleDateString()}
              </p>
              {hover.doc.linked.length ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {hover.doc.linked.map((l) => (
                    <span key={l.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {l.type ? <JiraIssueTypeIcon type={l.type} size={16} /> : null}
                      <span style={{ font: 'var(--ds-font-body-small)', color: 'var(--ds-text-subtle)' }}>{l.key}</span>
                    </span>
                  ))}
                </div>
              ) : null}
              <p style={{ margin: '6px 0 0', font: 'var(--ds-font-body-small)', color: 'var(--ds-text-subtlest)' }}>
                Click to {hover.childCount ? 'expand/collapse — leaves open the page' : 'open the page'}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
