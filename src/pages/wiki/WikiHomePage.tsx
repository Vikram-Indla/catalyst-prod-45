/**
 * WikiHomePage — global Wiki home (CAT-DOCS-NOTION-20260704-001).
 *
 * The Wiki is a library of workspaces: one per project, one per product,
 * plus a single Organization workspace. A page lives in exactly one
 * workspace; this surface is the aggregated directory over everything
 * the user can see.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, FolderOpen } from '@/lib/atlaskit-icons';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Lozenge } from '@/components/ads';
import { supabase } from '@/integrations/supabase/client';
import { Routes } from '@/lib/routes';
import { useWorkspaceContainerMeta } from '@/hooks/useWiki';
import { ProjectIcon } from '@/components/shared/ProjectIcon';
import { getProductAvatarUrl } from '@/components/icons';

interface WikiWorkspaceRow {
  id: string;
  name: string;
  description: string | null;
  project_id: string | null;
  container_id?: string | null;
  slug?: string | null;
  container_type?: string | null;
  icon?: string | null;
  page_count?: number;
}

const CONTAINER_LABEL: Record<string, string> = {
  project: 'Project',
  product: 'Product',
  organization: 'Organization',
};

export default function WikiHomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: containerMeta } = useWorkspaceContainerMeta();

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['wiki-workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_doc_spaces')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data ?? []) as WikiWorkspaceRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!workspaces) return [];
    const q = search.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter(
      (w) => w.name.toLowerCase().includes(q) || (w.description ?? '').toLowerCase().includes(q),
    );
  }, [workspaces, search]);

  const openWorkspace = (w: WikiWorkspaceRow) => {
    navigate(Routes.wiki.workspace(w.slug ?? w.id));
  };

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '48px 40px 96px' }}>
      <style>{`
        .wiki-ws-card {
          position: relative;
          display: flex; gap: 16px; align-items: flex-start;
          padding: 16px;
          border: 1px solid var(--ds-border);
          border-radius: 12px;
          background: var(--ds-surface);
          cursor: pointer;
          transition: transform 140ms cubic-bezier(.2,.7,.3,1), box-shadow 140ms ease, border-color 140ms ease;
        }
        .wiki-ws-card:hover { transform: translateY(-3px); box-shadow: var(--ds-shadow-overlay); border-color: var(--ds-border-bold); }
        .wiki-ws-card:focus-visible { outline: 2px solid var(--ds-border-focused); outline-offset: 2px; }
        .wiki-ws-glyph {
          width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--ds-background-neutral);
        }
        .wiki-home-search { position: relative; max-width: 460px; }
        .wiki-home-search svg {
          position: absolute; inset-inline-start: 12px; top: 50%; transform: translateY(-50%);
          width: 16px; height: 16px; color: var(--ds-icon-subtle); pointer-events: none;
        }
      `}</style>

      {/* Premium hero — neutral Notion-scale title (not the olive PageHeader) */}
      <div style={{ marginBottom: 24 }}>
        {/* ads-scanner:ignore-next-line — ADS heading token shorthand (font:), Notion-scale hub title */}
        <h1 style={{ font: 'var(--ds-font-heading-xxlarge)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ds-text)', margin: 0 }}>
          Wiki
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body-large)' }}>
          Documentation workspaces for every project and product.
        </p>
      </div>

      <div className="wiki-home-search" style={{ marginBottom: 24 }}>
        <Search />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find a workspace"
          style={{ paddingInlineStart: 38 }}
          aria-label="Find a workspace"
        />
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} style={{ height: 96, borderRadius: 12 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent style={{ padding: 40, textAlign: 'center' }}>
            <FolderOpen style={{ width: 28, height: 28, color: 'var(--ds-icon-subtle)', margin: '0 auto 8px' }} />
            <p style={{ color: 'var(--ds-text)', margin: 0, font: 'var(--ds-font-body)' }}>
              {search ? 'No workspaces match your search' : 'No workspaces yet'}
            </p>
            <p style={{ color: 'var(--ds-text-subtle)', margin: '4px 0 0', font: 'var(--ds-font-body-small)' }}>
              Workspaces are provisioned automatically for every project and product.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map((w) => (
            <div
              key={w.id}
              role="button"
              tabIndex={0}
              onClick={() => openWorkspace(w)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openWorkspace(w);
              }}
              className="wiki-ws-card"
            >
              {/* Per-entity canonical icon — same resolution ContextSwitcher's
                  ItemRow uses, so a card here matches its Project Hub / Product
                  Hub icon exactly instead of one shared FileText glyph. */}
              {w.icon ? (
                <div className="wiki-ws-glyph" aria-hidden>
                  <span style={{ font: 'var(--ds-font-heading-medium)' }}>{w.icon}</span>
                </div>
              ) : w.container_type === 'project' && w.container_id ? (
                <ProjectIcon
                  size="large"
                  projectKey={containerMeta?.projectKeyById.get(w.container_id)}
                  name={w.name}
                />
              ) : w.container_type === 'product' && w.container_id ? (
                <ProjectIcon
                  size="large"
                  projectKey={containerMeta?.productById.get(w.container_id)?.code}
                  avatarUrl={
                    containerMeta?.productById.get(w.container_id)?.code
                      ? getProductAvatarUrl(containerMeta.productById.get(w.container_id)!.code)
                      : undefined
                  }
                  color={containerMeta?.productById.get(w.container_id)?.color}
                  name={w.name}
                />
              ) : (
                <div className="wiki-ws-glyph" aria-hidden>
                  <FolderOpen style={{ width: 20, height: 20, color: 'var(--ds-icon-subtle)' }} />
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span
                    style={{
                      font: 'var(--ds-font-heading-xsmall)',
                      color: 'var(--ds-text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {w.name}
                  </span>
                  {w.container_type && CONTAINER_LABEL[w.container_type] && (
                    <Lozenge appearance="default">{CONTAINER_LABEL[w.container_type]}</Lozenge>
                  )}
                </div>
                <p
                  style={{
                    margin: 0,
                    color: 'var(--ds-text-subtle)',
                    font: 'var(--ds-font-body-small)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {w.description || `${CONTAINER_LABEL[w.container_type ?? ''] ?? 'Workspace'} documentation`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
