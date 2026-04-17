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
 * Epic Backlog V2 — Atlaskit-pattern DynamicTable (TanStack Table + react-virtual + Radix).
 * Pilot ship — ringfenced to /project-hub/:key/epic-backlog.
 * Defaults ON in preview; set VITE_ENABLE_EPIC_BACKLOG_V2=false to fall back to legacy div-grid.
 */
export const ENABLE_EPIC_BACKLOG_V2 = import.meta.env.VITE_ENABLE_EPIC_BACKLOG_V2 !== 'false';
