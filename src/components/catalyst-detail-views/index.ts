/**
 * Catalyst Detail Views — Barrel exports.
 *
 * Canonical entry point: CatalystSideDrawer
 * ──────────────────────────────────────────
 * CatalystSideDrawer is the shared canonical composite for ALL work item
 * detail surfaces across every hub (Project, Product, Incident, Release,
 * TestHub, ForYou, Kanban, Backlog, BoardCanvas, Notifications).
 *
 * Three render modes — pass one prop:
 *   panelMode    → sticky right panel (AllWork, Backlog split-view)
 *   fullPageMode → fills viewport below top nav (BacklogDetailPage, IssueFullPage)
 *   [neither]    → floating modal (Kanban, ForYou cards, Notifications)
 *
 * Mirroring (wiring a copy on any surface):
 *   import { CatalystSideDrawer } from '@/components/catalyst-detail-views';
 *   <CatalystSideDrawer
 *     isOpen={open}
 *     onClose={() => setOpen(false)}
 *     itemId={issueKey}          // Jira issue key e.g. "BAU-5757"
 *     projectKey="BAU"
 *     panelMode                  // omit for modal, add fullPageMode for full-page
 *     itemType="story"           // optional — skips DB type-lookup round-trip
 *     navigationItems={items}    // optional — enables prev/next chevrons
 *     currentItemId={activeId}
 *     onNavigate={setActiveId}
 *   />
 *
 * Internal implementation: CatalystDetailRouter → CatalystViewBase → CatalystView*
 * CatalystDetailRouter remains the internal name; existing imports are NOT broken.
 */

// ── Canonical public name (use this in all new code) ──────────────────────
export { default as CatalystSideDrawer } from './CatalystDetailRouter';
export type { CatalystDetailRouterProps as CatalystSideDrawerProps } from './shared/types';

// ── Legacy internal names (kept for backward compat — do not use in new code) ──
export { default as CatalystDetailRouter } from './CatalystDetailRouter';
export { resolveItemType } from './CatalystDetailRouter';
export { CatalystViewBase } from './shared/CatalystViewBase';
export type { CatalystViewBaseProps, CatalystDetailRouterProps, CatalystItemType } from './shared/types';
