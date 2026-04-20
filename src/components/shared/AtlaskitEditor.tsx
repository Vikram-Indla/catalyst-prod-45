/**
 * AtlaskitEditor — Wrapper around @atlaskit/editor-core
 *
 * IMPORTANT: @atlaskit/editor-core bundles its own copy of prosemirror-state.
 * Tiptap (used elsewhere in the app, e.g. StoryDetailModal) bundles another
 * copy. If both load eagerly in the same page, ProseMirror throws
 * `RangeError: Duplicate use of selection JSON ID cell` because each copy
 * registers the same selection IDs into a shared registry.
 *
 * Fix: lazy-load @atlaskit/editor-core via dynamic import so the Atlaskit
 * ProseMirror tree only enters the page when an Atlaskit editor is actually
 * mounted (e.g. user clicks into a description popover). Tiptap-only views
 * never trigger the import. The user-facing Atlaskit experience is identical.
 */
import React, {
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useState,
  Suspense,
  lazy,
} from 'react';
import type { ADFEntity } from '@atlaskit/adf-utils/types';
import { createEmptyADF } from '@/utils/adf';
import { normalizeAdfForAtlaskit } from '@/components/shared/rich-text/atlaskit';

// ─── Lazy-loaded Atlaskit editor ──────────────────────────────
// Wrap the named export `Editor` into a default export for React.lazy.
const LazyEditor = lazy(async () => {
  const mod = await import('@atlaskit/editor-core');
  return { default: mod.Editor as unknown as React.ComponentType<any> };
});

const mediaOptions = {
  allowMediaSingle: true,
  allowMediaGroup: true,
  allowMediaInlineImages: true,
  allowAltTextOnImages: true,
  allowImagePreview: true,
  allowResizing: true,
  enableDownloadButton: true,
  isExternalMediaUploadDisabled: true,
};

// EditorActions is a class — we only need the type at runtime via dynamic import.
type EditorActionsLike = {
  replaceDocument: (adf: string) => void;
};

export interface AtlaskitEditorRef {
  replaceDocument: (adf: ADFEntity) => void;
  getContent: () => ADFEntity | null;
}

interface AtlaskitEditorProps {
  appearance?: 'full-page' | 'comment';
  defaultValue?: ADFEntity;
  placeholder?: string;
  onChange?: (adf: ADFEntity) => void;
  onSave?: (adf: ADFEntity) => void;
  onCancel?: () => void;
  disabled?: boolean;
  primaryToolbarComponents?: React.ReactElement[];
  minHeight?: number;
}

const AtlaskitEditor = forwardRef<AtlaskitEditorRef, AtlaskitEditorProps>(
  function AtlaskitEditor(
    {
      appearance = 'full-page',
      defaultValue,
      placeholder = 'Start typing...',
      onChange,
      onSave,
      onCancel,
      disabled = false,
      primaryToolbarComponents,
      minHeight = 200,
    },
    ref
  ) {
    const normalizedDefaultValue = normalizeAdfForAtlaskit(defaultValue || createEmptyADF());
    const actionsRef = useRef<EditorActionsLike | null>(null);
    const contentRef = useRef<ADFEntity>(normalizedDefaultValue);

    useImperativeHandle(ref, () => ({
      replaceDocument: (adf: ADFEntity) => {
        if (actionsRef.current) {
          actionsRef.current.replaceDocument(JSON.stringify(adf));
          contentRef.current = adf;
        }
      },
      getContent: () => contentRef.current,
    }));

    const handleEditorReady = useCallback((actions: EditorActionsLike) => {
      actionsRef.current = actions;
    }, []);

    const handleChange = useCallback(
      (editorView: any) => {
        if (!editorView) return;
        try {
          const adf = editorView.state.doc.toJSON() as ADFEntity;
          contentRef.current = adf;
          onChange?.(adf);
        } catch {
          /* transient */
        }
      },
      [onChange]
    );

    const handleSave = useCallback(
      (editorView: any) => {
        if (!onSave || !editorView) return;
        try {
          const adf = editorView.state.doc.toJSON() as ADFEntity;
          onSave(adf);
        } catch {
          /* ignore */
        }
      },
      [onSave]
    );

    return (
      <div
        style={{ minHeight: appearance === 'comment' ? undefined : minHeight }}
        className="atlaskit-editor-wrapper"
      >
        <Suspense
          fallback={
            <div
              style={{
                minHeight: appearance === 'comment' ? 80 : minHeight,
                padding: 12,
                color: '#878787',
                fontSize: 13,
              }}
            >
              Loading editor…
            </div>
          }
        >
          <LazyEditor
            appearance={appearance}
            defaultValue={JSON.stringify(normalizedDefaultValue)}
            placeholder={placeholder}
            disabled={disabled}
            onChange={handleChange}
            onSave={appearance === 'comment' ? handleSave : undefined}
            onCancel={onCancel}
            onEditorReady={handleEditorReady}
            primaryToolbarComponents={primaryToolbarComponents}
            allowTextColor
            allowTextAlignment
            allowIndentation
            allowRule
            allowTables={{ advanced: false }}
            allowPanel
            allowTasksAndDecisions
<<<<<<< Updated upstream
            media={mediaOptions}
=======
            /* 2026-04-20 — See EpicDescriptionEditor for the rationale:
               the narrower allow-list silently dropped expand / layout /
               status / date nodes on load, causing view→edit content
               loss. Enable the Jira-parity set here so the knowledge-
               hub ConfluenceEditor (which wraps this component) also
               round-trips rich documents without dropping sections. */
            allowExpand
            allowLayouts
            allowStatus
            allowDate
            allowBreakout
>>>>>>> Stashed changes
            shouldFocus={false}
          />
        </Suspense>
      </div>
    );
  }
);

export default AtlaskitEditor;
