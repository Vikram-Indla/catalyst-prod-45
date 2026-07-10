// @ts-nocheck
/**
 * EpicDescriptionEditor — Atlaskit-powered editor for Epic descriptions.
 *
 * Wraps `@atlaskit/editor-core` <Editor appearance="comment"> which gives:
 *   - Jira-grade primary toolbar (Tt text-style menu, B/I/U/S, lists, A color,
 *     code, link, +insert, undo/redo) — NOT a hand-rolled toolbar.
 *   - Built-in Save / Cancel buttons matching Jira chrome.
 *   - Native ADF JSON output via `EditorActions.getValue()`.
 *   - Drag-handle block reordering.
 *
 * Image handling:
 *   - Atlaskit's media plugin expects Atlassian Media Services, which
 *     Catalyst does not run. Paste / drop of image files is intercepted
 *     at the wrapper level — they upload to Supabase via the existing
 *     `description-images` bucket and are inserted as ADF
 *     `mediaSingle > media[type=external, url=...]`, the same shape
 *     AtlaskitRenderer renders without a MediaProvider.
 *   - A primary-toolbar "Image" button opens a file picker for the same path.
 *
 * Data contract preserved end-to-end:
 *   - Input: ADF JSON object/string from `ph_issues.description_adf`.
 *   - Output: ADF JSON string passed to `onSave`, parsed by the existing
 *     CatalystDescriptionSection mutation and stored back in `description_adf`.
 */
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ADFEntity } from '@atlaskit/adf-utils/types';
import { Editor } from '@atlaskit/editor-core';
import { IntlProvider } from 'react-intl-next';
import Button from '@atlaskit/button/new';
import ImageIcon from '@atlaskit/icon/core/image';
import EditIcon from '@atlaskit/icon/core/edit';
import WandIcon from '@atlaskit/icon/core/magic-wand';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import { toggleMark as atlaskitToggleMark } from '@atlaskit/editor-common/mark';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import { catalystToast } from '@/lib/catalystToast';
import { supabase } from '@/integrations/supabase/client';
import { normalizeAdfForAtlaskit, parseStoredDescriptionToAdf } from './adfNormalizer';
import { uploadDescriptionImage } from './supabaseImageUpload';
import { watchAndInjectExternalMedia } from './injectExternalMedia';
import { NodeSelection } from '@atlaskit/editor-prosemirror/state';
import {
  createCatalystMentionProvider,
  type CatalystMentionResource,
} from './catalystMentionProvider';
import { useImageToolbarController } from './imageToolbar/useImageToolbarController';
import { ImageToolbar } from './imageToolbar/ImageToolbar';
import type { MinimalEditorView } from './imageToolbar/imageNodeOps';
import { useVoiceToText } from '@/lib/voiceToText/useVoiceToText';

// 2026-05-03 — CONVERTED TO STATIC IMPORT
// TipTap was removed 2026-04-20 (USER DIRECTIVE). The lazy-load was to prevent
// "Duplicate use of selection JSON ID cell" collision with Tiptap's prosemirror
// registration. With TipTap gone, we can load @atlaskit/editor-core eagerly.

/* Toolbar-level CSS — universal across EVERY editor instance.
   Lives here (not in CatalystDescriptionSection) so it injects whenever
   ANY editor mounts: description, comments, create-modal, business-
   request description, admin component previews. The selectors all hang
   off [data-testid="ak-editor-main-toolbar"], which Atlaskit applies to
   the toolbar regardless of appearance ("comment" | "chromeless" |
   "full-page"). Bump TOOLBAR_STYLE_ID to force HMR re-injection. */
