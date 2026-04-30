/**
 * Section barrel for the v2 Catalyst Business Request view.
 *
 * Each section component is a focused, ADS-only renderer for one slice
 * of the BR detail surface.
 *
 * Cycle 2 (current): BrTitleSection / BrStatusSection / BrArabicTitleSection
 * + BrSidebarDetails are the real implementations. The remaining sections
 * (BrScoring / BrAttachments / BrBrdUpload / BrLinkedItems) are still
 * cycle-1 stubs and will be filled in cycle 3.
 */
export { BrTitleSection } from './BrTitleSection';
export { BrStatusSection } from './BrStatusSection';
export { BrArabicTitleSection } from './BrArabicTitleSection';
export { BrScoringSection } from './BrScoringSection';
export { BrAttachmentsSection } from './BrAttachmentsSection';
export { BrBrdUploadSection } from './BrBrdUploadSection';
export { BrLinkedItemsSection } from './BrLinkedItemsSection';
export { BrSidebarDetails } from './BrSidebarDetails';
