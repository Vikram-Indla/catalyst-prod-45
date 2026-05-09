/**
 * AdfDescriptionField — canonical ADF rich-text description editor for Catalyst.
 *
 * This is the single implementation that all detail-view description sections
 * must import. It wraps EpicDescriptionEditor (the actual implementation) and
 * is the stable public alias — callers should never import EpicDescriptionEditor
 * directly from now on.
 *
 * Features:
 *   - Atlaskit editor-core (ProseMirror) with ADF round-trip
 *   - Inline image paste + drag-drop → Supabase upload pipeline
 *   - Upload progress banner (Jira-parity)
 *   - Race-condition guard: save blocked while upload is in flight
 *   - Idle/pointer-down prefetch of editor chunk (~2 MB)
 *
 * API: JSON-string ADF — `initialAdfJson: string`, `onSave: (adfJson: string) => void`
 */
export { default as AdfDescriptionField, default } from './EpicDescriptionEditor';
export type { EpicDescriptionEditorProps as AdfDescriptionFieldProps, AttachmentUploadMeta } from './EpicDescriptionEditor';
