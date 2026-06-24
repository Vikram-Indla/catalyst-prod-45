/**
 * Feature flags — controlled via environment variables.
 * 
 * Defaults to TRUE so all features are available in preview/dev.
 * Set VITE_ENABLE_AI=false (etc.) to explicitly disable a module.
 */

export const ENABLE_AI = import.meta.env.VITE_ENABLE_AI !== 'false';
export const ENABLE_HEAVY_EXPORTS = import.meta.env.VITE_ENABLE_HEAVY_EXPORTS !== 'false';
// DEPRECATED 2026-06-25: Wiki module removed; all routes redirect to /for-you
export const ENABLE_WIKI = false;
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

/**
 * Convert filter → Kanban — Filters-as-reusable-views vertical (feature 1).
 * Defaults to TRUE — vertical shipped 2026-06-19. Set
 * VITE_ENABLE_FILTER_TO_KANBAN=false to disable. Exposes the "Create Kanban
 * from filter" action in the filter kebab and the filter_id-backed board source.
 *
 * Surface: /project-hub/:key filters + /project-hub/:key/boards/:boardId.
 * Out of scope (this feature): ProductHub/IncidentHub/TaskHub.
 */
export const ENABLE_FILTER_TO_KANBAN = import.meta.env.VITE_ENABLE_FILTER_TO_KANBAN !== 'false';

/**
 * Convert filter → Roadmap — Filters-as-reusable-views vertical (feature 2).
 * Defaults to TRUE — vertical shipped 2026-06-19. Set
 * VITE_ENABLE_FILTER_TO_ROADMAP=false to disable. Exposes the "Create Roadmap
 * from filter" action in the filter kebab and the filter_derived_views roadmap.
 *
 * Surface: /project-hub/:key filters + /project-hub/:key/roadmaps/:id.
 * Out of scope (this feature): ProductHub/IncidentHub/TaskHub.
 */
export const ENABLE_FILTER_TO_ROADMAP = import.meta.env.VITE_ENABLE_FILTER_TO_ROADMAP !== 'false';

/**
 * Convert filter → Dashboard — Filters-as-reusable-views vertical (feature 3).
 * Defaults to TRUE — vertical shipped 2026-06-19. Set
 * VITE_ENABLE_FILTER_TO_DASHBOARD=false to disable. Exposes the "Create
 * Dashboard from filter" action in the filter kebab and the
 * filter_derived_views-backed dashboard.
 *
 * Surface: /project-hub/:key filters + /project-hub/:key/dashboards/:id.
 * Out of scope (this feature): ProductHub/IncidentHub/TaskHub.
 */
export const ENABLE_FILTER_TO_DASHBOARD = import.meta.env.VITE_ENABLE_FILTER_TO_DASHBOARD !== 'false';

/**
 * WhatsApp AI Summary — Filters-as-reusable-views vertical (feature 4).
 * Defaults to TRUE — vertical shipped 2026-06-19. Set
 * VITE_ENABLE_FILTER_WHATSAPP_AI_SUMMARY=false to disable. Exposes the "Copy
 * WhatsApp summary" action in the filter kebab. Safe to ship: useWhatsAppSummary
 * falls back to a deterministic count-based summary (buildFallbackSummary) when
 * the AI gateway errors, so it never blocks the copy path.
 *
 * Surface: /project-hub/:key filters (kebab menu + filter-results entry).
 * Out of scope (MVP): workspace-card entry, history, templates, scheduled sends.
 */
export const ENABLE_FILTER_WHATSAPP_AI_SUMMARY =
  import.meta.env.VITE_ENABLE_FILTER_WHATSAPP_AI_SUMMARY !== 'false';

/**
 * Voice Translate Dictation — double-space hotkey, Gemini STT AR/UR/HI→EN.
 * Defaults to FALSE. Requires runtime flag `voice_dictation` in feature_flags table AND
 * this env var to both be true/enabled before the feature activates.
 * Set VITE_VOICE_DICTATION_ENABLED=true to enable locally.
 */
export const ENABLE_VOICE_DICTATION = import.meta.env.VITE_VOICE_DICTATION_ENABLED === 'true';
