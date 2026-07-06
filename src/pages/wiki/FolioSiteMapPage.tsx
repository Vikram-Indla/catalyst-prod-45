/**
 * FolioSiteMapPage — /folio/sitemap (design-critique F7, Vikram 2026-07-06:
 * "a module called site map where visually we can see the complete
 * hierarchy of the documentation"). Every workspace → nested page tree →
 * linked work items, on one screen.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Breadcrumbs, Heading, Lozenge } from '@/components/ads';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Routes } from '@/lib/routes';
import { useWikiWorkspaces } from '@/hooks/useWiki';
import { HUB_ICON_REGISTRY } from '@/components/icons';

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
  published_at: string | null;
  linked_keys: string[];
}

function useSiteMapDocs() {
  return useQuery({
    queryKey: ['folio', 'sitemap'],
    staleTime: 0,
    queryFn: async (): Promise<MapDoc[]> => {
      const { data, error } = await db
        .from('kb_documents')
        .select('id, space_id, title, slug, icon, doc_key, parent_id, position, published_at')
        .eq('is_template', false)
        .order('position')
        .limit(1000);
      if (error) throw error;
      const rows = (data ?? []) as Array<Omit<MapDoc, 'linked_keys'>>;
      if (!rows.length) return [];
      const { data: links } = await db
        .from('kb_document_links')
        .select('document_id, entity_type, entity_id')
        .in('document_id', rows.map((r) => r.id));
      const linkList = (links ?? []) as Array<{ document_id: string; entity_type: string; entity_id: string }>;
      const issueIds = linkList.filter((l) => l.entity_type !== 'business_request').map((l) => l.entity_id);
      const brIds = linkList.filter((l) => l.entity_type === 'business_request').map((l) => l.entity_id);
      const [issues, brs] = await Promise.all([
        issueIds.length ? db.from('ph_issues').select('id, issue_key').in('id', issueIds) : Promise.resolve({ data: [] }),
        brIds.length ? db.from('business_requests').select('id, request_key').in('id', brIds) : Promise.resolve({ data: [] }),
      ]);
      const keyByEntity = new Map<string, string>();
      for (const i of (issues.data ?? []) as Array<{ id: string; issue_key: string }>) keyByEntity.set(String(i.id), i.issue_key);
      for (const b of (brs.data ?? []) as Array<{ id: string; request_key: string }>) keyByEntity.set(String(b.id), b.request_key);
      const keysByDoc = new Map<string, string[]>();
      for (const l of linkList) {
        const key = keyByEntity.get(String(l.entity_id));
        if (!key) continue;
        keysByDoc.set(l.document_id, [...(keysByDoc.get(l.document_id) ?? []), key]);
      }
      return rows.map((r) => ({ ...r, linked_keys: keysByDoc.get(r.id) ?? [] }));
    },
  });
}

function DocNode({ doc, byParent, wsSlug, depth }: { doc: MapDoc; byParent: Map<string | null, MapDoc[]>; wsSlug: string; depth: number }) {
  const children = byParent.get(doc.id) ?? [];
  return (
    <div style={{ marginInlineStart: depth === 0 ? 0 : 22, borderInlineStart: depth === 0 ? 'none' : '1px solid var(--ds-border)', paddingInlineStart: depth === 0 ? 0 : 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 6 }}>
        <span aria-hidden>{doc.icon || '📄'}</span>
        <Link
          to={Routes.folio.page(wsSlug, doc.slug)}
          dir="auto"
          style={{ color: 'var(--ds-text)', font: 'var(--ds-font-body)', fontWeight: 500, textDecoration: 'none' }}
        >
          {doc.title || 'Untitled'}
        </Link>
        {doc.doc_key ? (
          <span style={{ fontFamily: 'var(--ds-font-family-code)', font: 'var(--ds-font-body-small)', color: 'var(--ds-text-subtle)' }}>
            {doc.doc_key}
          </span>
        ) : null}
        {doc.linked_keys.map((k) => (
          <Lozenge key={k} appearance="inprogress">{k}</Lozenge>
        ))}
        {doc.published_at ? <Lozenge appearance="success">Published</Lozenge> : null}
      </div>
      {children.map((c) => (
        <DocNode key={c.id} doc={c} byParent={byParent} wsSlug={wsSlug} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function FolioSiteMapPage() {
  const { data: workspaces } = useWikiWorkspaces();
  const { data: docs, isLoading } = useSiteMapDocs();

  const byWorkspace = useMemo(() => {
    const m = new Map<string, Map<string | null, MapDoc[]>>();
    for (const d of docs ?? []) {
      const ws = m.get(d.space_id) ?? new Map<string | null, MapDoc[]>();
      ws.set(d.parent_id, [...(ws.get(d.parent_id) ?? []), d]);
      m.set(d.space_id, ws);
    }
    return m;
  }, [docs]);

  return (
    <div style={{ width: '100%', padding: '16px 32px 96px' }}>
      <Breadcrumbs
        items={[
          { key: 'folio', text: 'Folio', href: Routes.folio.root() },
          { key: 'sitemap', text: 'Site map', href: Routes.folio.sitemap() },
        ]}
        aria-label="Hub location"
      />
      <div style={{ margin: '4px 0 20px' }}>
        <Heading size="large">Site map</Heading>
        <p style={{ margin: '2px 0 0', color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body)' }}>
          The complete documentation hierarchy — every workspace, page, and linked work item.
        </p>
      </div>

      {isLoading ? (
        <Skeleton style={{ height: 280, borderRadius: 8 }} />
      ) : (
        (workspaces ?? []).map((ws) => {
          const tree = byWorkspace.get(ws.id);
          return (
            <div
              key={ws.id}
              style={{
                marginBottom: 20,
                border: '1px solid var(--ds-border)',
                borderRadius: 8,
                padding: '12px 16px',
                background: 'var(--ds-surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: tree ? 8 : 0 }}>
                <img src={HUB_ICON_REGISTRY.docex} alt="" width={16} height={16} />
                <Link
                  to={Routes.folio.workspace(ws.slug)}
                  style={{ font: 'var(--ds-font-heading-xsmall)', color: 'var(--ds-text)', textDecoration: 'none' }}
                >
                  {ws.name}
                </Link>
                <span style={{ color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)' }}>
                  {ws.container_type}
                </span>
              </div>
              {tree ? (
                (tree.get(null) ?? []).map((d) => <DocNode key={d.id} doc={d} byParent={tree} wsSlug={ws.slug} depth={0} />)
              ) : (
                <p style={{ margin: 0, color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)' }}>No pages yet.</p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
