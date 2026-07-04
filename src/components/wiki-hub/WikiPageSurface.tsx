/**
 * WikiPageSurface — a single Wiki page: chrome (icon, cover, title),
 * breadcrumbs, and the block editor with debounced autosave.
 *
 * content_format 'blocknote' → editable WikiEditor (autosave 1.5s debounce,
 * flushed on unmount/tab-hide). 'adf' → legacy read-only render through
 * AtlaskitRenderer with a conversion notice (one-way convert in a later slice).
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Block, BlockNoteEditor } from '@blocknote/core';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/ads';
import { Skeleton } from '@/components/ui/skeleton';
import { Routes } from '@/lib/routes';
import {
  useUpdateWikiPage,
  type WikiPage,
  type WikiPageSummary,
  type WikiWorkspace,
} from '@/hooks/useWiki';
import { blocksToText } from './editor/blocksToText';

const WikiEditor = lazy(() => import('./editor/WikiEditor'));
const AtlaskitRenderer = lazy(() => import('@/components/shared/AtlaskitRenderer'));

const AUTOSAVE_MS = 1500;

export interface WikiPageSurfaceProps {
  workspace: WikiWorkspace;
  page: WikiPage;
  /** Flat tree summaries — used to build ancestor breadcrumbs. */
  treePages: WikiPageSummary[];
}

export function WikiPageSurface({ workspace, page, treePages }: WikiPageSurfaceProps) {
  const navigate = useNavigate();
  const updatePage = useUpdateWikiPage();

  // ---- Title (seamless, Notion-style) ----
  const [title, setTitle] = useState(page.title);
  useEffect(() => setTitle(page.title), [page.id, page.title]);

  const commitTitle = useCallback(() => {
    const next = title.trim();
    if (next && next !== page.title) {
      updatePage.mutate({ id: page.id, spaceId: page.space_id, patch: { title: next } });
    } else if (!next) {
      setTitle(page.title);
    }
  }, [title, page.id, page.space_id, page.title, updatePage]);

  // ---- Autosave (blocknote content) ----
  const pendingDoc = useRef<Block[] | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const doc = pendingDoc.current;
    if (!doc) return;
    pendingDoc.current = null;
    updatePage.mutate({
      id: page.id,
      spaceId: page.space_id,
      patch: { content: doc, content_text: blocksToText(doc), content_format: 'blocknote' },
    });
  }, [page.id, page.space_id, updatePage]);

  const handleEditorChange = useCallback(
    (editor: BlockNoteEditor) => {
      pendingDoc.current = editor.document as Block[];
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, AUTOSAVE_MS);
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, [flush]);

  // ---- Breadcrumbs from tree ancestors ----
  const crumbs = useMemo<BreadcrumbItem[]>(() => {
    const byId = new Map(treePages.map((p) => [p.id, p]));
    const chain: WikiPageSummary[] = [];
    let cur = page.parent_id ? byId.get(page.parent_id) : undefined;
    while (cur) {
      chain.unshift(cur);
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }
    return [
      { key: 'wiki', text: 'Wiki', href: Routes.wiki.root() },
      { key: workspace.id, text: workspace.name, href: Routes.wiki.workspace(workspace.slug) },
      ...chain.map((c) => ({
        key: c.id,
        text: c.title || 'Untitled',
        href: Routes.wiki.page(workspace.slug, c.slug),
      })),
      { key: page.id, text: page.title || 'Untitled', isCurrent: true },
    ];
  }, [treePages, page.parent_id, page.id, page.title, workspace]);

  const isLegacyAdf = page.content_format === 'adf';

  return (
    <article style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 40px 0' }}>
        <Breadcrumbs
          items={crumbs}
          LinkComponent={Link as never}
          aria-label="Page location"
        />
      </div>

      {page.cover_url ? (
        <div
          aria-hidden
          style={{
            height: 160,
            margin: '12px 0 0',
            backgroundImage: `url(${page.cover_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ) : null}

      <div style={{ maxWidth: 860, width: '100%', margin: '0 auto', padding: '0 40px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: page.cover_url ? -24 : 28 }}>
          {page.icon ? (
            <span
              aria-hidden
              style={{
                fontSize: 34,
                lineHeight: 1,
                background: page.cover_url ? 'var(--ds-surface)' : 'transparent',
                borderRadius: 8,
                padding: page.cover_url ? 6 : 0,
              }}
            >
              {page.icon}
            </span>
          ) : null}
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          placeholder="Untitled"
          aria-label="Page title"
          dir="auto"
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--ds-text)',
            font: 'var(--ds-font-heading-xlarge)',
            padding: 0,
            margin: '10px 0 4px',
          }}
        />

        <p style={{ margin: '0 0 18px', color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)' }}>
          Updated {new Date(page.updated_at).toLocaleString()}
        </p>

        {isLegacyAdf ? (
          <div>
            <p
              role="note"
              style={{
                margin: '0 0 16px',
                padding: '8px 12px',
                borderRadius: 4,
                background: 'var(--ds-background-information)',
                color: 'var(--ds-text)',
                font: 'var(--ds-font-body-small)',
              }}
            >
              This page uses the legacy editor format and is shown read-only.
            </p>
            <Suspense fallback={<Skeleton style={{ height: 240, borderRadius: 8 }} />}>
              <AtlaskitRenderer document={page.content as never} />
            </Suspense>
          </div>
        ) : (
          <Suspense fallback={<Skeleton style={{ height: 320, borderRadius: 8 }} />}>
            <WikiEditor
              key={page.id}
              initialContent={(page.content as Block[]) ?? undefined}
              onChange={handleEditorChange}
              dictationStyle="brd-page"
            />
          </Suspense>
        )}
      </div>
    </article>
  );
}

export default WikiPageSurface;
