/**
 * Section barrel for the v2 Catalyst Business Request view.
 *
 * Each section component is a focused, ADS-only renderer for one slice
 * of the BR detail surface.
 *
 * Cycle 3 (current): every section is now a real implementation, except
 * `BrBrdUploadSection` which is deprecated as of cycle 3 — its role has
 * been folded into `BrAttachmentsSection`. The stub is kept exported for
 * back-compat until cycle 4 verifies nothing downstream consumes it.
 */
export { BrTitleSection } from './BrTitleSection';
export { BrStatusSection } from './BrStatusSection';
export { BrArabicTitleSection } from './BrArabicTitleSection';
export { BrDescriptionSection } from './BrDescriptionSection';
export { BrScoringSection } from './BrScoringSection';
export { BrAttachmentsSection } from './BrAttachmentsSection';
/** @deprecated cycle 3 — folded into BrAttachmentsSection. Delete after cycle 4. */
export { BrBrdUploadSection } from './BrBrdUploadSection';
export { BrLinkedItemsSection } from './BrLinkedItemsSection';
export { BrSidebarDetails } from './BrSidebarDetails';