const TOOLBAR_STYLE_ID = 'cv-editor-toolbar-styles-v11';
if (typeof document !== 'undefined' && !document.getElementById(TOOLBAR_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = TOOLBAR_STYLE_ID;
  s.textContent = `
    /* Compact text-style trigger (T, H₁-H₆) — replaces Atlaskit's verbose
       "Normal text" / "Heading 1" label and removes both the chevron and
       the leading text/heading icon. The aria-label format used to drive
       ::before content is "{blockTypeName} Text styles" per
       node_modules/@atlaskit/editor-common/dist/cjs/messages/toolbar.js. */

    [data-testid="ak-editor-main-toolbar"] button.block-type-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      min-width: 28px !important;
      width: 28px !important;
      height: 28px !important;
      padding: 0 !important;
      position: relative;
    }
    [data-testid="ak-editor-main-toolbar"] button.block-type-btn > span > div {
      display: none !important;
    }
    [data-testid="ak-editor-main-toolbar"] button.block-type-btn [data-testid="toolbar-block-type-text-styles-icon"] {
      display: none !important;
    }
    [data-testid="ak-editor-main-toolbar"] button.block-type-btn::before {
      content: "T";
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: "Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: var(--ds-text);
      line-height: 1;
      letter-spacing: 0;
      pointer-events: none;
      min-width: 18px;
    }
    [data-testid="ak-editor-main-toolbar"] button.block-type-btn[aria-label*="normal Text styles"]::before { content: "T"; }
    [data-testid="ak-editor-main-toolbar"] button.block-type-btn[aria-label*="smallText Text styles"]::before { content: "T\\209B"; }
    [data-testid="ak-editor-main-toolbar"] button.block-type-btn[aria-label*="heading1 Text styles"]::before { content: "H\\2081"; }
    [data-testid="ak-editor-main-toolbar"] button.block-type-btn[aria-label*="heading2 Text styles"]::before { content: "H\\2082"; }
    [data-testid="ak-editor-main-toolbar"] button.block-type-btn[aria-label*="heading3 Text styles"]::before { content: "H\\2083"; }
    [data-testid="ak-editor-main-toolbar"] button.block-type-btn[aria-label*="heading4 Text styles"]::before { content: "H\\2084"; }
    [data-testid="ak-editor-main-toolbar"] button.block-type-btn[aria-label*="heading5 Text styles"]::before { content: "H\\2085"; }
    [data-testid="ak-editor-main-toolbar"] button.block-type-btn[aria-label*="heading6 Text styles"]::before { content: "H\\2086"; }
    [data-testid="ak-editor-main-toolbar"] button.block-type-btn[aria-label*="blockquote Text styles"]::before { content: "\\275D"; }

    /* Hide the vertical toolbar separator line + shrink its wrapper to a
       tiny gap. data-vc="primary-toolbar-separator" comes from
       node_modules/@atlaskit/editor-plugin-primary-toolbar/dist/cjs/ui/
       separator.js. */
    [data-testid="ak-editor-main-toolbar"] [data-vc="primary-toolbar-separator"] {
      display: none !important;
    }
    [data-testid="ak-editor-main-toolbar"] span:has(> [data-vc="primary-toolbar-separator"]) {
      width: 0 !important;
      min-width: 0 !important;
      max-width: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      overflow: hidden !important;
    }

    /* Hide the entire stock text-formatting cluster (Bold/Italic + the
       responsive "More" overflow). Replaced by our chevron dropdown
       injected via portal. .js-text-format-wrap comes from
       node_modules/@atlaskit/editor-plugin-text-formatting/dist/cjs/ui/Toolbar/index.js. */
    [data-testid="ak-editor-main-toolbar"] .js-text-format-wrap {
      display: none !important;
    }

    /* Hide standalone Code-snippet toolbar button (inline code is in
       our dropdown now). */
    [data-testid="ak-editor-main-toolbar"] button[aria-label*="Code snippet" i],
    [data-testid="ak-editor-main-toolbar"] button[title*="Code snippet" i],
    [data-testid="ak-editor-main-toolbar"] button[aria-label*="Code block" i],
    [data-testid="ak-editor-main-toolbar"] button[title*="Code block" i] {
      display: none !important;
    }

    /* Slot wrapper — center the chevron vertically with T. */
    .cv-editor-format-slot {
      display: inline-flex !important;
      align-items: center !important;
      align-self: center !important;
    }

    /* Chevron trigger — square hit area so hover background has equal
       padding on every side, centered both axes. */
    .cv-tfmt-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--ds-text);
      border-radius: 3px;
      cursor: pointer;
    }
    .cv-tfmt-trigger:hover {
      background: var(--ds-background-neutral-subtle-hovered);
    }
    .cv-tfmt-trigger[aria-expanded="true"] {
      background: var(--ds-background-selected);
      color: var(--ds-text-selected);
    }
    /* Force chevron SVG size — size="large" on the icon prop wasn't
       picking up in this Atlaskit version, so we set it explicitly. */
    .cv-tfmt-trigger svg {
      width: 24px !important;
      height: 24px !important;
    }

    /* Self-rolled popover panel. position: fixed so it escapes toolbar
       overflow:hidden; coords are viewport-relative. */
    .cv-tfmt-popover {
      position: fixed;
      z-index: 2147483600;
      min-width: 240px;
      background: var(--ds-surface-overlay);
      border: 1px solid var(--ds-border);
      border-radius: 4px;
      box-shadow: 0 4px 8px -2px var(--ds-shadow-raised), 0 0 1px var(--ds-shadow-raised);
      padding: 4px 0;
      font-family: "Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif;
    }
    .cv-tfmt-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 4px 12px;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 14px;
      color: var(--ds-text);
      text-align: left;
    }
    .cv-tfmt-item:hover {
      background: var(--ds-background-neutral-subtle-hovered);
    }
    .cv-tfmt-glyph {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      font-size: 14px;
      font-weight: 500;
      color: var(--ds-text-subtle);
      flex-shrink: 0;
    }
    .cv-tfmt-glyph--bold { font-weight: 700; }
    .cv-tfmt-glyph--italic { font-style: italic; }
    .cv-tfmt-glyph--underline { text-decoration: underline; }
    .cv-tfmt-glyph--strike { text-decoration: line-through; }
    .cv-tfmt-glyph--code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
    .cv-tfmt-label { flex: 1; }
    .cv-tfmt-kbd {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      font-size: 11px;
      font-weight: 500;
      color: var(--ds-text-subtle);
      background: var(--ds-background-neutral);
      padding: 0px 6px;
      border-radius: 3px;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(s);
}

/* Platform-aware modifier label. Mac uses ⌘ + ⇧, everyone else uses
   Ctrl + Shift. Matches what Atlaskit's own help-dialog renders. */
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = IS_MAC ? '⌘' : 'Ctrl';
const SHIFT = IS_MAC ? '⇧' : 'Shift';

/**
 * TextFormatDropdown — replaces Atlaskit's stock Bold/Italic/More cluster
 * with a single chevron trigger and Jira-parity menu (Bold, Italic,
 * Underline, Strikethrough, Code, Subscript, Superscript).
 *
 * Self-rolled popover (NOT @atlaskit/dropdown-menu) to keep the toolbar
 * bundle light — every editor instance (description + every comment)
 * gets this dropdown, so a heavy dropdown component multiplied 10× on
 * the page was tanking the UI thread.
 *
 * Each item dispatches Atlaskit's toggleMark (editor-common/mark)
 * against the live editor view so selection-vs-cursor semantics and
 * subsup swap behavior match the keyboard shortcuts exactly. */
const FORMAT_ITEMS = [
  { name: 'strong', label: 'Bold', glyph: 'B', glyphMod: 'bold', shortcut: 'B' },
  { name: 'em', label: 'Italic', glyph: 'I', glyphMod: 'italic', shortcut: 'I' },
  { name: 'underline', label: 'Underline', glyph: 'U', glyphMod: 'underline', shortcut: 'U' },
  { name: 'strike', label: 'Strikethrough', glyph: 'S', glyphMod: 'strike', shortcut: 'Shift+S' },
  { name: 'code', label: 'Code', glyph: '</>', glyphMod: 'code', shortcut: 'Shift+M' },
  { name: 'subsup', attrs: { type: 'sub' }, label: 'Subscript', glyph: 'X₁', glyphMod: '', shortcut: 'Shift+,' },
  { name: 'subsup', attrs: { type: 'sup' }, label: 'Superscript', glyph: 'X¹', glyphMod: '', shortcut: 'Shift+.' },
] as const;

function TextFormatDropdown({ getView }: { getView: () => any }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const dispatchToggle = useCallback(
    (markName: string, attrs?: Record<string, unknown>) => {
      const view = getView();
      if (!view) return;
      const markType = view.state.schema.marks[markName];
      if (!markType) return;
      const tr = view.state.tr;
      const result = atlaskitToggleMark(markType, attrs)({ tr });
      if (result) view.dispatch(result);
      view.focus();
      setOpen(false);
    },
    [getView],
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="cv-tfmt-trigger"
        aria-label="More text formatting"
        aria-expanded={open}
        title="More text formatting"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDownIcon label="" size="large" />
      </button>
      {open && (() => {
        // Portal to document.body so position:fixed is honored regardless
        // of any transform/filter/will-change applied by ancestors of the
        // toolbar (which would otherwise re-anchor fixed positioning).
        const rect = triggerRef.current?.getBoundingClientRect();
        return createPortal(
          <div
            ref={popRef}
            className="cv-tfmt-popover"
            style={{
              top: (rect?.bottom ?? 0) + 4,
              left: rect?.left ?? 0,
            }}
            role="menu"
          >
            {FORMAT_ITEMS.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className="cv-tfmt-item"
                onClick={() => dispatchToggle(item.name, (item as any).attrs)}
              >
                <span className={`cv-tfmt-glyph${item.glyphMod ? ' cv-tfmt-glyph--' + item.glyphMod : ''}`}>
                  {item.glyph}
                </span>
                <span className="cv-tfmt-label">{item.label}</span>
                <span className="cv-tfmt-kbd">{`${MOD}+${item.shortcut}`}</span>
              </button>
            ))}
          </div>,
          document.body,
        );
      })()}
    </>
  );
}

// Local type alias — avoid eager type import from @atlaskit/editor-core.
type EditorActions = {
  getValue: () => Promise<any>;
  replaceSelection: (node: any) => void;
};

/**
 * Metadata emitted after an inline image successfully uploads to Supabase
 * Storage. The caller decides which table to write the metadata into:
 *   - work-item modals (CatalystDescriptionSection, IssueContentView) →
 *     insert a row in `ph_attachments` so the file appears in the rail
 *     side-by-side with loose attachments (Jira-parity body↔rail binding).
 *   - business-request flow → insert into `business_request_links`.
 *   - Create modal ("new" workItemId) → defer until the entity is created,
 *     or skip entirely.
 *
 * This callback is the canonical hook for keeping the editor body and the
 * attachments rail in sync: both surfaces read from the same source of
 * truth, so an image dropped into the body is also listed in the rail
 * (and downloadable via the rail's preview / download-all flow).
 */
export interface AttachmentUploadMeta {
  storagePath: string;
  publicUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
}

/* Mention provider lives in ./catalystMentionProvider.ts. */

export interface EpicDescriptionEditorProps {
  /** Raw stored description (ADF object, ADF JSON string, or null). */
  initialContent: unknown;
  /** Called with serialized ADF JSON string when the user clicks Save. */
  onSave: (adfJson: string) => void;
  /** Called when the user clicks Cancel. */
  onCancel: () => void;
  /** Work item id — used to scope uploaded image paths. */
  workItemId: string;
  placeholder?: string;
  /**
   * Optional: fired on every editor change (for Create modal auto-sync).
   * Receives the serialized ADF JSON string.
   */
  onChange?: (adfJson: string) => void;
  /**
   * Editor appearance. Use 'chromeless' in Create modals to hide the built-in
   * Save/Cancel buttons (the modal footer handles submit). Defaults to 'comment'.
   */
  appearance?: 'comment' | 'chromeless' | 'full-page';
  /**
   * Fired after an inline image successfully uploads. Caller is responsible
   * for inserting the metadata into the appropriate domain table so the
   * attachments rail re-renders with the new file. See AttachmentUploadMeta.
   */
  onAttachmentUploaded?: (meta: AttachmentUploadMeta) => void;
  onImprove?: () => void;
  improveLabel?: string;
  improveDisabled?: boolean;
  /** Issue data for GenerateStoriesButton in toolbar. */
  issue?: {
    id?: string;
    issue_key?: string | null;
    issue_type?: string | null;
    summary?: string | null;
    description_text?: string | null;
    description_adf?: unknown | null;
    project_key?: string | null;
    project_id?: string | null;
    source?: 'jira' | 'catalyst' | string | null;
    assignee_account_id?: string | null;
  } | null;
  /**
   * Content that covers the ProseMirror body while the toolbar stays
   * visible. Used by the "Improve description" flow to render the
   * muted snapshot + streaming output + status strap inside the same
   * editor surface, so nothing escapes the description boundary.
   */
  bodyOverlay?: React.ReactNode;
}

const DEFAULT_MEDIA_PIXEL_WIDTH = 500;

function buildExternalMediaSingle(url: string, filename: string, width?: number, height?: number): ADFEntity {
  return {
    type: 'mediaSingle',
    attrs: {
      layout: 'center',
      width: DEFAULT_MEDIA_PIXEL_WIDTH,
      widthType: 'pixel',
    },
    content: [
      {
        type: 'media',
        attrs: {
          type: 'external',
          url,
          alt: filename,
          width,
          height,
        },
      },
    ],
  };
}

function EpicDescriptionEditorImpl({
  initialContent,
  onSave,
  onCancel,
  workItemId,
  placeholder = 'Add a description...',
  onChange,
  appearance: appearanceProp = 'comment',
  onAttachmentUploaded,
  onImprove,
  improveLabel = 'Improve',
  improveDisabled = false,
  bodyOverlay,
  issue,
}: EpicDescriptionEditorProps) {
  const initialAdf = useMemo(() => parseStoredDescriptionToAdf(initialContent), [initialContent]);
  const defaultValueString = useMemo(() => JSON.stringify(initialAdf), [initialAdf]);

  const actionsRef = useRef<EditorActions | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const mentionProviderRef = useRef<CatalystMentionResource | null>(null);
  if (!mentionProviderRef.current) {
    mentionProviderRef.current = createCatalystMentionProvider();
  }
  const mentionProvider = mentionProviderRef.current;
  const mentionProviderPromise = useMemo(
    () => Promise.resolve(mentionProvider),
    [mentionProvider],
  );

  const adfDocRef = useRef<unknown>(initialAdf);
  useEffect(() => {
    adfDocRef.current = initialAdf;
  }, [initialAdf]);

  const [improveSlot, setImproveSlot] = useState<HTMLElement | null>(null);
  const [imageSlot, setImageSlot] = useState<HTMLElement | null>(null);
  const [formatSlot, setFormatSlot] = useState<HTMLElement | null>(null);
  const [bodySlot, setBodySlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;
    const find = () => {
      const pm = root.querySelector<HTMLElement>('.ProseMirror');
      if (pm && pm.parentElement) {
        setBodySlot(pm.parentElement);
        return true;
      }
      return false;
    };
    if (find()) return;
    const obs = new MutationObserver(() => {
      if (find()) obs.disconnect();
    });
    obs.observe(root, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;
    const make = (cls?: string) => {
      const el = document.createElement('span');
      el.style.cssText = 'display:inline-flex;align-items:center;white-space:nowrap;flex-shrink:0';
      if (cls) el.className = cls;
      return el;
    };
    let currentImprove: HTMLElement | null = null;
    let currentImage: HTMLElement | null = null;
    let currentFormat: HTMLElement | null = null;
    const attach = () => {
      const toolbar = root.querySelector<HTMLElement>(
        '[data-testid="ak-editor-main-toolbar"]',
      );
      if (!toolbar) return false;
      const buttons = toolbar.querySelectorAll<HTMLButtonElement>('button');
      if (buttons.length === 0) return false;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      // Re-inject the Improve slot whenever Atlaskit rebuilds the toolbar
      // (it does this on every focus / selection change, which used to
      // make the "Improve description" pill vanish on first click).
      if (first.parentElement && (!currentImprove || !currentImprove.isConnected)) {
        currentImprove = make();
        first.parentElement.insertBefore(currentImprove, first);
        setImproveSlot(currentImprove);
      }
      // Format slot — visually sits where stock Bold was (we hide the
      // .js-text-format-wrap cluster via CSS). Insert as a sibling of
      // that cluster, no DOM-walking. If the cluster isn't there yet,
      // we'll try again on the next mutation.
      const fmtWrap = toolbar.querySelector<HTMLElement>('.js-text-format-wrap');
      if (fmtWrap && fmtWrap.parentElement && (!currentFormat || !currentFormat.isConnected)) {
        currentFormat = make('cv-editor-format-slot');
        fmtWrap.parentElement.insertBefore(currentFormat, fmtWrap);
        setFormatSlot(currentFormat);
      }
      if (last.parentElement && (!currentImage || !currentImage.isConnected)) {
        currentImage = make();
        last.parentElement.insertBefore(currentImage, last.nextSibling);
        setImageSlot(currentImage);
      }
      return true;
    };
    attach();
    const obs = new MutationObserver(() => {
      attach();
    });
    obs.observe(root, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;
    return watchAndInjectExternalMedia(
      root,
      () => adfDocRef.current,
      {
        getView: () => {
          const actions = actionsRef.current as any;
          return actions?._privateGetEditorView?.();
        },
        NodeSelection,
      },
    );
  }, []);

  const dragCounter = useRef(0);

  const handleEditorReady = useCallback((actions: EditorActions) => {
    actionsRef.current = actions;
  }, []);

  const insertExternalMedia = useCallback((file: File) => {
    setUploading(true);
    uploadDescriptionImage(file, { workItemId })
      .then((uploaded) => {
        if (!uploaded) {
          catalystToast.error(`Couldn't upload ${file.name}`);
          return;
        }
        // Notify caller so the attachments rail can stay in sync with the
        // body. Without this, the rail and body are independent surfaces
        // even though they share a bucket — the user sees an inline image
        // that doesn't appear in the rail's "Attachments" list.
        try {
          onAttachmentUploaded?.({
            storagePath: uploaded.storagePath,
            publicUrl: uploaded.url,
            fileName: uploaded.filename,
            fileSize: file.size,
            mimeType: file.type || 'application/octet-stream',
            width: uploaded.width,
            height: uploaded.height,
          });
        } catch {
          // Caller-side errors (DB insert failure) are surfaced by the
          // caller's own error handler. The image is still in the bucket
          // and inserted into the body — the rail will catch up on reload.
        }
        const node = buildExternalMediaSingle(uploaded.url, uploaded.filename, uploaded.width, uploaded.height);
        actionsRef.current?.replaceSelection(node as any);
        actionsRef.current?.getValue().then((doc) => {
          adfDocRef.current = doc;
        }).catch(() => { /* noop */ });
      })
      .catch(() => catalystToast.error(`Couldn't upload ${file.name}`))
      .finally(() => setUploading(false));
  }, [workItemId, onAttachmentUploaded]);

  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((i) => i.type.startsWith('image/'));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;
      e.preventDefault();
      e.stopPropagation();
      insertExternalMedia(file);
    };
    // Drop-zone affordance: track dragenter/dragleave at counter level so
    // bubbling through nested elements doesn't flicker the overlay. The
    // dragover handler is required to make the area droppable at all.
    const onDragEnter = (e: DragEvent) => {
      if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
      e.preventDefault();
      dragCounter.current += 1;
      setIsDragOver(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) setIsDragOver(false);
    };
    const onDragOver = (e: DragEvent) => {
      if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
      e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
      dragCounter.current = 0;
      setIsDragOver(false);
      if (files.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      files.forEach(insertExternalMedia);
    };
    root.addEventListener('paste', onPaste, true);
    root.addEventListener('dragenter', onDragEnter, true);
    root.addEventListener('dragleave', onDragLeave, true);
    root.addEventListener('dragover', onDragOver, true);
    root.addEventListener('drop', onDrop, true);
    return () => {
      root.removeEventListener('paste', onPaste, true);
      root.removeEventListener('dragenter', onDragEnter, true);
      root.removeEventListener('dragleave', onDragLeave, true);
      root.removeEventListener('dragover', onDragOver, true);
      root.removeEventListener('drop', onDrop, true);
    };
  }, [insertExternalMedia]);

  const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

  const triggerImagePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so the same file can be re-selected after cancel
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      catalystToast.error(`Image too large — max 10 MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB)`);
      return;
    }
    insertExternalMedia(file);
  }, [insertExternalMedia]);

  // Escape key — close editor without saving (Jira parity).
  // Capture phase beats @atlaskit/modal-dialog's bubble-phase handler so
  // pressing Escape collapses the editor, not the parent modal.
  // Guard: only add when appearance has Save/Cancel chrome (not chromeless).
  useEffect(() => {
    if (appearanceProp === 'chromeless') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onCancel();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onCancel, appearanceProp]);

  const handleEditorSave = useCallback((_view: any) => {
    if (uploading) {
      catalystToast.error('Image is still uploading — please wait a moment and save again');
      return;
    }
    const actions = actionsRef.current;
    if (!actions) {
      onSave(JSON.stringify(initialAdf));
      return;
    }
    actions
      .getValue()
      .then((doc) => {
        const normalized = normalizeAdfForAtlaskit(doc);
        onSave(JSON.stringify(normalized));
      })
      .catch(() => onSave(JSON.stringify(initialAdf)));
  }, [onSave, initialAdf, uploading]);

  // BEH-001: Debounce onChange to avoid queuing dozens of async getValue()
  // calls on rapid keystrokes. 300ms is a good balance between responsiveness
  // and performance for large documents. Final value also flushes on explicit
  // Save (handleEditorSave) so nothing is lost if debounce hasn't fired yet.
  const onChangeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEditorChange = useCallback(() => {
    if (!onChange) return;
    const actions = actionsRef.current;
    if (!actions) return;

    if (onChangeDebounceRef.current) clearTimeout(onChangeDebounceRef.current);
    onChangeDebounceRef.current = setTimeout(() => {
      actions.getValue().then((doc) => {
        try {
          const normalized = normalizeAdfForAtlaskit(doc);
          onChange(JSON.stringify(normalized));
        } catch { /* noop */ }
      }).catch(() => {});
    }, 300);
  }, [onChange]);

  // Custom image toolbar — replaces Atlaskit's native floating-toolbar
  // for image selections. The controller injects a slot div into the
  // editor's DOM right after the clicked image; the toolbar renders
  // into that slot via portal so it sits on its own line under the
  // image and scrolls with it naturally. See imageToolbar/README.
  const { selection: imageSelection, dismiss: dismissImageToolbar } =
    useImageToolbarController({
      editorRootRef: wrapperRef,
      enabled: true,
    });
  const getEditorView = useCallback((): MinimalEditorView | null => {
    const actions = actionsRef.current as any;
    return actions?._privateGetEditorView?.() ?? null;
  }, []);

  const {
    isSupported: voiceSupported,
    isRecording: voiceRecording,
    interimText: voiceInterim,
  } = useVoiceToText({
    editorRootRef: wrapperRef,
    getEditorView,
    enabled: true,
  });

  return (
    <IntlProvider locale="en">
      {/* Hidden file input — always in DOM so .click() works in all browsers */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
      <div
        ref={wrapperRef}
        className="epic-desc-atlaskit-wrapper"
        data-has-body-overlay={bodyOverlay ? '' : undefined}
        style={{
          position: 'relative',
          // Drop-zone affordance — appears only while a file is being dragged
          // over the editor. ADS tokens make this respect dark mode + theme
          // overrides without hardcoding hex.
          // https://atlassian.design/foundations/tokens
          outline: isDragOver
            ? `2px dashed ${token('color.border.focused', 'var(--ds-border-focused)')}`
            : '2px dashed transparent',
          outlineOffset: '2px',
          borderRadius: 3,
          backgroundColor: isDragOver
            ? token('color.background.information.subtle', 'var(--ds-background-selected)')
            : 'transparent',
          // ADS motion — hover-curve, 150ms.
          // https://atlassian.design/foundations/motion
          transition: 'outline-color 150ms cubic-bezier(0.15,1,0.3,1), background-color 150ms cubic-bezier(0.15,1,0.3,1)',
          // Perf — `contain: content` (= layout + paint + style) tells
          // the browser that paints and layout invalidations inside
          // ProseMirror cannot affect anything outside this wrapper. On
          // a 2026-05-12 trace the editor was burning ~2.7s of
          // "unattributed" main-thread time per ~12s session — almost
          // entirely browser-internal layout/paint cascading up the
          // detail-view tree as the user scrolled and typed. Containment
          // chops that cascade off at the wrapper boundary. Crucially we
          // do NOT include `size` — the wrapper still needs to grow
          // with the editor's content height.
          contain: 'content',
        }}
      >
        {formatSlot && createPortal(
          <TextFormatDropdown getView={getEditorView} />,
          formatSlot,
        )}
        {imageSlot && createPortal(
          <Button
            appearance="subtle"
            spacing="compact"
            isDisabled={uploading}
            onClick={triggerImagePicker}
            aria-label={uploading ? 'Uploading image' : 'Insert image'}
            title={uploading ? 'Uploading image' : 'Insert image'}
            iconBefore={
              uploading
                ? (() => <Spinner size="small" />)
                : (iconProps: React.ComponentProps<typeof ImageIcon>) => (
                    <ImageIcon {...iconProps} label="" />
                  )
            }
          />,
          imageSlot,
        )}
        <Suspense
          fallback={
            <div
              style={{
                padding: 12,
                fontSize: 'var(--ds-font-size-300)',
                color: token('color.text.subtlest', 'var(--ds-icon-subtle)'),
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
              role="status"
              aria-live="polite"
            >
              <Spinner size="small" />
              <span>Loading editor…</span>
            </div>
          }
        >
          <Editor
            appearance={appearanceProp}
            defaultValue={defaultValueString}
            placeholder={placeholder}
            onSave={appearanceProp !== 'chromeless' ? handleEditorSave : undefined}
            onCancel={appearanceProp !== 'chromeless' ? onCancel : undefined}
            onEditorReady={handleEditorReady}
            onChange={onChange ? handleEditorChange : undefined}
            popupsMountPoint={typeof document !== 'undefined' ? document.body : undefined}
            mentionProvider={mentionProviderPromise}
            mention={{ insertDisplayName: true }}
            allowTextColor
            allowTextAlignment
            allowIndentation
            allowRule
            allowTables={{ advanced: false }}
            allowPanel
            allowTasksAndDecisions
            /* 2026-04-20 — Broader schema opt-ins. The previous config
               silently dropped expand / nestedExpand, layoutSection /
               layoutColumn, status, date, and breakout-marked nodes on
               load because the Atlaskit schema omits nodes that aren't
               explicitly enabled. That was the cause of the reported
               view→edit content loss (e.g. a description with
               `**System:** …` + an `expand` + `**Figma:** …` round-
               tripped to only the two bold labels). */
            allowExpand
            allowLayouts
            allowStatus
            allowDate
            allowBreakout
            /* media — REQUIRED for ProseMirror to register media/mediaSingle/
               mediaGroup schema nodes. Without this prop, replaceSelection()
               with a mediaSingle node is a silent no-op (unknown node type).
               isExternalMediaUploadDisabled:true suppresses the built-in
               Atlassian Media Services picker — we handle uploads ourselves
               via supabaseImageUpload + the hidden file input.
               Mirror of AtlaskitEditor.tsx mediaOptions. */
            media={{
              allowMediaSingle: true,
              allowMediaGroup: true,
              allowMediaInlineImages: true,
              allowAltTextOnImages: true,
              allowImagePreview: true,
              allowResizing: true,
              enableDownloadButton: false,
              isExternalMediaUploadDisabled: true,
            }}
            /* shouldFocus removed 2026-05-01 — Jira parity. Auto-focusing
               the editor on mount painted a persistent blue focus halo and
               stole focus from the Summary field which is the canonical
               first-focus target in Atlassian's Create dialog. */
          />
        </Suspense>
        {/* Jira-parity: inline upload progress banner replaces Tip text while uploading */}
        {uploading && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 'var(--ds-font-size-100)',
              color: token('color.text.subtlest', 'var(--ds-icon-subtle)'),
              paddingTop: 4,
              paddingLeft: 0,
              userSelect: 'none',
            }}
          >
            <Spinner size="small" />
            Uploading image…
          </div>
        )}
        {!isDragOver && !uploading && !bodyOverlay && (
          <div
            style={{
              fontSize: 'var(--ds-font-size-100)',
              color: token('color.text.subtlest', 'var(--ds-icon-subtle)'),
              paddingTop: 4,
              paddingLeft: 0,
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span>Tip: paste a screenshot or drag an image into the editor</span>
            {voiceSupported && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  color: voiceRecording
                    ? token('color.text.danger', 'var(--ds-text-danger)')
                    : token('color.text.subtlest', 'var(--ds-icon-subtle)'),
                  fontWeight: voiceRecording ? 600 : 400,
                }}
              >
                {voiceRecording ? (
                  <>
                    <span
                      aria-hidden
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: token('color.background.danger.bold', 'var(--ds-background-danger-bold)'),
                        animation: 'cv-voice-pulse 1s ease-in-out infinite',
                      }}
                    />
                    <span>Recording — release Ctrl to stop</span>
                    {voiceInterim && (
                      <span
                        style={{
                          color: token('color.text.subtle', 'var(--ds-text-subtle)'),
                          fontStyle: 'italic',
                          fontWeight: 400,
                          maxWidth: 320,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        "{voiceInterim}"
                      </span>
                    )}
                  </>
                ) : (
                  <span>Hold Ctrl to record voice-to-text</span>
                )}
              </span>
            )}
          </div>
        )}
        {bodyOverlay && bodySlot && createPortal(
          <div className="epic-desc-body-overlay">{bodyOverlay}</div>,
          bodySlot,
        )}
        <ImageToolbar
          selection={imageSelection}
          getEditorView={getEditorView}
          onDismiss={dismissImageToolbar}
        />
      </div>
    </IntlProvider>
  );
}

/*
 * React.memo with the default shallow prop comparison. The parent
 * (CatalystDescriptionSection) re-renders any time React Query
 * invalidates `cv-issue-detail` or any sibling state flips. Without
 * this memo, every parent re-render walks the editor subtree (Suspense
 * boundary, IntlProvider, Atlaskit Editor's huge tree) — work that's
 * pure waste when the props haven't actually changed. Default shallow
 * compare is enough here because:
 *   - `initialContent` is read from `issue.description_adf` which is a
 *     stable reference until a save invalidates the query.
 *   - `onSave`, `onCancel`, `onAttachmentUploaded` are useCallback'd in
 *     the parent.
 *   - `workItemId`, `placeholder`, `appearance` are primitives.
 */
const EpicDescriptionEditor = React.memo(EpicDescriptionEditorImpl);
export default EpicDescriptionEditor;
