/**
 * Section barrel for the canonical Business Request view (v3).
 *
 * 2026-06-01: BrScoringSection + BrBrdUploadSection deleted — scoring +
 * BRD-upload-as-scope-url were dropped along with their backing columns
 * (business_score/business_value/scope_url). Attachments handles uploads;
 * scoring lives only in the project hub.
 */
export { BrTitleSection } from './BrTitleSection';
export { BrCenterDetails } from './BrCenterDetails';
export { BrStatusSection } from './BrStatusSection';
export { BrArabicTitleSection } from './BrArabicTitleSection';
export { BrDescriptionSection } from './BrDescriptionSection';
export { BrAttachmentsSection } from './BrAttachmentsSection';
export { BrLinkedItemsSection } from './BrLinkedItemsSection';
export { BrSidebarDetails } from './BrSidebarDetails';
