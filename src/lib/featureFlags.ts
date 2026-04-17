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
 *
 * PILOT DEFAULT (Apr 2026): TRUE — so Vikram can see the V2 PILOT pill
 * and the new behaviors (AlertDialog, F2/Home/End/Shift+Del, per-row
 * ADF DescriptionPopover) on the deployed Catalyst without env-var
 * wrangling. Set VITE_ENABLE_SUBTASKS_V2=false to revert to the pre-V2
 * behavior at any time. Pilot surface: Epic detail view → child work items.
 */
export const ENABLE_SUBTASKS_V2 = import.meta.env.VITE_ENABLE_SUBTASKS_V2 !== 'false';

/**
 * Kanban V2 — ProjectHub board pilot gate.
 *
 * PILOT DEFAULT (Apr 2026): TRUE — so the V2 PILOT pill and additions
 * (URL deep-linking for filters + group-by, density control, Zod
 * boundary validation on status change) are visible on the deployed
 * Catalyst. Set VITE_ENABLE_KANBAN_V2=false to revert.
 *
 * Pilot surface: /project-hub/:key/board only.
 * Out of scope: ProductHub/IncidentHub/TaskHub/legacy Project boards.
 */
export const ENABLE_KANBAN_V2 = import.meta.env.VITE_ENABLE_KANBAN_V2 !== 'false';
