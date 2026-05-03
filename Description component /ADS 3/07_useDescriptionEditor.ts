/**
 * useDescriptionEditor Hook
 * 
 * Manages editor state independently from persistence.
 * Handles:
 * - Draft recovery (localStorage)
 * - Auto-save (debounced)
 * - Dirty state tracking
 * - Validation
 * 
 * Complements useDescription (which handles DB persistence via TanStack Query).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { validateADF } from './adf-validator';
import type {
  ADFDocument,
  createEmptyDocument,
} from './adf';
import type { DescriptionEditorState } from './description.types';

// ============================================================================
// TYPES
// ============================================================================

interface UseDescriptionEditorOptions {
  entityId: string;
  entityType: string;
  initialADF?: ADFDocument;
  autoSave?: boolean;
  autoSaveDelay?: number; // ms
  onAutoSave?: (adf: ADFDocument) => Promise<void>;
}

interface UseDescriptionEditorReturn extends DescriptionEditorState {
  // Actions
  updateContent: (adf: ADFDocument) => void;
  markSaved: () => void;
  markSaveError: (error: string) => void;
  clearDraft: () => void;
  recoverDraft: () => ADFDocument | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DRAFT_STORAGE_PREFIX = 'catalyst_description_draft';

function getDraftKey(entityId: string, entityType: string): string {
  return `${DRAFT_STORAGE_PREFIX}:${entityType}:${entityId}`;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Manage editor state with draft recovery and auto-save
 * 
 * DYNAMITE Stage D: 
 * - updateContent → setState → onChange callback → UI re-render
 * - Auto-save triggered → onAutoSave → descriptionApi.save → DB INSERT → useDescription refetch → UI updates
 * 
 * Usage:
 * ```tsx
 * const editor = useDescriptionEditor({
 *   entityId: releaseId,
 *   entityType: 'release',
 *   initialADF: description?.content_adf,
 *   autoSave: true,
 *   autoSaveDelay: 2000,
 *   onAutoSave: async (adf) => {
 *     await saveDescription(adf, 'Auto-saved');
 *   },
 * });
 * 
 * return (
 *   <>
 *     <DescriptionEditor
 *       value={editor.content_adf}
 *       onChange={editor.updateContent}
 *     />
 *     {editor.isDirty && <p>Unsaved changes</p>}
 *     {editor.lastSaveError && <Alert>{editor.lastSaveError}</Alert>}
 *   </>
 * );
 * ```
 */
