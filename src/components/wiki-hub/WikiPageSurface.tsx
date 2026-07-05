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
import { useQueryClient } from '@tanstack/react-query';
import type { Block, BlockNoteEditor } from '@blocknote/core';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/ads';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon, Smile as SmileIcon, Star, StarOff } from '@/lib/atlaskit-icons';
import { Routes } from '@/lib/routes';
import {
  useUpdateWikiPage,
  useDocexFavorites,
  useToggleFavorite,
  useSaveVersion,
  useDuplicatePage,
  useWorkspaceContainerMeta,
  WIKI_CONFLICT,
  type WikiPage,
  type WikiPageSummary,
  type WikiWorkspace,
} from '@/hooks/useWiki';
import { ProjectIcon } from '@/components/shared/ProjectIcon';
import { getProductAvatarUrl } from '@/components/icons';
import { WikiEditorBoundary } from './editor/WikiEditorBoundary';
import { DocexVersionHistory } from './DocexVersionHistory';
import { blocksToText } from './editor/blocksToText';
import { clearDraft, getDraft, saveDraft } from './editor/localDraft';
import { attachMarqueeSelection } from './editor/marqueeSelection';
import { syncMentionLinks } from './editor/syncMentionLinks';
import { BacklinksPanel } from './BacklinksPanel';
import { DropdownMenu, Lozenge } from '@/components/ads';
import { Input } from '@/components/ui/input';
import { exportPageHtml, exportPageMarkdown, printPage } from './editor/exportPage';
import { uploadWikiFile } from './editor/wikiUpload';
import { catalystToast } from '@/lib/catalystToast';
import { WikiTranslateBar } from './WikiTranslateBar';
import { GenerateStoriesFromPage } from './GenerateStoriesFromPage';
import { WikiPresence } from './WikiPresence';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import * as Y from 'yjs';
import { SupabaseYjsProvider, collabColor } from './editor/SupabaseYjsProvider';
import { u8ToPgHex, pgHexToU8 } from './editor/ydocBytea';
import { seedYdocFromContent } from './editor/seedYdoc';

const WikiEditor = lazy(() => import('./editor/WikiEditor'));
const AtlaskitRenderer = lazy(() => import('@/components/shared/AtlaskitRenderer'));
const DocumentComments = lazy(() =>
  import('@/components/knowledge-hub/DocumentComments').then((m) => ({ default: m.DocumentComments })),
);

const AUTOSAVE_MS = 1500;

/** One-click cover gradients, all built from ADS accent-subtle tokens
 *  (no literal colors — the color gate stays green). */
const WIKI_COVERS = [
  'linear-gradient(135deg, var(--ds-background-accent-blue-subtlest), var(--ds-background-accent-purple-subtlest))',
  'linear-gradient(135deg, var(--ds-background-accent-teal-subtlest), var(--ds-background-accent-green-subtlest))',
  'linear-gradient(135deg, var(--ds-background-accent-magenta-subtlest), var(--ds-background-accent-red-subtlest))',
  'linear-gradient(135deg, var(--ds-background-accent-orange-subtlest), var(--ds-background-accent-yellow-subtlest))',
  'linear-gradient(135deg, var(--ds-background-accent-purple-subtlest), var(--ds-background-accent-magenta-subtlest))',
  'linear-gradient(135deg, var(--ds-background-accent-green-subtlest), var(--ds-background-accent-teal-subtlest))',
  'linear-gradient(135deg, var(--ds-background-accent-gray-subtlest), var(--ds-background-accent-blue-subtlest))',
  'linear-gradient(135deg, var(--ds-background-accent-red-subtlest), var(--ds-background-accent-orange-subtlest))',
];

/** Notion-style relative edit time. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** A page counts as "empty" (show the write invitation) when it has no
 *  blocks, or a single block with no text content. */
function isDocEmpty(blocks: Block[] | undefined | null): boolean {
  if (!blocks || blocks.length === 0) return true;
  if (blocks.length > 1) return false;
  const c = (blocks[0] as { content?: unknown }).content;
  if (typeof c === 'string') return c.trim() === '';
  if (Array.isArray(c)) return c.length === 0;
  return !c;
}

export interface WikiPageSurfaceProps {
  workspace: WikiWorkspace;
  page: WikiPage;
  /** Flat tree summaries — used to build ancestor breadcrumbs. */
  treePages: WikiPageSummary[];
}

