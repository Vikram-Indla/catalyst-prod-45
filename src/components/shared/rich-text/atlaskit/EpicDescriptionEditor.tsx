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
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { normalizeAdfForAtlaskit, parseStoredDescriptionToAdf } from './adfNormalizer';
import { uploadDescriptionImage } from './supabaseImageUpload';
import { watchAndInjectExternalMedia } from './injectExternalMedia';
import { NodeSelection } from '@atlaskit/editor-prosemirror/state';
import {
  createCatalystMentionProvider,
  type CatalystMentionResource,
} from './catalystMentionProvider';

// 2026-05-03 — CONVERTED TO STATIC IMPORT
// TipTap was removed 2026-04-20 (USER DIRECTIVE). The lazy-load was to prevent
// "Duplicate use of selection JSON ID cell" collision with Tiptap's prosemirror
// registration. With TipTap gone, we can load @atlaskit/editor-core eagerly.

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
  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;
    const make = () => {
      const el = document.createElement('span');
      el.style.cssText = 'display:inline-flex;align-items:center;white-space:nowrap;flex-shrink:0';
      return el;
    };
    const attach = () => {
      const buttons = root.querySelectorAll<HTMLButtonElement>(
        '[data-testid="ak-editor-main-toolbar"] button',
      );
      if (buttons.length === 0) return false;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (onImprove && first.parentElement) {
        const improve = make();
        first.parentElement.insertBefore(improve, first);
        setImproveSlot(improve);
      }
      if (last.parentElement) {
        const image = make();
        last.parentElement.insertBefore(image, last.nextSibling);
        setImageSlot(image);
      }
      return true;
    };
    if (attach()) return;
    const obs = new MutationObserver(() => {
      if (attach()) obs.disconnect();
    });
    obs.observe(root, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [onImprove]);

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
          toast.error(`Couldn't upload ${file.name}`);
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
      .catch(() => toast.error(`Couldn't upload ${file.name}`))
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
      toast.error(`Image too large — max 10 MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB)`);
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
      toast.error('Image is still uploading — please wait a moment and save again');
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
        style={{
          position: 'relative',
          // Drop-zone affordance — appears only while a file is being dragged
          // over the editor. ADS tokens make this respect dark mode + theme
          // overrides without hardcoding hex.
          // https://atlassian.design/foundations/tokens
          outline: isDragOver
            ? `2px dashed ${token('color.border.focused', '#388BFF')}`
            : '2px dashed transparent',
          outlineOffset: '2px',
          borderRadius: 3,
          backgroundColor: isDragOver
            ? token('color.background.information.subtle', '#E9F2FF')
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
        {onImprove && improveSlot && createPortal(
          <Button
            appearance="subtle"
            spacing="compact"
            onClick={onImprove}
            iconBefore={(iconProps: React.ComponentProps<typeof WandIcon>) => (
              <WandIcon {...iconProps} label="" />
            )}
          >
            Improve description
          </Button>,
          improveSlot,
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
                fontSize: 13,
                color: token('color.text.subtlest', '#626F86'),
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
              gap: 6,
              fontSize: 11,
              color: token('color.text.subtlest', '#626F86'),
              paddingTop: 4,
              paddingLeft: 2,
              userSelect: 'none',
            }}
          >
            <Spinner size="small" />
            Uploading image…
          </div>
        )}
        {/* H6/H10: idle affordance — tells users they can paste or drag images */}
        {!isDragOver && !uploading && (
          <div
            style={{
              fontSize: 11,
              color: token('color.text.subtlest', '#626F86'),
              paddingTop: 4,
              paddingLeft: 2,
              userSelect: 'none',
            }}
          >
            Tip: paste a screenshot or drag an image into the editor
          </div>
        )}
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
