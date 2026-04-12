/**
 * CatalystDetailViews — Shared type definitions
 * Re-exports common types from story-detail-modules + adds view-specific types
 */

export type {
  PhIssue, PhComment, PhActivityLog, PhAttachment, PhIssueLink,
  TmTestCase, TmTestCaseLink, ThTestExecution, RhRelease, RhChange,
  Profile, ProjectMember, PhIssueRow, ColumnConfig, ParentIssue,
  StatusCategory, PriorityLevel, TestResult, ActivityTab,
  FixVersion,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/types';

/** Catalyst work item types supported by detail views */
export type CatalystItemType = 'story' | 'epic' | 'feature' | 'defect' | 'incident' | 'task' | 'business_request' | 'subtask';

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
}

/** Props for the CatalystDetailRouter */
export interface CatalystDetailRouterProps extends CatalystViewBaseProps {
  /** If known, the item type to render — avoids a DB lookup */
  itemType?: CatalystItemType | string;
}
