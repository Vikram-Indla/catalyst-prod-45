/**
 * Section barrel for the canonical Business Request view (v3).
 *
 * 2026-06-01: BrScoringSection + BrBrdUploadSection + BrArabicTitleSection
 * deleted — scoring, BRD-upload-as-scope-url, and Arabic title were dropped
 * along with their backing columns (business_score / business_value /
 * scope_url / arabic_title). Attachments handles uploads; scoring lives only
 * in the project hub; BR titles are single-language English.
 */
export { BrTitleSection } from './BrTitleSection';
export { BrCenterDetails } from './BrCenterDetails';
export { BrStatusSection } from './BrStatusSection';
export { BrDescriptionSection } from './BrDescriptionSection';
export { BrAttachmentsSection } from './BrAttachmentsSection';
export { BrLinkedItemsSection } from './BrLinkedItemsSection';
export { BrSidebarDetails } from './BrSidebarDetails';
export { BrActivitySection } from './BrActivitySection';
