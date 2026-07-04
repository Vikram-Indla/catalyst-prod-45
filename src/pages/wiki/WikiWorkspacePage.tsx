/**
 * WikiWorkspacePage — a workspace's page tree + the open page
 * (routes /wiki/:workspaceSlug and /wiki/:workspaceSlug/:pageSlug).
 * Confluence layout: tree panel left, page surface right.
 */
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FolderOpen } from '@/lib/atlaskit-icons';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTree, type PageTreeMove } from '@/components/wiki-hub/PageTree';
import WikiPageSurface from '@/components/wiki-hub/WikiPageSurface';
import { DangerConfirmModal } from '@/components/shared/DangerConfirmModal';
import { Routes } from '@/lib/routes';
import { WIKI_TEMPLATES, type WikiTemplate } from '@/components/wiki-hub/templates';
import {
  useCreateWikiPage,
  useDeleteWikiPage,
  useMoveWikiPage,
  useWikiPageBySlug,
  useWikiPageTree,
  useWikiWorkspaceBySlug,
  type WikiPageSummary,
} from '@/hooks/useWiki';

const CONTAINER_LABEL: Record<string, string> = {
  project: 'Project workspace',
  product: 'Product workspace',
  organization: 'Organization workspace',
};

export default function WikiWorkspacePage() {
  const { workspaceSlug, pageSlug } = useParams<{ workspaceSlug: string; pageSlug?: string }>();
  const navigate = useNavigate();

  const { data: workspace, isLoading: wsLoading } = useWikiWorkspaceBySlug(workspaceSlug);
  const { data: treePages, isLoading: treeLoading } = useWikiPageTree(workspace?.id);
  const { data: page, isLoading: pageLoading } = useWikiPageBySlug(workspace?.id, pageSlug);

  const createPage = useCreateWikiPage();
  const movePage = useMoveWikiPage();
  const deletePage = useDeleteWikiPage();
  const [deleteTarget, setDeleteTarget] = useState<WikiPageSummary | null>(null);

  const handleSelect = useCallback(
    (p: WikiPageSummary) => {
      if (!workspace) return;
      navigate(Routes.wiki.page(workspace.slug, p.slug));
    },
    [navigate, workspace],
  );

  const handleCreate = useCallback(
    (parentId: string | null) => {
      if (!workspace) return;
      createPage.mutate(
        { spaceId: workspace.id, title: 'Untitled', parentId },
        {
          onSuccess: (created) => {
            navigate(Routes.wiki.page(workspace.slug, created.slug));
          },
        },
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
        {
          onSuccess: (created) => navigate(Routes.wiki.page(workspace.slug, created.slug)),
        },
      );
    },
    [createPage, navigate, workspace],
  );

  const handleMove = useCallback(
    (move: PageTreeMove) => {
      if (!workspace) return;
      movePage.mutate({
        id: move.id,
        spaceId: workspace.id,
        newParentId: move.newParentId,
        newPosition: move.newPosition,
      });
    },
    [movePage, workspace],
  );

  const selectedId = useMemo(
    () => (page ? page.id : null),
    [page],
  );

  if (wsLoading) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton style={{ height: 32, width: 280, borderRadius: 6, marginBottom: 16 }} />
        <Skeleton style={{ height: 400, borderRadius: 8 }} />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <FolderOpen style={{ width: 28, height: 28, color: 'var(--ds-icon-subtle)', margin: '0 auto 8px' }} />
        <p style={{ color: 'var(--ds-text)', font: 'var(--ds-font-body)', margin: 0 }}>Workspace not found</p>
      </div>
    );
  }

  const confirmDelete = () => {
    if (!deleteTarget || !workspace) return;
    const wasOpen = page?.id === deleteTarget.id;
    deletePage.mutate(
      { id: deleteTarget.id, spaceId: workspace.id },
      {
        onSuccess: () => {
          setDeleteTarget(null);
          if (wasOpen) navigate(Routes.wiki.workspace(workspace.slug));
        },
      },
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)', alignItems: 'stretch' }}>
      <aside
        aria-label={`${workspace.name} pages`}
        style={{
          width: 268,
          flex: '0 0 268px',
          borderInlineEnd: '1px solid var(--ds-border)',
          padding: '16px 10px',
          background: 'var(--ds-surface)',
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '0 6px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {workspace.icon ? (
              <span aria-hidden style={{ fontSize: 18 }}>{workspace.icon}</span>
            ) : null}
            <span style={{ font: 'var(--ds-font-heading-xsmall)', color: 'var(--ds-text)' }}>
              {workspace.name}
            </span>
          </div>
          <p style={{ margin: '2px 0 0', color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)' }}>
            {CONTAINER_LABEL[workspace.container_type] ?? 'Workspace'}
          </p>
        </div>
        {treeLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 6px' }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} style={{ height: 24, borderRadius: 4 }} />
            ))}
          </div>
        ) : (
          <PageTree
            pages={treePages ?? []}
            selectedId={selectedId}
            onSelect={handleSelect}
            onMove={handleMove}
            onCreateChild={handleCreate}
            onDelete={setDeleteTarget}
            emptyHint="No pages yet — create the first one."
          />
        )}
      </aside>

      <main style={{ flex: 1, minWidth: 0, background: 'var(--ds-surface)' }}>
        {pageSlug ? (
          pageLoading ? (
            <div style={{ maxWidth: 860, margin: '0 auto', padding: 40 }}>
              <Skeleton style={{ height: 40, width: 360, borderRadius: 6, marginBottom: 20 }} />
              <Skeleton style={{ height: 300, borderRadius: 8 }} />
            </div>
          ) : page ? (
            <WikiPageSurface workspace={workspace} page={page} treePages={treePages ?? []} />
          ) : (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ color: 'var(--ds-text)', font: 'var(--ds-font-body)', margin: 0 }}>Page not found</p>
            </div>
          )
        ) : (
          <div style={{ maxWidth: 860, margin: '0 auto', padding: 40 }}>
            <h1 style={{ font: 'var(--ds-font-heading-large)', color: 'var(--ds-text)', margin: '0 0 6px' }}>
              {workspace.name}
            </h1>
            <p style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body)', margin: '0 0 24px' }}>
              {workspace.description || 'Select a page from the tree, or create one.'}
            </p>

            <h2 style={{ font: 'var(--ds-font-heading-xsmall)', color: 'var(--ds-text-subtle)', margin: '0 0 10px' }}>
              Start writing
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
              <button
                type="button"
                onClick={() => handleCreate(null)}
                style={{
                  textAlign: 'start',
                  padding: '14px 16px',
                  border: '1px solid var(--ds-border)',
                  borderRadius: 8,
                  background: 'var(--ds-surface)',
                  cursor: 'pointer',
                }}
              >
                <span aria-hidden style={{ fontSize: 20 }}>📄</span>
                <p style={{ margin: '6px 0 2px', font: 'var(--ds-font-heading-xsmall)', color: 'var(--ds-text)' }}>
                  Blank page
                </p>
                <p style={{ margin: 0, color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body-small)' }}>
                  Start from nothing
                </p>
              </button>
              {WIKI_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleCreateFromTemplate(t)}
                  style={{
                    textAlign: 'start',
                    padding: '14px 16px',
                    border: '1px solid var(--ds-border)',
                    borderRadius: 8,
                    background: 'var(--ds-surface)',
                    cursor: 'pointer',
                  }}
                >
                  <span aria-hidden style={{ fontSize: 20 }}>{t.icon}</span>
                  <p style={{ margin: '6px 0 2px', font: 'var(--ds-font-heading-xsmall)', color: 'var(--ds-text)' }}>
                    {t.name}
                  </p>
                  <p style={{ margin: 0, color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body-small)' }}>
                    {t.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <DangerConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`Delete "${deleteTarget?.title || 'Untitled'}"?`}
        description="You're about to permanently delete this page, its comments and work-item links. This is irreversible."
        hint="Child pages are not deleted — they move to the top level of this workspace."
        skipPhraseGate
        isLoading={deletePage.isPending}
      />
    </div>
  );
}
