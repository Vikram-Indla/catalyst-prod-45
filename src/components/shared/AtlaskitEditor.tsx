/**
 * AtlaskitEditor — Wrapper around @atlaskit/editor-core
 * Provides standardized config for full-page and comment appearances.
 * All rich text fields in Catalyst must use this component.
 */
import React, { useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Editor, EditorActions } from '@atlaskit/editor-core';
import type { ADFEntity } from '@atlaskit/adf-utils/types';
import { createEmptyADF } from '@/utils/adf';

export interface AtlaskitEditorRef {
  /** Replace entire document with new ADF */
  replaceDocument: (adf: ADFEntity) => void;
  /** Get current ADF content */
  getContent: () => ADFEntity | null;
}

interface AtlaskitEditorProps {
  /** Editor appearance: 'full-page' for description/AC, 'comment' for comments */
  appearance?: 'full-page' | 'comment';
  /** Initial ADF content */
  defaultValue?: ADFEntity;
  /** Placeholder text */
  placeholder?: string;
  /** Called when content changes — receives ADF JSON */
  onChange?: (adf: ADFEntity) => void;
  /** Called on save (comment appearance) */
  onSave?: (adf: ADFEntity) => void;
  /** Called on cancel (comment appearance) */
  onCancel?: () => void;
  /** Disable editing */
  disabled?: boolean;
  /** Custom toolbar components (e.g. AI improve button) */
  primaryToolbarComponents?: React.ReactElement[];
  /** Min height for the editor */
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
    const actionsRef = useRef<EditorActions | null>(null);
    const contentRef = useRef<ADFEntity>(defaultValue || createEmptyADF());

    useImperativeHandle(ref, () => ({
      replaceDocument: (adf: ADFEntity) => {
        if (actionsRef.current) {
          actionsRef.current.replaceDocument(JSON.stringify(adf));
          contentRef.current = adf;
        }
      },
      getContent: () => contentRef.current,
    }));

    const handleEditorReady = useCallback((actions: EditorActions) => {
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
          // Ignore transient editor state errors
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
          // Ignore
        }
      },
      [onSave]
    );

    return (
      <div
        style={{ minHeight: appearance === 'comment' ? undefined : minHeight }}
        className="atlaskit-editor-wrapper"
      >
        <Editor
          appearance={appearance}
          defaultValue={defaultValue ? JSON.stringify(defaultValue) : undefined}
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
          allowTables={{
            advanced: false,
          }}
          allowPanel
          allowTasksAndDecisions
          shouldFocus={false}
        />
      </div>
    );
  }
);

export default AtlaskitEditor;
