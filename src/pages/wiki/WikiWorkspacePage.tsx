/**
 * WikiWorkspacePage — the open page, OR (when no page is selected) a
 * premium workspace overview (CAT-DOCS-NOTION-20260704-001).
 *
 * Single-sidebar layout: the page tree lives in the Wiki hub sidebar
 * (WikiTreeNav), so this surface is full-width content only — no second
 * panel. Matches Notion: one nav rail, one document canvas.
 */
import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FolderOpen } from '@/lib/atlaskit-icons';
import { Skeleton } from '@/components/ui/skeleton';
import WikiPageSurface from '@/components/wiki-hub/WikiPageSurface';
import { Routes } from '@/lib/routes';
import { WIKI_TEMPLATES, type WikiTemplate } from '@/components/wiki-hub/templates';
import {
  useCreateWikiPage,
  useWikiPageBySlug,
  useWikiPageTree,
  useWikiWorkspaceBySlug,
} from '@/hooks/useWiki';
import { useCreateDocexDatabase, useDocexDatabases } from '@/hooks/useDocexDatabase';

const CONTAINER_LABEL: Record<string, string> = {
  project: 'Project workspace',
  product: 'Product workspace',
  organization: 'Organization workspace',
};

export default function WikiWorkspacePage() {
  const { workspaceSlug, pageSlug } = useParams<{ workspaceSlug: string; pageSlug?: string }>();
  const navigate = useNavigate();

  const { data: workspace, isLoading: wsLoading } = useWikiWorkspaceBySlug(workspaceSlug);
  const { data: treePages } = useWikiPageTree(workspace?.id);
  const { data: page, isLoading: pageLoading } = useWikiPageBySlug(workspace?.id, pageSlug);

  const createPage = useCreateWikiPage();
  const { data: databases } = useDocexDatabases(workspace?.id);
  const createDatabase = useCreateDocexDatabase();

  const handleCreateDatabase = useCallback(() => {
    if (!workspace) return;
    createDatabase.mutate(
      { spaceId: workspace.id, name: 'New database' },
      { onSuccess: (created) => navigate(Routes.docex.database(workspace.slug, created.slug)) },
    );
  }, [workspace, createDatabase, navigate]);

  const handleCreate = useCallback(
    (parentId: string | null) => {
      if (!workspace) return;
      createPage.mutate(
        { spaceId: workspace.id, title: 'Untitled', parentId },
        { onSuccess: (created) => navigate(Routes.wiki.page(workspace.slug, created.slug)) },
      );
    },
    [createPage, navigate, workspace],
  );

  const handleCreateFromTemplate = useCallback(
    (template: WikiTemplate) => {
      if (!workspace) return;
      createPage.mutate(
        {
          spaceId: workspace.id,
          title: template.name,
          parentId: null,
          content: template.blocks,
          icon: template.icon,
          templateKey: template.key,
        },
        { onSuccess: (created) => navigate(Routes.wiki.page(workspace.slug, created.slug)) },
      );
    },
    [createPage, navigate, workspace],
  );

  if (wsLoading) {
    return (
      <div style={{ width: '100%', margin: 0, padding: '32px 40px' }}>
        <Skeleton style={{ height: 40, width: 320, borderRadius: 8, marginBottom: 16 }} />
        <Skeleton style={{ height: 320, borderRadius: 12 }} />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div style={{ padding: 64, textAlign: 'center' }}>
        <FolderOpen style={{ width: 32, height: 32, color: 'var(--ds-icon-subtle)', margin: '0 auto 10px' }} />
        <p style={{ color: 'var(--ds-text)', font: 'var(--ds-font-body)', margin: 0 }}>Workspace not found</p>
      </div>
    );
  }

  // ── Open page ──────────────────────────────────────────────────────
  if (pageSlug) {
    if (pageLoading) {
      return (
        <div style={{ width: '100%', margin: 0, padding: '32px 40px' }}>
          <Skeleton style={{ height: 44, width: 380, borderRadius: 8, marginBottom: 24 }} />
          <Skeleton style={{ height: 22, width: '90%', borderRadius: 6, marginBottom: 10 }} />
          <Skeleton style={{ height: 22, width: '80%', borderRadius: 6, marginBottom: 10 }} />
          <Skeleton style={{ height: 22, width: '85%', borderRadius: 6 }} />
        </div>
      );
    }
    if (page) {
      return <WikiPageSurface workspace={workspace} page={page} treePages={treePages ?? []} />;
    }
    return (
      <div style={{ padding: 64, textAlign: 'center' }}>
        <p style={{ color: 'var(--ds-text)', font: 'var(--ds-font-body)', margin: 0 }}>Page not found</p>
      </div>
    );
  }

  // ── Workspace overview (no page selected) ──────────────────────────
  const heroTemplates = [
    { key: '__blank', name: 'Blank page', description: 'Start from a clean canvas', icon: '📄', onClick: () => handleCreate(null) },
    ...WIKI_TEMPLATES.map((t) => ({
      key: t.key,
      name: t.name,
      description: t.description,
      icon: t.icon,
      onClick: () => handleCreateFromTemplate(t),
    })),
  ];

  return (
    <div style={{ width: '100%', margin: 0, padding: '24px 40px 96px' }}>
      <style>{`
        .wiki-tpl {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: start;
          padding: 16px 16px 20px;
          border: 1px solid var(--ds-border);
          border-radius: 12px;
          background: var(--ds-surface-raised);
          box-shadow: var(--ds-shadow-raised);
          cursor: pointer;
          transition: transform 140ms cubic-bezier(.2,.7,.3,1), box-shadow 140ms ease, border-color 140ms ease;
        }
        .wiki-tpl:hover {
          transform: translateY(-3px);
          box-shadow: var(--ds-shadow-overlay);
          border-color: var(--ds-border-bold);
        }
        .wiki-tpl:focus-visible { outline: 2px solid var(--ds-border-focused); outline-offset: 2px; }
        .wiki-tpl__glyph {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: var(--ds-background-neutral-bold);
          margin-bottom: 12px;
        }
      `}</style>

      {/* Hero */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'var(--ds-background-neutral-bold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: 'var(--ds-font-heading-large)',
            flexShrink: 0,
          }}
        >
          {workspace.icon ?? '📚'}
        </div>
        <div>
          {/* ads-scanner:ignore-next-line — ADS heading token shorthand (font:), not split fontSize/fontWeight */}
          <h1 style={{ font: 'var(--ds-font-heading-xlarge)', color: 'var(--ds-text)', margin: 0 }}>
            {workspace.name}
          </h1>
          <p style={{ margin: '2px 0 0', color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body)' }}>
            {workspace.description && workspace.description !== CONTAINER_LABEL[workspace.container_type]
              ? workspace.description
              : (CONTAINER_LABEL[workspace.container_type] ?? 'Workspace')}
          </p>
        </div>
      </div>

      {/* Start writing */}
      <div style={{ marginTop: 40 }}>
        {/* ads-scanner:ignore-next-line — ADS heading token shorthand (font:), not split fontSize/fontWeight */}
        <h2 style={{ font: 'var(--ds-font-heading-small)', color: 'var(--ds-text)', margin: '0 0 4px' }}>
          Start writing
        </h2>
        <p style={{ margin: '0 0 20px', color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body)' }}>
          Create a page from a template, or start from a blank canvas.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))', gap: 16 }}>
          {heroTemplates.map((t) => (
            <button key={t.key} type="button" onClick={t.onClick} className="wiki-tpl">
              <span className="wiki-tpl__glyph" aria-hidden>
                <span style={{ font: 'var(--ds-font-heading-medium)' }}>{t.icon}</span>
              </span>
              {/* ads-scanner:ignore-next-line — ADS heading token shorthand (font:), not split fontSize/fontWeight */}
              <h3 style={{ font: 'var(--ds-font-heading-xsmall)', color: 'var(--ds-text)', margin: 0 }}>
                {t.name}
              </h3>
              <p style={{ margin: '2px 0 0', color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body-small)' }}>
                {t.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Databases (CAT-DOCEX-DB-COEDIT-20260705-001 D2) */}
      <div style={{ marginTop: 40 }}>
        {/* ads-scanner:ignore-next-line — ADS heading token shorthand (font:), not split fontSize/fontWeight */}
        <h2 style={{ font: 'var(--ds-font-heading-small)', color: 'var(--ds-text)', margin: '0 0 4px' }}>
          Databases
        </h2>
        <p style={{ margin: '0 0 20px', color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body)' }}>
          Structured tables with views — track anything alongside your pages.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))', gap: 16 }}>
          {(databases ?? []).map((d) => (
            <button
              key={d.id}
              type="button"
              className="wiki-tpl"
              onClick={() => navigate(Routes.docex.database(workspace.slug, d.slug))}
            >
              <span className="wiki-tpl__glyph" aria-hidden>
                <span style={{ font: 'var(--ds-font-heading-medium)' }}>{d.icon ?? '📊'}</span>
              </span>
              {/* ads-scanner:ignore-next-line — ADS heading token shorthand (font:), not split fontSize/fontWeight */}
              <h3 style={{ font: 'var(--ds-font-heading-xsmall)', color: 'var(--ds-text)', margin: 0 }}>
                {d.name}
              </h3>
              <p style={{ margin: '2px 0 0', color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body-small)' }}>
                Database
              </p>
            </button>
          ))}
          <button type="button" className="wiki-tpl" onClick={handleCreateDatabase}>
            <span className="wiki-tpl__glyph" aria-hidden>
              <span style={{ font: 'var(--ds-font-heading-medium)' }}>➕</span>
            </span>
            {/* ads-scanner:ignore-next-line — ADS heading token shorthand (font:), not split fontSize/fontWeight */}
            <h3 style={{ font: 'var(--ds-font-heading-xsmall)', color: 'var(--ds-text)', margin: 0 }}>
              New database
            </h3>
            <p style={{ margin: '2px 0 0', color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body-small)' }}>
              Table, board, list, gallery, calendar
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
