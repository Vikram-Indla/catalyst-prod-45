/**
 * WikiTreeNav — the workspace page tree, rendered INSIDE the Wiki hub
 * sidebar (CAT-DOCS-NOTION-20260704-001). Collapses the old double-panel
 * layout into a single Notion-style sidebar: workspace switcher on top,
 * the live page tree below, "New page" at the foot.
 */
import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { parseWikiPath } from '@/components/wiki-hub/wikiPath';
import { Skeleton } from '@/components/ui/skeleton';
import { DangerConfirmModal } from '@/components/shared/DangerConfirmModal';
import { PageTree, type PageTreeMove } from '@/components/wiki-hub/PageTree';
import { Routes } from '@/lib/routes';
import {
  useCreateWikiPage,
  useDeleteWikiPage,
  useMoveWikiPage,
  useWikiPageTree,
  useWikiWorkspaceBySlug,
  type WikiPageSummary,
} from '@/hooks/useWiki';

const CONTAINER_LABEL: Record<string, string> = {
  project: 'Project workspace',
  product: 'Product workspace',
  organization: 'Organization workspace',
};

export function WikiTreeNav() {
  const { pathname } = useLocation();
  const { workspaceSlug, pageSlug } = parseWikiPath(pathname);
  const navigate = useNavigate();

  const { data: workspace, isLoading: wsLoading } = useWikiWorkspaceBySlug(workspaceSlug);
  const { data: treePages, isLoading: treeLoading } = useWikiPageTree(workspace?.id);

  const createPage = useCreateWikiPage();
  const movePage = useMoveWikiPage();
  const deletePage = useDeleteWikiPage();
  const [deleteTarget, setDeleteTarget] = useState<WikiPageSummary | null>(null);

  const selectedId = pageSlug
    ? (treePages ?? []).find((p) => p.slug === pageSlug)?.id ?? null
    : null;

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
        { onSuccess: (created) => navigate(Routes.wiki.page(workspace.slug, created.slug)) },
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

  const confirmDelete = () => {
    if (!deleteTarget || !workspace) return;
    const wasOpen = pageSlug === deleteTarget.slug;
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
    <div style={{ padding: '4px 8px 0' }}>
      {/* "All workspaces" back-link removed (Vikram 2026-07-06) — the
          workspace NAME is the way back to the hub home instead. */}
      {wsLoading || !workspace ? (
        <div style={{ padding: '6px' }}>
          <Skeleton style={{ height: 18, width: 140, borderRadius: 4 }} />
        </div>
      ) : (
        <div style={{ padding: '6px 6px 8px' }}>
          <button
            type="button"
            onClick={() => navigate(Routes.wiki.root())}
            title="Back to all workspaces"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              background: 'transparent',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {workspace.icon ? (
              <span aria-hidden style={{ font: 'var(--ds-font-heading-small)' }}>{workspace.icon}</span>
            ) : null}
            <span style={{ font: 'var(--ds-font-heading-xsmall)', color: 'var(--ds-text)' }}>
              {workspace.name}
            </span>
          </button>
          <p style={{ margin: '2px 0 0', color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)' }}>
            {CONTAINER_LABEL[workspace.container_type] ?? 'Workspace'}
          </p>
        </div>
      )}

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

export default WikiTreeNav;
