/**
 * Section barrel for the canonical Business Request view (v3).
 *
 * 2026-06-01: BrScoringSection + BrBrdUploadSection + BrArabicTitleSection
 * deleted — scoring, BRD-upload-as-scope-url, and Arabic title were dropped
 * along with their backing columns (business_score / business_value /
 * scope_url / arabic_title). Attachments handles uploads; scoring lives only
 * in the project hub; BR titles are single-language English.
 *
 * 2026-06-21 (Phase 1+2, BR↔Story canonicalisation):
 *   - BrTitleSection deleted — replaced by canonical CatalystTitleEditor.
 *   - BrLinkedItemsSection deleted — replaced by canonical
 *     LinkedWorkItemsSection mounted directly.
 *   - BrDescriptionSection deleted — replaced by canonical Description
 *     mounted with loadAdf + saveOverride adapter.
 *   - BrCenterDetails deleted — replaced by canonical CatalystKeyDetails
 *     with BR-specific fields injected via `extraRows`.
 */
export { BrAttachmentsSection } from './BrAttachmentsSection';
export { BrActivitySection } from './BrActivitySection';
