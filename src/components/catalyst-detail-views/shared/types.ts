/**
 * CatalystDetailViews — Shared type definitions
 * Re-exports common types from story-detail-modules + adds view-specific types
 */

export type {
  PhIssue, PhComment, PhActivityLog, PhAttachment, PhIssueLink,
  TmTestCase, TmTestCaseLink, ThTestExecution, RhRelease, RhChange,
  Profile, ProjectMember, PhIssueRow, ColumnConfig, ParentIssue,
  StatusCategory, PriorityLevel, TestResult, ActivityTab,
  SprintRelease,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/types';

/** Catalyst work item types supported by detail views.
 *  Phase 6 (2026-05-02): added 'idea' so Ideation Hub routes its detail
 *  surface through CatalystDetailRouter instead of forking a parallel
 *  modal. Per the canonical-primitive framework — see CLAUDE.md. */
export type CatalystItemType = 'story' | 'epic' | 'feature' | 'defect' | 'incident' | 'task' | 'business_request' | 'subtask' | 'idea';

/** Shared props for all CatalystView* components */
export interface CatalystViewBaseProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  projectId?: string;
  projectKey?: string;
  onOpenItem?: (itemId: string) => void;
  panelMode?: boolean;
  /** Full-page mode: no overlay/modal chrome, fills viewport below top nav */
  fullPageMode?: boolean;
  onTogglePanelMode?: () => void;
  navigationItems?: { id: string; summary: string; issue_key?: string }[];
  onNavigate?: (itemId: string) => void;
  /** When true, the right sidebar (cv-drawer-sidebar) is hidden regardless of
   *  the @container query. Used by medium-layout panel mode where the detail
   *  container width is insufficient to host both body and sidebar. */
  hideSidebar?: boolean;
  /**
   * 2026-06-16: optional override for the "Open in full page" button URL.
   * Default (undefined): /project-hub/{projectKey}/backlog/{itemKey}.
   * Incident hub uses this to navigate to /incident-hub/view/{uuid}
   * instead, since incidents have no project-hub backlog route.
   */
  fullPageHrefBuilder?: (itemKey: string) => string;
  /** Optional entity-specific promotion handler.
   *  Currently used by 'idea' to spawn a Request via CreateRequestDrawer.
   *  Other entity types ignore this prop. */
  onConvert?: (item: unknown) => void;
}

/** Props for the CatalystDetailRouter */
export interface CatalystDetailRouterProps extends CatalystViewBaseProps {
  /** If known, the item type to render — avoids a DB lookup */
  itemType?: CatalystItemType | string;
  /**
   * Source table the itemId belongs to.
   * - 'ph_issue' (default): itemId is a ph_issues.issue_key (or row lookup by issue_key).
   *   Routes through the legacy CatalystView* per-type components.
   * - 'task': itemId is a tasks.id (UUID). Routes through TaskCatalystView, which
   *   reads from the `tasks` table.
   *
   * Added 2026-06-16 (Task 1.5d) to allow Tasks Hub to mount the canonical
   * CatalystDetailPanel chrome WITHOUT forking CatalystViewTask, per
   * CLAUDE.md REUSE-FIRST + ADOPT-CANONICAL.
   *
   * - 'test_case': itemId is a tm_test_cases.id (UUID). Routes through
   *   CatalystViewTestCase (Test Hub). Added 2026-06-27 (D4,
   *   CAT-TESTHUB-ENGINE-20260626-001) — same coexist pattern as tasks.
   *
   * - 'test_cycle': itemId is a tm_test_cycles.id (UUID). Routes through
   *   CatalystViewTestCycle (Test Hub timeline side panel). Added 2026-06-28.
   */
  entityKind?: 'ph_issue' | 'task' | 'test_case' | 'test_cycle';
}
