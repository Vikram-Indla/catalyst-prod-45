/**
 * EpicDescriptionEditor — Atlaskit-powered editor for Epic descriptions.
 * Pilot replacement for the TipTap-based CatalystRichTextEditor on Epic only.
 *
 * Wraps `@atlaskit/editor-core` <Editor appearance="comment"> which gives:
 *   - Jira-grade primary toolbar (Tt text-style menu, B/I/U/S, lists, A color,
 *     code, link, +insert, undo/redo) — NOT a hand-rolled toolbar.
 *   - Built-in Save / Cancel buttons matching Jira chrome.
 *   - Native ADF JSON output via `EditorActions.getValue()`.
 *
 * Image handling:
 *   - The Atlaskit media plugin requires a MediaProvider backed by Atlassian
 *     Media Services, which Catalyst does not run. We omit `media` config
 *     and intercept paste / drop of image files at the wrapper level — they
 *     upload to Supabase via the existing `description-images` bucket and
 *     are inserted as ADF `mediaSingle > media[type=external, url=...]`,
 *     the same shape AtlaskitRenderer renders without a MediaProvider.
 *   - A primary-toolbar "Image" button opens a file picker for the same path.
 *
 * Data contract preserved end-to-end:
 *   - Input: ADF JSON object/string from `ph_issues.description_adf`.
 *   - Output: ADF JSON string passed to `onSave`, parsed by the existing
 *     CatalystDescriptionSection mutation and stored back in `description_adf`.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Editor, type EditorActions } from '@atlaskit/editor-core';
import type { ADFEntity } from '@atlaskit/adf-utils/types';
import { IntlProvider } from 'react-intl-next';
import { normalizeAdfForAtlaskit, parseStoredDescriptionToAdf } from './adfNormalizer';
import { uploadDescriptionImage } from './supabaseImageUpload';

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

export default function EpicDescriptionEditor({
  initialContent,
  onSave,
  onCancel,
  workItemId,
  placeholder = 'Add a description...',
}: EpicDescriptionEditorProps) {
  const initialAdf = useMemo(() => parseStoredDescriptionToAdf(initialContent), [initialContent]);
  const defaultValueString = useMemo(() => JSON.stringify(initialAdf), [initialAdf]);

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

  return (
    <IntlProvider locale="en">
      <div ref={wrapperRef} className="epic-desc-atlaskit-wrapper" style={{ position: 'relative' }}>
        <Editor
          appearance="comment"
          defaultValue={defaultValueString}
          placeholder={placeholder}
          onSave={handleEditorSave}
          onCancel={onCancel}
          onEditorReady={handleEditorReady}
          allowTextColor
          allowTextAlignment
          allowIndentation
          allowRule
          allowTables={{ advanced: false }}
          allowPanel
          allowTasksAndDecisions
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
