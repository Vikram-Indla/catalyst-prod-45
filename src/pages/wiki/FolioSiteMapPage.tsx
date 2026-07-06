/**
 * FolioSiteMapPage — /folio/sitemap (design-critique R3, Vikram 2026-07-06:
 * "a very rich canvas where you can see seven to eight levels").
 * @xyflow/react pan/zoom canvas: workspace roots → page nodes (unlimited
 * parent_id depth) → linked work-item leaf nodes with their type icons.
 * Click any node to open it. Minimap + zoom controls included.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Routes } from '@/lib/routes';
import { useWikiWorkspaces } from '@/hooks/useWiki';
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
  linked: Array<{ key: string; type: string }>;
}

function useSiteMapDocs() {
  return useQuery({
    queryKey: ['folio', 'sitemap', 'v2'],
    staleTime: 0,
    queryFn: async (): Promise<MapDoc[]> => {
      const { data, error } = await db
        .from('kb_documents')
        .select('id, space_id, title, slug, icon, doc_key, parent_id, position')
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

export default function FolioSiteMapPage() {
  const navigate = useNavigate();
  const { data: workspaces } = useWikiWorkspaces();
  const { data: docs, isLoading } = useSiteMapDocs();

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let row = 0;

    const byWs = new Map<string, MapDoc[]>();
    for (const d of docs ?? []) byWs.set(d.space_id, [...(byWs.get(d.space_id) ?? []), d]);

    for (const ws of workspaces ?? []) {
      const wsDocs = byWs.get(ws.id) ?? [];
      if (!wsDocs.length) continue; // keep the canvas dense — empty workspaces live in the sidebar
      const wsNodeId = `ws-${ws.id}`;
      const wsRow = row;
      nodes.push({
        id: wsNodeId,
        position: { x: 0, y: wsRow * ROW_H },
        data: {
          href: Routes.folio.workspace(ws.slug),
          label: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <img src={HUB_ICON_REGISTRY.docex} alt="" width={16} height={16} />
              <span style={{ fontWeight: 600 }}>{ws.name}</span>
            </span>
          ),
        },
        style: { ...nodeBase, background: 'var(--ds-background-selected)', borderColor: 'var(--ds-border-focused)' },
        sourcePosition: 'right' as never,
        targetPosition: 'left' as never,
      });

      const byParent = new Map<string | null, MapDoc[]>();
      for (const d of wsDocs) byParent.set(d.parent_id, [...(byParent.get(d.parent_id) ?? []), d]);

      const walk = (parentNodeId: string, parentId: string | null, depth: number) => {
        for (const d of byParent.get(parentId) ?? []) {
          const nodeId = `doc-${d.id}`;
          nodes.push({
            id: nodeId,
            position: { x: depth * COL_W, y: row * ROW_H },
            data: {
              href: Routes.folio.page(ws.slug, d.slug),
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: 216 }}>
                  <span aria-hidden>{d.icon || '📄'}</span>
                  <span dir="auto" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {d.title || 'Untitled'}
                  </span>
                  <span style={{ color: 'var(--ds-text-subtle)', flexShrink: 0 }}>{d.doc_key ?? ''}</span>
                </span>
              ),
            },
            style: nodeBase,
            sourcePosition: 'right' as never,
            targetPosition: 'left' as never,
          });
          edges.push({ id: `e-${parentNodeId}-${nodeId}`, source: parentNodeId, target: nodeId });
          row += 1;
          // Linked work items — leaf nodes with the canonical type icon.
          for (const l of d.linked ?? []) {
            const wiId = `wi-${d.id}-${l.key}`;
            nodes.push({
              id: wiId,
              position: { x: (depth + 1) * COL_W, y: (row - 1) * ROW_H + 6 },
              data: {
                href: `/browse/${l.key}`,
                label: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {l.type ? <JiraIssueTypeIcon type={l.type} size={16} /> : null}
                    <span style={{ color: 'var(--ds-text-subtle)' }}>{l.key}</span>
                  </span>
                ),
              },
              style: { ...nodeBase, width: 150, padding: '4px 10px', background: 'var(--ds-surface)' },
              targetPosition: 'left' as never,
            });
            edges.push({ id: `e-${nodeId}-${wiId}`, source: nodeId, target: wiId, style: { strokeDasharray: '4 4' } });
            row += 1;
          }
          walk(nodeId, d.id, depth + 1);
        }
      };
      walk(wsNodeId, null, 1);
      if (row === wsRow) row += 1;
      row += 1; // spacer between workspace clusters
    }
    return { nodes, edges };
  }, [workspaces, docs]);

  return (
    <div style={{ width: '100%', padding: '16px 32px 24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      <ProjectPageHeader hubType="folio" paddingX={0} title="Site map" />
      <div style={{ flex: 1, minHeight: 420, border: '1px solid var(--ds-border)', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
        {isLoading ? (
          <Skeleton style={{ height: '100%', borderRadius: 8 }} />
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            minZoom={0.1}
            nodesDraggable={false}
            nodesConnectable={false}
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_, node) => {
              const href = (node.data as { href?: string })?.href;
              if (href) navigate(href);
            }}
          >
            <Background gap={24} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
