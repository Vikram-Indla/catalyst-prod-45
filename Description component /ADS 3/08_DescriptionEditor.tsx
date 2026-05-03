/**
 * DescriptionEditor Component
 * 
 * Rich-text editor using @atlaskit/editor-core
 * Integrates with useDescriptionEditor for state, useDescription for persistence.
 * 
 * Theme: Atlassian Design System (light mode)
 * No custom colors — all from ADS tokens.
 * 
 * DYNAMITE Stage D:
 * - User types → onChange fires → updateContent → content_adf state updates → ADF validates
 * - User clicks save → onSave called → saveDescription → descriptionApi.save → DB INSERT
 * - markSaved called → isDirty = false → UI re-renders
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { EditorContext, Editor } from '@atlaskit/editor-core';
import type { EditorView } from '@atlaskit/editor-core';
import { Spinner } from '@atlaskit/spinner';
import Button from '@atlaskit/button';
import { token } from '@atlaskit/tokens';
import Textfield from '@atlaskit/textfield';
import { Box, Inline, Stack } from '@atlaskit/primitives';

import type { ADFDocument } from './adf';
import type { DescriptionEditorProps, UUID } from './description.types';
import { useDescriptionEditor } from './useDescriptionEditor';
import { useDescription } from './useDescription';

// ============================================================================
// PLUGIN CONFIG (ADS + FORGE Standards)
// ============================================================================

/**
 * Editor plugins: Text, lists, headings, images, links, mentions, code blocks
 * All using @atlaskit plugins (no custom)
 */
const EDITOR_PLUGINS = [
  'placeholder',
  'text-formatting',
  'lists',
  'heading',
  'quote',
  'code-block',
  'link',
  'media',
  'table',
  'expand',
  'panel',
  'mentions',
];

/**
 * Toolbar plugins: Formatting, lists, etc.
 */
const TOOLBAR_PLUGINS = [
  'text-formatting',
  'lists',
  'block-types',
  'separator',
  'link',
  'media',
  'table',
  'mentions',
];

// ============================================================================
// COMPONENT
// ============================================================================

export const DescriptionEditor = React.forwardRef<
  EditorView | null,
  DescriptionEditorProps
