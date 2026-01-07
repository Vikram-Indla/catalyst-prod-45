// roadmap.types.ts
// Type definitions for Roadmaps Module

// ============================================
// ENUMS
// ============================================

export type WorkItemType = 'theme' | 'epic' | 'feature' | 'capability' | 'story';

export type WorkItemState = 'not_started' | 'in_progress' | 'accepted' | 'blocked' | 'done';

export type WorkItemStatus = 'on_track' | 'at_risk' | 'off_track';

export type PIStatus = 'in_progress' | 'planning' | 'done';

export type TimelineView = 'calendar' | 'sprint';

export type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';

export type GroupByMode = 'themes' | 'epics' | 'features' | 'epic_by_theme' | 'feature_by_epic';

export type DragType = 'move' | 'resize-left' | 'resize-right';

// ============================================
// PROGRAM INCREMENTS
// ============================================

export interface ProgramIncrement {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PIStatus;
  sprints?: Sprint[];
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  piId?: string;
}

// ============================================
// MILESTONES
// ============================================

export interface Milestone {
  id: string;
  name: string;
  date: string;
  completed?: boolean;
}

export interface ItemMilestone extends Milestone {
  completed: boolean;
}

// ============================================
// ROADMAP ITEMS
// ============================================

export interface RoadmapItem {
  id: string;
  numericId: number;
  title: string;
  type: WorkItemType;
  state: WorkItemState;
  status?: WorkItemStatus;
  startDate: string;
  dueDate: string;
  items: number;
  storyPoints: number;
  progress?: number;
  
  // Hierarchy
  parentId?: string;
  parentType?: WorkItemType;
  themeId?: string;
  children?: RoadmapItem[];
  
  // Milestones
  milestones?: ItemMilestone[];
  
  // Dependencies
  hasDependencies?: boolean;
  dependenciesResolved?: boolean;
  
  // UI State
  isExpanded?: boolean;
  isModified?: boolean;
}

// ============================================
// THEMES
// ============================================

export interface Theme {
  id: string;
  name: string;
  epicIds: string[];
}

// ============================================
// TIMELINE CONFIGURATION
// ============================================

export interface TimelineConfig {
  startDate: string;
  endDate: string;
  viewMode: TimelineView;
  zoomLevel: ZoomLevel;
}

// ============================================
// DRAG & DROP
// ============================================

export interface DragState {
  isDragging: boolean;
  dragType: DragType | null;
  itemId: string | null;
  originalStart: Date | null;
  originalEnd: Date | null;
  currentStart: Date | null;
  currentEnd: Date | null;
  startX: number;
  startY: number;
}

// ============================================
// PENDING CHANGES & SYNC
// ============================================

export interface PendingChange {
  id: string;
  itemId: string;
  itemTitle: string;
  changeType: 'start_date' | 'due_date' | 'both';
  originalStart: string;
  originalEnd: string;
  newStart: string;
  newEnd: string;
  timestamp: string;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  errors?: SyncError[];
}

export interface SyncError {
  itemId: string;
  message: string;
}

// ============================================
// HISTORY (UNDO/REDO)
// ============================================

export interface HistoryState {
  past: PendingChange[][];
  present: PendingChange[];
  future: PendingChange[][];
}

// ============================================
// FILTER STATE
// ============================================

export interface PIFilterState {
  selectedPIs: string[];
  timeRange: 'all_time' | 'in_progress' | 'planning' | 'done' | 'custom';
  searchQuery: string;
  customStartDate?: string;
  customEndDate?: string;
}

// ============================================
// GROUPED VIEW
// ============================================

export interface RoadmapGroup {
  id: string;
  name: string;
  type: WorkItemType;
  items: RoadmapItem[];
  isExpanded: boolean;
}

export interface GroupedRoadmap {
  mode: GroupByMode;
  groups: RoadmapGroup[];
}

// ============================================
// COMPONENT PROPS
// ============================================

export interface RoadmapProps {
  items: RoadmapItem[];
  programIncrements: ProgramIncrement[];
  milestones: Milestone[];
  timelineConfig: TimelineConfig;
  onItemClick?: (itemId: string) => void;
  onDateChange?: (itemId: string, startDate: string, endDate: string) => void;
}

export interface GanttBarProps {
  item: RoadmapItem;
  left: number;
  width: number;
  onDragStart?: (e: React.MouseEvent, type: DragType) => void;
  onClick?: () => void;
}

export interface PISelecterProps {
  programIncrements: ProgramIncrement[];
  selectedPIs: string[];
  onSelectionChange: (selectedPIs: string[]) => void;
  onApply: () => void;
  onCancel: () => void;
}

export interface SyncModalProps {
  isOpen: boolean;
  pendingChanges: PendingChange[];
  onSync: () => void;
  onCancel: () => void;
}

export interface TimelineHeaderProps {
  config: TimelineConfig;
  programIncrements?: ProgramIncrement[];
  milestones?: Milestone[];
  showMilestones: boolean;
}

// ============================================
// STATE BADGE
// ============================================

export interface StateBadgeConfig {
  label: string;
  backgroundColor: string;
  textColor: string;
  fillCount: number;  // 1-6 squares filled
}

/**
 * State badge config using Catalyst V5 semantic tokens
 * Colors are CSS variables for guaranteed dark/light mode compliance
 */
export const STATE_BADGE_CONFIG: Record<WorkItemState, StateBadgeConfig> = {
  not_started: {
    label: 'NOT STARTED',
    backgroundColor: 'var(--neutral-bg)',
    textColor: 'var(--neutral-fg)',
    fillCount: 1,
  },
  in_progress: {
    label: 'IN PROGRESS',
    backgroundColor: 'var(--info-bg)',
    textColor: 'var(--info-fg)',
    fillCount: 3,
  },
  accepted: {
    label: 'ACCEPTED',
    backgroundColor: 'var(--success-bg)',
    textColor: 'var(--success-fg)',
    fillCount: 6,
  },
  blocked: {
    label: 'BLOCKED',
    backgroundColor: 'var(--danger-bg)',
    textColor: 'var(--danger-fg)',
    fillCount: 2,
  },
  done: {
    label: 'DONE',
    backgroundColor: 'var(--success-bg)',
    textColor: 'var(--success-fg)',
    fillCount: 6,
  },
};

// ============================================
// BAR COLORS
// ============================================

/**
 * Bar colors using Catalyst V5 semantic tokens
 */
export const BAR_COLORS: Record<WorkItemState, string> = {
  not_started: 'var(--warning-fg)',  // Warning for pending
  in_progress: 'var(--info-fg)',     // Info/Blue for active
  accepted: 'var(--success-fg)',     // Success/Teal for complete
  blocked: 'var(--danger-fg)',       // Danger/Red for blocked
  done: 'var(--success-fg)',         // Success/Teal for done
};

export const BAR_TYPE_COLORS: Record<WorkItemType, string> = {
  theme: 'var(--info-fg)',      // Blue (brand primary)
  epic: 'var(--info-fg)',       // Blue
  feature: 'var(--success-fg)', // Teal
  capability: 'var(--warning-fg)', // Amber
  story: 'var(--success-fg)',   // Teal
};

// ============================================
// UTILITY TYPES
// ============================================

export interface DateRange {
  start: Date;
  end: Date;
}

export interface Position {
  left: number;
  width: number;
}

export interface TooltipData {
  title: string;
  startDate: string;
  dueDate: string;
  milestones?: ItemMilestone[];
  progress?: number;
  status?: WorkItemStatus;
}
