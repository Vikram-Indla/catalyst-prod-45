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
import { Search, FolderOpen, FileText } from '@/lib/atlaskit-icons';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Lozenge } from '@/components/ads';
import { PageHeader } from '@/components/layout/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { Routes } from '@/lib/routes';

interface WikiWorkspaceRow {
  id: string;
  name: string;
  description: string | null;
  project_id: string | null;
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
    <div style={{ padding: 'var(--ds-space-300)', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        .wiki-workspace-card:hover {
          border-color: var(--ds-border-bold) !important;
          box-shadow: var(--ds-shadow-raised);
        }
        .wiki-workspace-card:focus-visible {
          outline: 2px solid var(--ds-border-focused);
          outline-offset: 1px;
        }
      `}</style>
      <PageHeader
        title="Wiki"
        subtitle="Documentation workspaces for every project and product"
      />

      <div style={{ maxWidth: 420, margin: '16px 0 24px' }}>
        <div style={{ position: 'relative' }}>
          <Search
            style={{
              position: 'absolute',
              insetInlineStart: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              color: 'var(--ds-icon-subtle)',
            }}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a workspace"
            style={{ paddingInlineStart: 34 }}
            aria-label="Find a workspace"
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 110, borderRadius: 8 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent style={{ padding: 32, textAlign: 'center' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((w) => (
            <Card
              key={w.id}
              role="button"
              tabIndex={0}
              onClick={() => openWorkspace(w)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openWorkspace(w);
              }}
              className="wiki-workspace-card"
              style={{ cursor: 'pointer', transition: 'border-color 120ms ease, box-shadow 120ms ease' }}
            >
              <CardContent style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div
                  aria-hidden
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    background: 'var(--ds-background-neutral)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {w.icon ? (
                    <span style={{ font: 'var(--ds-font-heading-small)' }}>{w.icon}</span>
                  ) : (
                    <FileText style={{ width: 18, height: 18, color: 'var(--ds-icon-subtle)' }} />
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                  {w.description ? (
                    <p
                      style={{
                        margin: '4px 0 0',
                        color: 'var(--ds-text-subtle)',
                        font: 'var(--ds-font-body-small)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {w.description}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
