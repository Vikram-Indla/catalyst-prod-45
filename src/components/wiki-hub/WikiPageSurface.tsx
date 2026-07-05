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
import { ImageIcon, Smile as SmileIcon } from '@/lib/atlaskit-icons';
import { Routes } from '@/lib/routes';
import {
  useUpdateWikiPage,
  type WikiPage,
  type WikiPageSummary,
  type WikiWorkspace,
} from '@/hooks/useWiki';
import { blocksToText } from './editor/blocksToText';
import { clearDraft, getDraft, saveDraft } from './editor/localDraft';
import { attachMarqueeSelection } from './editor/marqueeSelection';
import { syncMentionLinks } from './editor/syncMentionLinks';
import { BacklinksPanel } from './BacklinksPanel';
import { DropdownMenu } from '@/components/ads';
import { Input } from '@/components/ui/input';
import { exportPageHtml, exportPageMarkdown, printPage } from './editor/exportPage';
import { catalystToast } from '@/lib/catalystToast';
import { WikiTranslateBar } from './WikiTranslateBar';
import { GenerateStoriesFromPage } from './GenerateStoriesFromPage';
import { WikiPresence } from './WikiPresence';

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
    updatePage.mutate(
      {
        id: page.id,
        spaceId: page.space_id,
        patch: { content: doc, content_text: blocksToText(doc), content_format: 'blocknote' },
      },
      {
        // Confirmed on the server — the local journal entry is now redundant.
        onSuccess: () => clearDraft(page.id),
      },
    );
    // Mirror @-mention chips into kb_document_links / kb_page_links.
    // Fire-and-forget: link sync must never block or fail the autosave.
    void syncMentionLinks(page.id, doc).catch((e) =>
      console.warn('[wiki] mention link sync failed', e),
    );
  }, [page.id, page.space_id, updatePage]);

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
      void task.catch(() => catalystToast.error('Export failed'));
    },
    [flush, page.title, currentBlocks],
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
        style={{ padding: '12px 40px 0', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Breadcrumbs
            items={crumbs}
            LinkComponent={Link as never}
            aria-label="Page location"
          />
        </div>
        <WikiPresence pageId={page.id} />
        <GenerateStoriesFromPage pageId={page.id} title={page.title} getBlocks={currentBlocks} />
        <WikiTranslateBar title={page.title} getBlocks={currentBlocks} />
        <DropdownMenu
          aria-label="Page actions"
          placement="bottom-end"
          trigger="Export"
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
          ]}
        />
      </div>

      {/* ── Cover zone ── */}
      <div
        className="wiki-cover wiki-no-print"
        style={{
          position: 'relative',
          height: page.cover_url ? 200 : 96,
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
            insetInlineEnd: 'max(40px, calc((100% - 820px) / 2))',
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
              insetInlineEnd: 'max(40px, calc((100% - 820px) / 2))',
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

      <div ref={columnRef} style={{ maxWidth: 820, width: '100%', margin: '0 auto', padding: '0 40px 96px' }}>
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
              <WikiEditor
                key={restoredBlocks ? `${page.id}-draft` : page.id}
                initialContent={restoredBlocks ?? ((page.content as Block[]) ?? undefined)}
                onChange={handleEditorChange}
                onReady={handleEditorReady}
                dictationStyle="brd-page"
                workspaceId={workspace.id}
                workspaceSlug={workspace.slug}
              />
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
    </article>
  );
}

export default WikiPageSurface;
