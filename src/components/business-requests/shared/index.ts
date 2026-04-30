/**
 * Shared Business Request components — used by both the Create modal
 * (`CreateBusinessRequestModal`) and the View modal
 * (`CatalystViewBusinessRequest.v2`).
 *
 * Cycle 2 introduces:
 *  - BrTranslateButton (extracted from CreateBusinessRequestModal)
 *  - useBrTranslate (extracted from CreateBusinessRequestModal)
 *
 * Cycle 3 plans to add:
 *  - BrdUploadZone (extract from CreateBusinessRequestModal)
 *  - useBrProfiles (DM / PO / Reporter people pickers)
 *  - useBrReleases (Planned release picker)
 */
export { BrTranslateButton } from './BrTranslateButton';
export type { BrTranslateButtonProps } from './BrTranslateButton';
export { useBrTranslate } from './useBrTranslate';
export type { TranslationDirection } from './useBrTranslate';
