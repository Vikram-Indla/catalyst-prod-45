/**
 * ADF Schema Stage0 Shim
 *
 * Provides stub exports for listItemWithFlexibleFirstChildStage0 and
 * taskListWithFlexibleFirstChildStage0 which are imported by Atlaskit's
 * editor-plugin-list but don't exist in adf-schema 52.11.4.
 *
 * These exports are only used by the editor plugins themselves, not by
 * our source code. Providing empty definitions allows the bundler to
 * satisfy the imports without error.
 */

// Re-export everything from the real adf-schema module
export * from '@atlaskit/adf-schema';

// Provide stub exports for the missing stage0 variants
// These use the same type structure as their non-stage0 counterparts
export const listItemWithFlexibleFirstChildStage0 = undefined;
export const taskListWithFlexibleFirstChildStage0 = undefined;
