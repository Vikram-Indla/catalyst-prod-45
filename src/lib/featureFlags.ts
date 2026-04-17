/**
 * Feature flags — controlled via environment variables.
 * 
 * Defaults to TRUE so all features are available in preview/dev.
 * Set VITE_ENABLE_AI=false (etc.) to explicitly disable a module.
 */

export const ENABLE_AI = import.meta.env.VITE_ENABLE_AI !== 'false';
export const ENABLE_HEAVY_EXPORTS = import.meta.env.VITE_ENABLE_HEAVY_EXPORTS !== 'false';
export const ENABLE_WIKI = import.meta.env.VITE_ENABLE_WIKI !== 'false';
export const ENABLE_KNOWLEDGE_HUB = import.meta.env.VITE_ENABLE_KNOWLEDGE_HUB !== 'false';

/**
 * Master gate — defaults to TRUE.
 * Set VITE_ENABLE_FULL_APP=false to restrict to auth + for-you only.
 */
export const ENABLE_FULL_APP = import.meta.env.VITE_ENABLE_FULL_APP !== 'false';

/**
 * Subtasks V2 — canonical Atlaskit/ADF molecular component.
 * Defaults to FALSE: pilot gated to Epic detail view only.
 * Set VITE_ENABLE_SUBTASKS_V2=true to enable the V2 molecule at the Epic pilot surface.
 * When this flag is off, the existing SubtasksPanel renders unchanged everywhere.
 */
export const ENABLE_SUBTASKS_V2 = import.meta.env.VITE_ENABLE_SUBTASKS_V2 === 'true';
