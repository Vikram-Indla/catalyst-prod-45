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
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ADFEntity } from '@atlaskit/adf-utils/types';
import { IntlProvider } from 'react-intl-next';
import { normalizeAdfForAtlaskit, parseStoredDescriptionToAdf } from './adfNormalizer';
import { uploadDescriptionImage } from './supabaseImageUpload';

// Lazy-load @atlaskit/editor-core to avoid eager ProseMirror bundling
// (prevents "Duplicate use of selection JSON ID cell" collision with Tiptap).
const LazyEditor = lazy(async () => {
  const mod = await import('@atlaskit/editor-core');
  return { default: mod.Editor as unknown as React.ComponentType<any> };
});

// Local type alias — avoid eager type import from @atlaskit/editor-core.
type EditorActions = {
  getValue: () => Promise<any>;
  replaceSelection: (node: any) => void;
};

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
}

function buildExternalMediaSingle(url: string, filename: string, width?: number, height?: number): ADFEntity {
  return {
    type: 'mediaSingle',
    attrs: { layout: 'center' },
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

/** Walk an ADF doc and return a { nodeType -> count } map. Diagnostic-
 *  only: used to log the view→edit normalization delta so we can see,
 *  without a debugger, when a node type is being dropped before the
 *  editor mounts. */
function countNodeTypes(input: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  const walk = (n: any) => {
    if (!n || typeof n !== 'object') return;
    if (typeof n.type === 'string') {
      out[n.type] = (out[n.type] ?? 0) + 1;
    }
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(input);
  return out;
}

export default function EpicDescriptionEditor({
  initialContent,
  onSave,
  onCancel,
  workItemId,
  placeholder = 'Add a description...',
  onChange,
}: EpicDescriptionEditorProps) {
  const initialAdf = useMemo(() => parseStoredDescriptionToAdf(initialContent), [initialContent]);
  const defaultValueString = useMemo(() => JSON.stringify(initialAdf), [initialAdf]);

  /* 2026-04-20 — Diagnostic: log the node-type histogram before and
     after normalization so content-loss issues (view shows more than
     edit) are traceable from the console. A single `console.info` per
     mount is cheap and drops out in production builds via tree-shaking
     of `import.meta.env.DEV`-gated code. We keep it unconditionally
     info-level because the user has explicitly reported a content-loss
     class of bug. */
  useEffect(() => {
    const raw = typeof initialContent === 'string' && initialContent.trim().startsWith('{')
      ? (() => { try { return JSON.parse(initialContent); } catch { return initialContent; } })()
      : initialContent;
    const before = countNodeTypes(raw);
    const after = countNodeTypes(initialAdf);
    const dropped: Record<string, number> = {};
    for (const k of Object.keys(before)) {
      if ((after[k] ?? 0) < before[k]) dropped[k] = before[k] - (after[k] ?? 0);
    }
    // eslint-disable-next-line no-console
    console.info('[EpicDescriptionEditor] normalize', {
      workItemId,
      before,
      after,
      dropped: Object.keys(dropped).length ? dropped : null,
    });
  }, [initialAdf, initialContent, workItemId]);

  const actionsRef = useRef<EditorActions | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleEditorReady = useCallback((actions: EditorActions) => {
    actionsRef.current = actions;
  }, []);

  const insertExternalMedia = useCallback((file: File) => {
    setUploadError(null);
    setUploading(true);
    uploadDescriptionImage(file, { workItemId })
      .then((uploaded) => {
        if (!uploaded) {
          setUploadError('Image upload failed');
          return;
        }
        const node = buildExternalMediaSingle(uploaded.url, uploaded.filename, uploaded.width, uploaded.height);
        actionsRef.current?.replaceSelection(node as any);
      })
      .catch(() => setUploadError('Image upload failed'))
      .finally(() => setUploading(false));
  }, [workItemId]);

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
    const onDrop = (e: DragEvent) => {
      const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      files.forEach(insertExternalMedia);
    };
    root.addEventListener('paste', onPaste, true);
    root.addEventListener('drop', onDrop, true);
    return () => {
      root.removeEventListener('paste', onPaste, true);
      root.removeEventListener('drop', onDrop, true);
    };
  }, [insertExternalMedia]);

  const triggerImagePicker = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) insertExternalMedia(file);
    };
    input.click();
  }, [insertExternalMedia]);

  const handleEditorSave = useCallback((_view: any) => {
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
  }, [onSave, initialAdf]);

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
      <div ref={wrapperRef} className="epic-desc-atlaskit-wrapper" style={{ position: 'relative' }}>
        <Suspense fallback={<div style={{ padding: 12, fontSize: 13, color: '#878787' }}>Loading editor…</div>}>
          <LazyEditor
            appearance="comment"
            defaultValue={defaultValueString}
            placeholder={placeholder}
            onSave={handleEditorSave}
            onCancel={onCancel}
            onEditorReady={handleEditorReady}
            onChange={onChange ? handleEditorChange : undefined}
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
            shouldFocus
            primaryToolbarComponents={[
              <button
                key="insert-image"
                type="button"
                onClick={triggerImagePicker}
                disabled={uploading}
                title="Insert image"
                style={{
                  height: 28, padding: '0 8px', borderRadius: 3, border: 'none',
                  background: 'transparent', cursor: uploading ? 'wait' : 'pointer',
                  color: uploading ? '#A5ADBA' : '#42526E', fontSize: 12,
                  fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center',
                }}
              >
                {uploading ? 'Uploading…' : 'Image'}
              </button>,
            ]}
          />
        </Suspense>
        {uploadError && (
          <div role="alert" style={{
            padding: '6px 12px', fontSize: 12, color: '#BF2600',
            background: '#FFEBE6', borderTop: '1px solid #FFBDAD',
          }}>
            {uploadError}
          </div>
        )}
      </div>
    </IntlProvider>
  );
}