export function useDescriptionEditor(
  options: UseDescriptionEditorOptions
): UseDescriptionEditorReturn {
  const {
    entityId,
    entityType,
    initialADF,
    autoSave = true,
    autoSaveDelay = 2000,
    onAutoSave,
  } = options;

  // =========================================================================
  // STATE
  // =========================================================================

  const [content_adf, setContentADF] = useState<ADFDocument>(
    initialADF || { version: 1, type: 'doc', content: [] }
  );

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isValid, setIsValid] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [lastSaveTime, setLastSaveTime] = useState<undefined | string>();
  const [lastSaveError, setLastSaveError] = useState<string>();

  const [hasDraft, setHasDraft] = useState(false);
  const [draftContent, setDraftContent] = useState<ADFDocument | undefined>();
  const [draftLastModified, setDraftLastModified] = useState<string>();

  // =========================================================================
  // REFS (for timers and logic)
  // =========================================================================

  const autoSaveTimerRef = useRef<NodeJS.Timeout>();
  const draftKeyRef = useRef(getDraftKey(entityId, entityType));

  // =========================================================================
  // EFFECTS: Initialize (load initial + draft recovery)
  // =========================================================================

  useEffect(() => {
    // Check for saved draft in localStorage
    try {
      const draftKey = draftKeyRef.current;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft) as {
          adf: ADFDocument;
          timestamp: string;
        };
        setDraftContent(parsed.adf);
        setDraftLastModified(parsed.timestamp);
        setHasDraft(true);
      }
    } catch (err) {
      console.error('[useDescriptionEditor] draft recovery error:', err);
    }
  }, []);

  // =========================================================================
  // ACTION: Update content
  // =========================================================================

  const updateContent = useCallback((adf: ADFDocument) => {
    setContentADF(adf);
    setIsDirty(true);
    setLastSaveError(undefined);

    // Validate
    const validation = validateADF(adf);
    setIsValid(validation.isValid);
    setValidationErrors(validation.errors || []);

    // Save to draft localStorage (debounced via auto-save)
    // Clear any pending auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Save to draft immediately (for recovery)
    try {
      const draftKey = draftKeyRef.current;
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          adf,
          timestamp: new Date().toISOString(),
        })
      );
      setHasDraft(true);
      setDraftContent(adf);
      setDraftLastModified(new Date().toISOString());
    } catch (err) {
      console.error('[useDescriptionEditor] draft save error:', err);
    }

    // Trigger auto-save if enabled
    if (autoSave && onAutoSave) {
      autoSaveTimerRef.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          await onAutoSave(adf);
          setIsDirty(false);
          setLastSaveTime(new Date().toISOString());
          setLastSaveError(undefined);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setLastSaveError(message);
        } finally {
          setIsSaving(false);
        }
      }, autoSaveDelay);
    }
  }, [autoSave, onAutoSave, autoSaveDelay]);

  // =========================================================================
  // ACTION: Mark as saved (manual save)
  // =========================================================================

  const markSaved = useCallback(() => {
    setIsDirty(false);
    setLastSaveTime(new Date().toISOString());
    setLastSaveError(undefined);
    
    // Clear draft after successful save
    try {
      const draftKey = draftKeyRef.current;
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      setDraftContent(undefined);
    } catch (err) {
      console.error('[useDescriptionEditor] draft clear error:', err);
    }
  }, []);

  // =========================================================================
  // ACTION: Mark save error
  // =========================================================================

  const markSaveError = useCallback((error: string) => {
    setLastSaveError(error);
  }, []);

  // =========================================================================
  // ACTION: Clear draft
  // =========================================================================

  const clearDraft = useCallback(() => {
    try {
      const draftKey = draftKeyRef.current;
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      setDraftContent(undefined);
      setDraftLastModified(undefined);
    } catch (err) {
      console.error('[useDescriptionEditor] draft clear error:', err);
    }
  }, []);

  // =========================================================================
  // ACTION: Recover draft (restore from localStorage)
  // =========================================================================

  const recoverDraft = useCallback((): ADFDocument | null => {
    if (!draftContent) return null;
    updateContent(draftContent);
    return draftContent;
  }, [draftContent, updateContent]);

  // =========================================================================
  // CLEANUP: Clear auto-save timer
  // =========================================================================

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // =========================================================================
  // RETURN
  // =========================================================================

  return {
    // State
    content_adf,
    isDirty,
    isSaving,
    isLoading,
    isValid,
    validationErrors,
    lastSaveTime,
    lastSaveError,
    hasDraft,
    draftContent,
    draftLastModified,

    // Actions
    updateContent,
    markSaved,
    markSaveError,
    clearDraft,
    recoverDraft,
  };
}

// ============================================================================
// HOOK VARIANT: Editor with auto-validate
// ============================================================================

/**
 * useDescriptionEditorWithValidation
 * 
 * Adds real-time validation feedback.
 */
export function useDescriptionEditorWithValidation(
  options: UseDescriptionEditorOptions
) {
  const editor = useDescriptionEditor(options);

  const validationFeedback = {
    hasErrors: !editor.isValid && editor.validationErrors.length > 0,
    errorCount: editor.validationErrors.length,
    firstError: editor.validationErrors[0] || null,
  };

  return {
    ...editor,
    validationFeedback,
  };
}

// ============================================================================
// TESTING HELPERS
// ============================================================================

/**
 * Test helper: Simulate draft loss recovery
 */
export function simulateDraftRecovery(entityId: string, entityType: string) {
  const key = getDraftKey(entityId, entityType);
  const draft = localStorage.getItem(key);
  if (!draft) return null;
  try {
    return JSON.parse(draft) as { adf: ADFDocument; timestamp: string };
  } catch {
    return null;
  }
}

/**
 * Test helper: Clear all drafts (cleanup)
 */
export function clearAllDrafts() {
  const keys = Object.keys(localStorage).filter((k) =>
    k.startsWith(DRAFT_STORAGE_PREFIX)
  );
  keys.forEach((k) => localStorage.removeItem(k));
}
