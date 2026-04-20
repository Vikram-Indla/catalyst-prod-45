/**
 * Atlaskit rich-text surface — canonical.
 *
 * After the B1 rollout, `EpicDescriptionRenderer` is the single read-path
 * renderer for all Catalyst ADF content (epic / story / task / bug
 * descriptions, acceptance criteria, comments). It delegates to
 * `@atlaskit/renderer` via `AtlaskitRenderer` (lazy-loaded) and overrides
 * media nodes through `atlaskitMediaOverrides` so images render through
 * Catalyst's ph_issue_attachments pipeline (Supabase storage + the
 * jira-attachment-proxy edge function for Jira-hosted originals).
 *
 * `EpicDescriptionEditor` is the Atlaskit-based edit surface. Live on
 * CatalystDescriptionSection, IssueContentView (B2), and StoryDetailModal's
 * description + acceptance-criteria editors (B2b / B2c), each wrapped in
 * AtlaskitBoundary with CatalystRichTextEditor as the runtime fallback.
 * Remaining TipTap holdouts: CreateStoryModal (autoSave-mode create flow)
 * and BusinessRequestDetailModal (no description_adf column yet).
 */
export { default as EpicDescriptionEditor } from './EpicDescriptionEditor';
export type { EpicDescriptionEditorProps } from './EpicDescriptionEditor';
export { default as EpicDescriptionRenderer } from './EpicDescriptionRenderer';
export { AtlaskitBoundary } from './AtlaskitBoundary';
export { normalizeAdfForAtlaskit, parseStoredDescriptionToAdf } from './adfNormalizer';
export { isAdfEmpty, adfToPlainText } from './adfHelpers';
export { mediaNodeComponents, MediaProvidersShell, useMediaUrl } from './atlaskitMediaOverrides';
export { uploadDescriptionImage } from './supabaseImageUpload';