>(
  (
    {
      initialADF,
      entityId,
      entityType,
      readOnly = false,
      autoSave = true,
      autoSaveDelay = 2000,
      onChange,
      onSave,
      onError,
      className,
      minHeight = '200px',
      maxHeight = '600px',
    },
    forwardedRef
  ) => {
    // =====================================================================
    // HOOKS
    // =====================================================================

    const editorStateRef = useRef<EditorView | null>(null);

    // Description persistence (TanStack Query)
    const {
      description,
      content_adf: savedADF,
      isLoading: isLoadingDescription,
      isSaving: isSavingDescription,
      saveDescription: saveToDb,
      error: dbError,
    } = useDescription(entityId as UUID, entityType as any);

    // Editor local state (draft recovery, dirty tracking)
    const editor = useDescriptionEditor({
      entityId,
      entityType,
      initialADF: savedADF || initialADF,
      autoSave,
      autoSaveDelay,
      onAutoSave: async (adf) => {
        if (onSave) {
          await onSave(adf);
          editor.markSaved();
        } else {
          // Fallback to DB save
          try {
            await saveToDb(adf, 'Auto-saved');
            editor.markSaved();
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Save failed';
            editor.markSaveError(message);
            if (onError) onError(new Error(message));
          }
        }
      },
    });

    // =====================================================================
    // HANDLERS
    // =====================================================================

    const handleEditorChange = useCallback(
      (value: ADFDocument) => {
        editor.updateContent(value);
        if (onChange) onChange(value);
      },
      [editor, onChange]
    );

    const handleSave = useCallback(async () => {
      try {
        if (onSave) {
          await onSave(editor.content_adf);
        } else {
          await saveToDb(editor.content_adf, 'Manual save');
        }
        editor.markSaved();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Save failed';
        editor.markSaveError(message);
        if (onError) onError(new Error(message));
      }
    }, [editor, onSave, saveToDb, onError]);

    const handleDraftRecovery = useCallback(() => {
      const draft = editor.recoverDraft();
      if (draft) {
        if (onChange) onChange(draft);
      }
    }, [editor, onChange]);

    const handleDiscardDraft = useCallback(() => {
      editor.clearDraft();
    }, [editor]);

    // =====================================================================
    // EFFECT: Sync external initialADF changes
    // =====================================================================

    useEffect(() => {
      if (savedADF && !editor.isDirty) {
        editor.updateContent(savedADF);
      }
    }, [savedADF, editor, editor.isDirty]);

    // =====================================================================
    // EFFECT: Forward ref
    // =====================================================================

    useEffect(() => {
      if (forwardedRef) {
        if (typeof forwardedRef === 'function') {
          forwardedRef(editorStateRef.current);
        } else {
          forwardedRef.current = editorStateRef.current;
        }
      }
    }, [forwardedRef]);

    // =====================================================================
    // RENDERING
    // =====================================================================

    const isLoading = isLoadingDescription;
    const isSaving = isSavingDescription || editor.isSaving;
    const hasErrors = !editor.isValid && editor.validationErrors.length > 0;
    const isDraft = editor.hasDraft && !editor.isDirty;

    return (
      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: token('space.100'),
          width: '100%',
        }}
      >
        {/* ============================================================ */}
        {/* HEADER: Entity info + Status */}
        {/* ============================================================ */}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: token('space.050'),
            borderBottom: `1px solid ${token('color.border')}`,
          }}
        >
          <div>
            <p
              style={{
                fontSize: '12px',
                color: token('color.text.subtlest'),
                margin: 0,
              }}
            >
              {entityType.toUpperCase()} / {entityId.slice(0, 8)}
            </p>
          </div>

          <div style={{ display: 'flex', gap: token('space.050') }}>
            {editor.lastSaveTime && (
              <span
                style={{
                  fontSize: '12px',
                  color: token('color.text.subtlest'),
                }}
              >
                Saved {new Date(editor.lastSaveTime).toLocaleTimeString()}
              </span>
            )}
            {editor.isDirty && (
              <span
                style={{
                  fontSize: '12px',
                  color: token('color.text.warning'),
                  fontWeight: 'bold',
                }}
              >
                Unsaved changes
              </span>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* DRAFT RECOVERY UI */}
        {/* ============================================================ */}

        {isDraft && (
          <div
            style={{
              padding: token('space.100'),
              backgroundColor: token('color.background.information'),
              border: `1px solid ${token('color.border.information')}`,
              borderRadius: token('border.radius.100'),
            }}
          >
            <p
              style={{
                margin: 0,
                marginBottom: token('space.050'),
                fontSize: '14px',
                color: token('color.text.information'),
              }}
            >
              💾 A draft from {new Date(editor.draftLastModified || '').toLocaleString()} was found.
            </p>
            <div style={{ display: 'flex', gap: token('space.050') }}>
              <Button
                appearance="primary"
                size="small"
                onClick={handleDraftRecovery}
              >
                Restore Draft
              </Button>
              <Button
                appearance="default"
                size="small"
                onClick={handleDiscardDraft}
              >
                Discard
              </Button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ERROR MESSAGES */}
        {/* ============================================================ */}

        {editor.lastSaveError && (
          <div
            style={{
              padding: token('space.100'),
              backgroundColor: token('color.background.danger'),
              border: `1px solid ${token('color.border.danger')}`,
              borderRadius: token('border.radius.100'),
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: token('color.text.danger'),
              }}
            >
              ❌ {editor.lastSaveError}
            </p>
          </div>
        )}

        {dbError && (
          <div
            style={{
              padding: token('space.100'),
              backgroundColor: token('color.background.danger'),
              border: `1px solid ${token('color.border.danger')}`,
              borderRadius: token('border.radius.100'),
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: token('color.text.danger'),
              }}
            >
              ❌ Database error: {dbError.message}
            </p>
          </div>
        )}

        {hasErrors && (
          <div
            style={{
              padding: token('space.100'),
              backgroundColor: token('color.background.warning'),
              border: `1px solid ${token('color.border.warning')}`,
              borderRadius: token('border.radius.100'),
            }}
          >
            <p
              style={{
                margin: 0,
                marginBottom: token('space.050'),
                fontSize: '14px',
                color: token('color.text.warning'),
                fontWeight: 'bold',
              }}
            >
              ⚠️ Validation errors:
            </p>
            <ul
              style={{
                margin: 0,
                paddingLeft: token('space.200'),
                fontSize: '12px',
                color: token('color.text.warning'),
              }}
            >
              {editor.validationErrors.slice(0, 3).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ============================================================ */}
        {/* LOADING STATE */}
        {/* ============================================================ */}

        {isLoading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: token('space.200'),
            }}
          >
            <Spinner size="small" />
          </div>
        )}

        {/* ============================================================ */}
        {/* EDITOR (Atlaskit) */}
        {/* ============================================================ */}

        {!isLoading && (
          <div
            style={{
              minHeight,
              maxHeight,
              overflow: 'auto',
              border: `1px solid ${token('color.border')}`,
              borderRadius: token('border.radius.100'),
              backgroundColor: readOnly
                ? token('color.background.neutral')
                : token('color.background'),
            }}
          >
            <EditorContext>
              <Editor
                appearance="full-page"
                allowTextAlignment
                allowTextColor
                allowBlockType
                allowDate
                allowDatesSharedMenu
                allowExpand
                allowIndentation
                allowList
                allowMention
                allowNestedLists
                allowPanel
                allowRule
                allowTable
                allowStatus
                media={{
                  provider: Promise.resolve({} as any), // Placeholder: configure with Supabase in Phase 3
                }}
                disabled={readOnly}
                placeholder={
                  readOnly
                    ? '(No description provided)'
                    : 'Write a description...'
                }
                onChange={(editorState) => {
                  try {
                    const json = editorState.doc.toJSON() as ADFDocument;
                    handleEditorChange(json);
                  } catch (err) {
                    console.error('[DescriptionEditor] onChange error:', err);
                  }
                }}
                defaultValue={
                  editor.content_adf || {
                    version: 1,
                    type: 'doc',
                    content: [],
                  }
                }
                ref={editorStateRef}
              />
            </EditorContext>
          </div>
        )}

        {/* ============================================================ */}
        {/* FOOTER: Actions */}
        {/* ============================================================ */}

        {!readOnly && (
          <div
            style={{
              display: 'flex',
              gap: token('space.100'),
              justifyContent: 'flex-end',
              paddingTop: token('space.100'),
              borderTop: `1px solid ${token('color.border')}`,
            }}
          >
            <Button appearance="default" isDisabled={!editor.isDirty}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleSave}
              isDisabled={!editor.isDirty || isSaving || hasErrors}
              isLoading={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}

        {/* ============================================================ */}
        {/* FOOTER: Metadata (read-only) */}
        {/* ============================================================ */}

        {description && (
          <div
            style={{
              paddingTop: token('space.050'),
              fontSize: '12px',
              color: token('color.text.subtlest'),
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Version {description.version}</span>
            <span>
              Last modified {new Date(description.updated_at).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    );
  }
);

DescriptionEditor.displayName = 'DescriptionEditor';