/** The workspace crumb's canonical project/product icon — the SAME
 *  resolution ContextSwitcher/the sidebar use, so the trail matches
 *  Project Hub exactly (Vikram 2026-07-06 breadcrumb feedback). */
function WorkspaceCrumbIcon({ workspace }: { workspace: WikiWorkspace }) {
  const { data: meta } = useWorkspaceContainerMeta();
  if (workspace.container_type === 'project' && workspace.container_id) {
    return (
      <ProjectIcon
        size="xsmall"
        projectKey={meta?.projectKeyById.get(workspace.container_id)}
        name={workspace.name}
      />
    );
  }
  if (workspace.container_type === 'product' && workspace.container_id) {
    const product = meta?.productById.get(workspace.container_id);
    return (
      <ProjectIcon
        size="xsmall"
        projectKey={product?.code}
        avatarUrl={product?.code ? getProductAvatarUrl(product.code) : undefined}
        color={product?.color}
        name={workspace.name}
      />
    );
  }
  return null;
}

export function WikiPageSurface({ workspace, page, treePages }: WikiPageSurfaceProps) {
  const navigate = useNavigate();
  const updatePage = useUpdateWikiPage();

  // ---- Favorites / publish / versions / duplicate (Pass D) ----
  const { data: favorites } = useDocexFavorites();
  const toggleFavorite = useToggleFavorite();
  const myFavorite = (favorites ?? []).find((f) => f.document_id === page.id);
  const saveVersion = useSaveVersion();
  const duplicatePage = useDuplicatePage();
  const [historyOpen, setHistoryOpen] = useState(false);
  const lastSnapshotAt = useRef(0);

  // Reading-width preference (Notion's full-width toggle), remembered per page.
  const [fullWidth, setFullWidth] = useState(false);
  useEffect(() => {
    try {
      setFullWidth(localStorage.getItem(`docex.fullwidth.${page.id}`) === '1');
    } catch {
      setFullWidth(false);
    }
  }, [page.id]);
  const toggleFullWidth = useCallback(() => {
    setFullWidth((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`docex.fullwidth.${page.id}`, next ? '1' : '0');
      } catch {
        /* private mode */
      }
      return next;
    });
  }, [page.id]);

  // ---- Real-time co-editing (CAT-DOCEX-DB-COEDIT-20260705-001 C2/C3) ----
  // One Yjs provider per open page, keyed by page id. Construction opens a
  // real Realtime subscription (a side effect) — MUST live in useEffect, not
  // useMemo (C1 root cause: Strict Mode double-invokes memo factories,
  // orphaning a duplicate subscription with no cleanup hook to catch it).
  const [collabProvider, setCollabProvider] = useState<SupabaseYjsProvider | null>(null);
  const [peerCount, setPeerCount] = useState(1);
  const peerCountRef = useRef(1);
  useEffect(() => {
    peerCountRef.current = peerCount;
  }, [peerCount]);
  const { user: authUser } = useAuth();

  useEffect(() => {
    if (page.content_format !== 'blocknote') {
      setCollabProvider(null);
      return;
    }
    let cancelled = false;
    const p = new SupabaseYjsProvider(page.id);
    const onAwareness = () => setPeerCount(Math.max(1, p.awareness.getStates().size));
    p.awareness.on('change', onAwareness);

    // Hydration MUST read the database directly, not the `page` prop: React
    // Query can serve a stale cached snapshot on first render while a
    // fresher fetch resolves in the background, and this effect (correctly
    // scoped to [page.id, page.content_format] so autosaves don't re-trigger
    // it) only ever runs once per page — if it captured a stale, pre-edit
    // ydoc_state/content, the real persisted content would never surface
    // (reproduced live: content_text/ydoc_state were correct in the DB, but
    // hydration silently used an older, empty snapshot).
    const seedReady = (async () => {
      const { data } = await (
        supabase as unknown as { from: (t: string) => any }
      )
        .from('kb_documents')
        .select('content, ydoc_state')
        .eq('id', page.id)
        .maybeSingle();
      if (cancelled) return;
      const hydrated = pgHexToU8(data?.ydoc_state as string | null);
      if (hydrated && hydrated.length > 2) {
        Y.applyUpdate(p.doc, hydrated, 'hydrate');
      } else {
        // First-ever collab session for this page: the fragment starts
        // blank. Seed it from the pre-Yjs jsonb content BEFORE the real
        // editor attaches, or the existing content silently vanishes
        // (reproduced live — a page's own words disappeared this way).
        await seedYdocFromContent(p.fragment, (data?.content as Block[]) ?? []);
      }
    })();

    void seedReady.then(() => {
      if (!cancelled) setCollabProvider(p);
    });

    return () => {
      cancelled = true;
      p.awareness.off('change', onAwareness);
      p.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id, page.content_format]);

  const collab = useMemo(() => {
    if (!collabProvider) return undefined;
    const meta = (authUser?.user_metadata ?? {}) as { full_name?: string; name?: string };
    const name = meta.full_name || meta.name || authUser?.email || 'Anonymous';
    return { provider: collabProvider, user: { name, color: collabColor(authUser?.id ?? 'anon') } };
  }, [collabProvider, authUser]);

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
  // Optimistic-concurrency: last updated_at we know the server has. A save
  // that no longer matches means someone else edited this page meanwhile.
  const serverUpdatedAt = useRef<string | null>(page.updated_at ?? null);
  useEffect(() => {
    serverUpdatedAt.current = page.updated_at ?? null;
  }, [page.id, page.updated_at]);
  const [saveFailed, setSaveFailed] = useState(false);
  const [conflictDoc, setConflictDoc] = useState<Block[] | null>(null);

  // Periodic ydoc_state checkpoint (independent of the content-projection
  // autosave) so a collab session survives everyone leaving. Must update
  // serverUpdatedAt the same way flush() does — otherwise a checkpoint moves
  // the server's updated_at behind flush()'s back and the NEXT solo content
  // save false-fires the conflict banner against itself.
  useEffect(() => {
    if (!collabProvider) return;
    const doc = collabProvider.doc;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const checkpoint = () => {
      const state = Y.encodeStateAsUpdate(doc);
      if (state.length <= 2) return; // empty doc — nothing to persist yet
      updatePage.mutate(
        { id: page.id, spaceId: page.space_id, patch: { ydoc_state: u8ToPgHex(state) } },
        { onSuccess: (nextUpdatedAt) => {
            if (nextUpdatedAt) serverUpdatedAt.current = nextUpdatedAt;
          } },
      );
    };
    // Debounced on every doc change (not just a 60s tick/unmount) — a real
    // tab close aborts in-flight requests, so waiting for unmount to fire
    // the FIRST checkpoint is not reliable enough for a page's only copy.
    const onDocUpdate = (_update: Uint8Array, origin: unknown) => {
      if (origin === 'hydrate') return; // hydration itself needs no re-save
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(checkpoint, 4000);
    };
    doc.on('update', onDocUpdate);
    const interval = setInterval(checkpoint, 60_000);
    return () => {
      doc.off('update', onDocUpdate);
      clearInterval(interval);
      if (debounceTimer) clearTimeout(debounceTimer);
      checkpoint();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collabProvider, page.id, page.space_id]);

  const flush = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const doc = pendingDoc.current;
    if (!doc) return;
    pendingDoc.current = null;
    updatePage.mutate(
      {
        id: page.id,
        spaceId: page.space_id,
        patch: { content: doc, content_text: blocksToText(doc), content_format: 'blocknote' },
        // With a co-editor present, Yjs's CRDT already resolved any merge —
        // the updated_at guard would otherwise false-positive as two
        // collaborators' 1.5s autosaves race each other's timestamp.
        guardUpdatedAt: peerCountRef.current > 1 ? undefined : serverUpdatedAt.current,
      },
      {
        // Confirmed on the server — the local journal entry is now redundant.
        onSuccess: (nextUpdatedAt) => {
          if (nextUpdatedAt) serverUpdatedAt.current = nextUpdatedAt;
          setSaveFailed(false);
          clearDraft(page.id);
          // History trail: at most one automatic snapshot per 10 minutes of
          // active editing (manual "Save version now" is always available).
          const now = Date.now();
          if (now - lastSnapshotAt.current > 10 * 60_000) {
            lastSnapshotAt.current = now;
            saveVersion.mutate({
              documentId: page.id,
              title: page.title,
              content: doc,
              contentText: blocksToText(doc),
              changeSummary: 'Autosnapshot',
            });
          }
        },
        onError: (e) => {
          if (e instanceof Error && e.message === WIKI_CONFLICT) {
            // Someone else saved this page since we loaded it. Don't retry
            // blindly — let the author choose (their text stays journaled).
            setConflictDoc(doc);
            return;
          }
          // Transient failure (network/API): keep the doc queued, retry with
          // backoff, and tell the author their changes aren't on the server.
          setSaveFailed(true);
          if (!pendingDoc.current) pendingDoc.current = doc;
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(flush, 5000);
        },
      },
    );
    // Mirror @-mention chips into kb_document_links / kb_page_links.
    // Fire-and-forget: link sync must never block or fail the autosave.
    void syncMentionLinks(page.id, doc).catch((e) =>
      console.warn('[wiki] mention link sync failed', e),
    );
  }, [page.id, page.space_id, page.title, updatePage, saveVersion]);

  // Conflict resolution: overwrite keeps mine (unguarded save); reload takes theirs.
  const resolveConflict = useCallback(
    (keepMine: boolean) => {
      const doc = conflictDoc;
      setConflictDoc(null);
      if (keepMine && doc) {
        updatePage.mutate(
          {
            id: page.id,
            spaceId: page.space_id,
            patch: { content: doc, content_text: blocksToText(doc), content_format: 'blocknote' },
          },
          {
            onSuccess: (nextUpdatedAt) => {
              if (nextUpdatedAt) serverUpdatedAt.current = nextUpdatedAt;
              clearDraft(page.id);
            },
          },
        );
      } else {
        window.location.reload();
      }
    },
    [conflictDoc, page.id, page.space_id, updatePage],
  );

  // Empty-page invitation (Notion "press / for commands", bilingual).
  const [showInvite, setShowInvite] = useState(() => isDocEmpty(page.content as Block[]));
  useEffect(() => setShowInvite(isDocEmpty(page.content as Block[])), [page.id, page.content]);

  const handleEditorChange = useCallback(
    (editor: BlockNoteEditor) => {
      const doc = editor.document as Block[];
      pendingDoc.current = doc;
      const empty = isDocEmpty(doc);
      setShowInvite((prev) => (prev !== empty ? empty : prev));
      // Keystroke durability: journal locally long before the 1.5s autosave.
      saveDraft(page.id, doc);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, AUTOSAVE_MS);
    },
    [flush, page.id],
  );

  // ---- Unsaved-draft recovery (crash/refresh between autosaves) ----
  const [draft, setDraft] = useState<{ blocks: Block[]; savedAt: number } | null>(null);
  const [restoredBlocks, setRestoredBlocks] = useState<Block[] | null>(null);
  useEffect(() => {
    setDraft(null);
    setRestoredBlocks(null);
    let cancelled = false;
    void getDraft(page.id).then((d) => {
      if (cancelled || !d) return;
      // Only offer drafts meaningfully newer than the server copy.
      if (d.savedAt > new Date(page.updated_at).getTime() + 2000) {
        setDraft({ blocks: d.blocks as Block[], savedAt: d.savedAt });
      } else {
        clearDraft(page.id);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  const restoreDraft = useCallback(() => {
    if (!draft) return;
    setRestoredBlocks(draft.blocks);
    pendingDoc.current = draft.blocks;
    setDraft(null);
    // Persist the restored content immediately.
    setTimeout(flush, 0);
  }, [draft, flush]);

  const discardDraft = useCallback(() => {
    clearDraft(page.id);
    setDraft(null);
  }, [page.id]);

  // ---- Multi-block marquee selection (drag on the page margins) ----
  const editorRef = useRef<BlockNoteEditor | null>(null);
  const columnRef = useRef<HTMLDivElement | null>(null);
  const handleEditorReady = useCallback((editor: BlockNoteEditor) => {
    editorRef.current = editor;
  }, []);
  useEffect(() => {
    const column = columnRef.current;
    if (!column || page.content_format === 'adf') return;
    return attachMarqueeSelection(
      column,
      () => (editorRef.current as unknown as { prosemirrorView?: never })?.prosemirrorView ?? null,
    );
  }, [page.id, page.content_format]);

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
    // Canonical trail (Vikram 2026-07-06): no "Docex" prefix — the hub is
    // already the context; the workspace crumb carries its CANONICAL
    // project/product icon (same resolution as Project Hub / the sidebar).
    return [
      {
        key: workspace.id,
        text: workspace.name,
        href: Routes.wiki.workspace(workspace.slug),
        iconBefore: <WorkspaceCrumbIcon workspace={workspace} />,
      },
      ...chain.map((c) => ({
        key: c.id,
        text: c.title || 'Untitled',
        href: Routes.wiki.page(workspace.slug, c.slug),
      })),
      { key: page.id, text: page.title || 'Untitled', isCurrent: true },
    ];
  }, [treePages, page.parent_id, page.id, page.title, workspace]);

  const isLegacyAdf = page.content_format === 'adf';

  // ---- Exports (markdown / HTML free-core serializers; print for PDF) ----
  const currentBlocks = useCallback(
    (): Block[] => (pendingDoc.current ?? (page.content as Block[]) ?? []) as Block[],
    [page.content],
  );

  const runExport = useCallback(
    (kind: 'md' | 'html' | 'print') => {
      flush();
      if (kind === 'print') return printPage();
      const task =
        kind === 'md'
          ? exportPageMarkdown(page.title, currentBlocks())
          : exportPageHtml(page.title, currentBlocks());
      void task.catch(() =>
        catalystToast.error('Export failed', undefined, {
          label: 'Retry',
          onClick: () => runExport(kind),
        }),
      );
    },
    [flush, page.title, currentBlocks],
  );

  // ---- Publish / duplicate / manual snapshot (Pass D) ----
  const qc = useQueryClient();
  const togglePublish = useCallback(() => {
    updatePage.mutate(
      {
        id: page.id,
        spaceId: page.space_id,
        patch: { published_at: page.published_at ? null : new Date().toISOString() },
      },
      { onSuccess: () => qc.invalidateQueries({ queryKey: ['wiki', 'page'] }) },
    );
  }, [page.id, page.space_id, page.published_at, updatePage, qc]);

  const duplicateNow = useCallback(() => {
    flush();
    duplicatePage.mutate(
      { page },
      { onSuccess: (created) => navigate(Routes.docex.page(workspace.slug, created.slug)) },
    );
  }, [flush, duplicatePage, page, navigate, workspace.slug]);

  const snapshotNow = useCallback(
    (summary?: string) => {
      const doc = currentBlocks();
      saveVersion.mutate({
        documentId: page.id,
        title: page.title,
        content: doc,
        contentText: blocksToText(doc),
        changeSummary: summary,
      });
      lastSnapshotAt.current = Date.now();
    },
    [currentBlocks, page.id, page.title, saveVersion],
  );

  // ---- Icon picker (emoji) ----
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconDraft, setIconDraft] = useState('');
  const commitIcon = useCallback(
    (value: string | null) => {
      updatePage.mutate({ id: page.id, spaceId: page.space_id, patch: { icon: value } });
      setIconPickerOpen(false);
      setIconDraft('');
    },
    [page.id, page.space_id, updatePage],
  );

  // ---- Cover (Notion-style gradient covers or a URL) ----
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const commitCover = useCallback(
    (value: string | null) => {
      updatePage.mutate({ id: page.id, spaceId: page.space_id, patch: { cover_url: value } });
      setCoverPickerOpen(false);
    },
    [page.id, page.space_id, updatePage],
  );
  const addRandomEmojiIcon = useCallback(() => {
    const set = ['📄', '📝', '📘', '📗', '📙', '🗂️', '📌', '🧭', '💡', '🚀', '⚙️', '🎯'];
    commitIcon(set[Math.floor((page.id.charCodeAt(0) + page.id.length) % set.length)]);
  }, [commitIcon, page.id]);

  return (
    <article className="wiki-print-root wiki-page" style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .wiki-page .wiki-chip-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 6px;
          border: 1px solid var(--ds-border);
          background: var(--ds-surface-raised);
          color: var(--ds-text-subtle); font: var(--ds-font-body-small);
          cursor: pointer; box-shadow: var(--ds-shadow-raised);
          transition: background 120ms ease;
        }
        .wiki-page .wiki-chip-btn:hover { background: var(--ds-background-neutral-subtle); }
        .wiki-page .wiki-cover__actions { opacity: 0; transition: opacity 140ms ease; }
        .wiki-page .wiki-cover:hover .wiki-cover__actions { opacity: 1; }
        .wiki-page .wiki-hover-action {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 4px 8px; border-radius: 6px; border: none; background: transparent;
          color: var(--ds-text-subtlest); font: var(--ds-font-body-small);
          cursor: pointer; opacity: 0; transition: opacity 140ms ease, background 120ms ease;
        }
        .wiki-page .wiki-titlebar:hover .wiki-hover-action,
        .wiki-page:hover .wiki-hover-action { opacity: 1; }
        .wiki-page .wiki-hover-action:hover { background: var(--ds-background-neutral-subtle); color: var(--ds-text-subtle); }
        .wiki-page .wiki-icon-btn { transition: transform 120ms ease; }
        .wiki-page .wiki-icon-btn:hover { transform: scale(1.04); }
        .wiki-page .wiki-title-input::placeholder { color: var(--ds-text-subtlest); }
      `}</style>
      <div
        className="wiki-no-print"
        style={{
          // Notion keeps navigation context visible while reading (Q2)
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'var(--ds-surface)',
          padding: '12px 40px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Breadcrumbs
            items={crumbs}
            LinkComponent={Link as never}
            aria-label="Page location"
          />
        </div>
        <span
          role="status"
          aria-live="polite"
          style={{ color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)' }}
        >
          {conflictDoc ? '' : saveFailed ? 'Not saved' : updatePage.isPending ? 'Saving…' : 'Saved'}
        </span>
        <WikiPresence pageId={page.id} />
        <GenerateStoriesFromPage pageId={page.id} title={page.title} getBlocks={currentBlocks} />
        <WikiTranslateBar title={page.title} getBlocks={currentBlocks} />
        <button
          type="button"
          className="wiki-chip-btn wiki-no-print"
          aria-label={myFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={!!myFavorite}
          onClick={() =>
            toggleFavorite.mutate({ documentId: page.id, favoriteId: myFavorite?.id })
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 8px',
            border: '1px solid var(--ds-border)',
            borderRadius: 6,
            background: 'var(--ds-surface)',
            color: myFavorite ? 'var(--ds-icon-warning)' : 'var(--ds-icon-subtle)',
            cursor: 'pointer',
            font: 'var(--ds-font-body-small)',
          }}
        >
          {myFavorite ? (
            <Star style={{ width: 16, height: 16 }} />
          ) : (
            <StarOff style={{ width: 16, height: 16 }} />
          )}
        </button>
        <Lozenge appearance={page.published_at ? 'success' : 'default'}>
          {page.published_at ? 'Published' : 'Draft'}
        </Lozenge>
        <DropdownMenu
          aria-label="Page actions"
          placement="bottom-end"
          trigger={() => (
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                border: '1px solid var(--ds-border)',
                borderRadius: 6,
                background: 'var(--ds-surface)',
                color: 'var(--ds-text)',
                font: 'var(--ds-font-body-small)',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Actions ▾
            </button>
          )}
          shouldRenderToParent={false}
          groups={[
            {
              key: 'export',
              title: 'Export',
              items: [
                { key: 'md', label: 'Markdown (.md)', onClick: () => runExport('md') },
                { key: 'html', label: 'HTML (.html)', onClick: () => runExport('html') },
                { key: 'pdf', label: 'Print or save as PDF', onClick: () => runExport('print') },
              ],
            },
            {
              key: 'page',
              title: 'Page',
              items: [
                {
                  key: 'publish',
                  label: page.published_at ? 'Revert to draft' : 'Publish',
                  onClick: () => togglePublish(),
                },
                { key: 'duplicate', label: 'Duplicate', onClick: () => duplicateNow() },
                {
                  key: 'width',
                  label: fullWidth ? 'Standard width' : 'Full width',
                  onClick: () => toggleFullWidth(),
                },
                { key: 'history', label: 'Version history', onClick: () => setHistoryOpen(true) },
                { key: 'save-version', label: 'Save version now', onClick: () => snapshotNow('Manual save point') },
              ],
            },
          ]}
        />
      </div>

      {/* ── Cover zone ── */}
      <div
        className="wiki-cover wiki-no-print"
        style={{
          position: 'relative',
          // No cover = no dead band above the title: the page starts at the
          // top of the viewport (Vikram 2026-07-06 — title was mid-screen).
          height: page.cover_url ? 200 : 0,
          marginTop: 8,
          ...(page.cover_url
            ? { backgroundImage: `url(${page.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: 'transparent' }),
        }}
      >
        <div
          className="wiki-cover__actions"
          style={{
            position: 'absolute',
            bottom: 10,
            insetInlineEnd: 40,
            display: 'flex',
            gap: 8,
          }}
        >
          <button type="button" className="wiki-chip-btn" onClick={() => setCoverPickerOpen((v) => !v)}>
            <ImageIcon style={{ width: 13, height: 13 }} /> {page.cover_url ? 'Change cover' : 'Add cover'}
          </button>
          {page.cover_url && (
            <button type="button" className="wiki-chip-btn" onClick={() => commitCover(null)}>
              Remove
            </button>
          )}
        </div>
        {coverPickerOpen && (
          <div
            role="dialog"
            aria-label="Page cover"
            style={{
              position: 'absolute',
              bottom: 44,
              insetInlineEnd: 40,
              zIndex: 20,
              padding: 12,
              borderRadius: 10,
              border: '1px solid var(--ds-border)',
              background: 'var(--ds-surface-raised)',
              boxShadow: 'var(--ds-shadow-overlay)',
              width: 300,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
              {WIKI_COVERS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label="Choose cover"
                  onClick={() => commitCover(c)}
                  style={{ height: 40, borderRadius: 6, border: '1px solid var(--ds-border)', background: c, cursor: 'pointer' }}
                />
              ))}
            </div>
            <Input
              placeholder="…or paste an image URL"
              aria-label="Cover image URL"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = (e.target as HTMLInputElement).value.trim();
                  if (v) commitCover(v);
                }
              }}
            />
          </div>
        )}
      </div>

      <div
        ref={columnRef}
        // LEFT-aligned (margin 0, not auto-centered): Catalyst pages use the
        // viewport like the rest of the app, not a floating island
        // (Vikram 2026-07-06 — "go page width", title top-left).
        style={{ maxWidth: fullWidth ? 'none' : 980, width: '100%', margin: 0, padding: '0 40px 96px' }}
      >
        {/* Hover action bar (Notion) — appears above the title */}
        <div
          className="wiki-titlebar wiki-no-print"
          style={{ display: 'flex', gap: 8, minHeight: 26, marginTop: page.cover_url ? 14 : 4, marginBottom: 2 }}
        >
          {!page.icon && (
            <button type="button" className="wiki-hover-action" onClick={addRandomEmojiIcon}>
              <SmileIcon style={{ width: 15, height: 15 }} /> Add icon
            </button>
          )}
          {!page.cover_url && (
            <button type="button" className="wiki-hover-action" onClick={() => setCoverPickerOpen(true)}>
              <ImageIcon style={{ width: 15, height: 15 }} /> Add cover
            </button>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: page.cover_url ? -60 : 0,
            marginBottom: 4,
            position: 'relative',
          }}
        >
          {page.icon ? (
            <button
              type="button"
              aria-label="Change page icon"
              onClick={() => {
                setIconDraft(page.icon ?? '');
                setIconPickerOpen((v) => !v);
              }}
              className="wiki-no-print wiki-icon-btn"
              style={{
                border: 'none',
                background: page.cover_url ? 'var(--ds-surface)' : 'transparent',
                borderRadius: 14,
                padding: page.cover_url ? 6 : 0,
                cursor: 'pointer',
                fontSize: 64,
                lineHeight: 1,
                boxShadow: page.cover_url ? 'var(--ds-shadow-overlay)' : 'none',
              }}
            >
              {page.icon}
            </button>
          ) : null}
          {iconPickerOpen && (
            <div
              role="dialog"
              aria-label="Page icon"
              style={{
                position: 'absolute',
                top: '100%',
                insetInlineStart: 0,
                zIndex: 20,
                marginTop: 6,
                padding: 10,
                borderRadius: 8,
                border: '1px solid var(--ds-border)',
                background: 'var(--ds-surface-raised)',
                boxShadow: 'var(--ds-shadow-overlay)',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <Input
                autoFocus
                value={iconDraft}
                onChange={(e) => setIconDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitIcon(iconDraft.trim() || null);
                  if (e.key === 'Escape') setIconPickerOpen(false);
                }}
                placeholder="Paste or type an emoji"
                aria-label="Page icon emoji"
                style={{ width: 190 }}
              />
              <button
                type="button"
                onClick={() => commitIcon(iconDraft.trim() || null)}
                style={{
                  border: '1px solid var(--ds-border)',
                  borderRadius: 4,
                  background: 'transparent',
                  color: 'var(--ds-text)',
                  font: 'var(--ds-font-body-small)',
                  padding: '5px 10px',
                  cursor: 'pointer',
                }}
              >
                Set
              </button>
              {page.icon && (
                <button
                  type="button"
                  onClick={() => commitIcon(null)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--ds-text-subtle)',
                    font: 'var(--ds-font-body-small)',
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </div>

        <input
          className="wiki-title-input"
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
            /* ads-scanner:ignore-next-line — ADS heading token shorthand (font:), Notion-scale page title */
            font: 'var(--ds-font-heading-xxlarge)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            padding: 0,
            margin: '2px 0 6px',
          }}
        />

        <p
          className="wiki-no-print"
          style={{ margin: '0 0 20px', color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)' }}
          title={new Date(page.updated_at).toLocaleString()}
        >
          Edited {relativeTime(page.updated_at)}
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
            {draft && (
              <div
                role="status"
                className="wiki-no-print"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  margin: '0 0 14px',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: 'var(--ds-background-warning)',
                  color: 'var(--ds-text)',
                  font: 'var(--ds-font-body-small)',
                }}
              >
                <span style={{ flex: 1 }}>
                  Unsaved changes from {new Date(draft.savedAt).toLocaleTimeString()} were recovered on this
                  device.
                </span>
                <button
                  type="button"
                  onClick={restoreDraft}
                  style={{
                    border: '1px solid var(--ds-border)',
                    borderRadius: 4,
                    background: 'var(--ds-surface)',
                    color: 'var(--ds-text)',
                    font: 'var(--ds-font-body-small)',
                    padding: '3px 10px',
                    cursor: 'pointer',
                  }}
                >
                  Restore
                </button>
                <button
                  type="button"
                  onClick={discardDraft}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--ds-text-subtle)',
                    font: 'var(--ds-font-body-small)',
                    cursor: 'pointer',
                  }}
                >
                  Discard
                </button>
              </div>
            )}
            {saveFailed && !conflictDoc && (
              <div
                role="status"
                className="wiki-no-print"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  margin: '0 0 14px',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--ds-border)',
                  background: 'var(--ds-background-warning)',
                }}
              >
                <span style={{ color: 'var(--ds-text)', font: 'var(--ds-font-body-small)', flex: 1 }}>
                  Changes aren’t reaching the server — retrying. Everything you type stays
                  safe on this device.
                </span>
              </div>
            )}
            {conflictDoc && (
              <div
                role="alert"
                className="wiki-no-print"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  margin: '0 0 14px',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--ds-border-danger)',
                  background: 'var(--ds-background-danger)',
                }}
              >
                <span style={{ color: 'var(--ds-text)', font: 'var(--ds-font-body-small)', flex: 1 }}>
                  This page was changed by someone else while you were editing.
                </span>
                <button
                  type="button"
                  onClick={() => resolveConflict(true)}
                  style={{
                    border: '1px solid var(--ds-border)',
                    borderRadius: 4,
                    background: 'var(--ds-surface)',
                    color: 'var(--ds-text)',
                    font: 'var(--ds-font-body-small)',
                    padding: '3px 10px',
                    cursor: 'pointer',
                  }}
                >
                  Keep my version
                </button>
                <button
                  type="button"
                  onClick={() => resolveConflict(false)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--ds-text-subtle)',
                    font: 'var(--ds-font-body-small)',
                    cursor: 'pointer',
                  }}
                >
                  Load theirs
                </button>
              </div>
            )}
            <div>
              {showInvite && (
                <p
                  dir="auto"
                  style={{
                    margin: '0 0 4px',
                    color: 'var(--ds-text-subtlest)',
                    font: 'var(--ds-font-body)',
                    userSelect: 'none',
                  }}
                >
                  Start writing, or type{' '}
                  <kbd
                    style={{
                      font: 'var(--ds-font-body-small)',
                      border: '1px solid var(--ds-border)',
                      borderRadius: 3,
                      padding: '0 4px',
                    }}
                  >
                    /
                  </kbd>{' '}
                  for commands · ابدأ الكتابة، أو اكتب{' '}
                  <kbd
                    style={{
                      font: 'var(--ds-font-body-small)',
                      border: '1px solid var(--ds-border)',
                      borderRadius: 3,
                      padding: '0 4px',
                    }}
                  >
                    /
                  </kbd>{' '}
                  للأوامر
                </p>
              )}
              <WikiEditorBoundary>
                <WikiEditor
                  key={restoredBlocks ? `${page.id}-draft` : page.id}
                  initialContent={restoredBlocks ?? ((page.content as Block[]) ?? undefined)}
                  onChange={handleEditorChange}
                  onReady={handleEditorReady}
                  dictationStyle="brd-page"
                  workspaceId={workspace.id}
                  workspaceSlug={workspace.slug}
                  uploadFile={uploadWikiFile}
                  collab={collab}
                />
              </WikiEditorBoundary>
            </div>
          </Suspense>
        )}

        <BacklinksPanel pageId={page.id} />

        <div className="wiki-no-print" style={{ marginTop: 28, borderTop: '1px solid var(--ds-border)', paddingTop: 20 }}>
          <Suspense fallback={null}>
            <DocumentComments documentId={page.id} />
          </Suspense>
        </div>
      </div>

      <DocexVersionHistory
        page={page}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        getBlocks={currentBlocks}
      />
    </article>
  );
}

export default WikiPageSurface;
