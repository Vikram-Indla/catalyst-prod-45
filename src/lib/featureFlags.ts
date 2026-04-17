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
 * Kanban V2 — ProjectHub board pilot gate.
 * Defaults to FALSE: off everywhere.
 * Set VITE_ENABLE_KANBAN_V2=true to enable the V2 board additions
 * (URL deep-linking for filters + group-by, density control, Zod
 * boundary validation on status change). When this flag is off, the
 * existing KanbanBoardPage renders unchanged.
 *
 * Pilot surface: /project-hub/:key/board only.
 * Out of scope: ProductHub/IncidentHub/TaskHub/legacy Project boards.
 */
export const ENABLE_KANBAN_V2 = import.meta.env.VITE_ENABLE_KANBAN_V2 === 'true';
