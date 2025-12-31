/**
 * Catalyst Enterprise Roadmap Types
 */

export type ObjectiveStatus = "on-track" | "at-risk" | "blocked" | "pending";
export type DependencyType = "fs" | "ss" | "ff" | "sf";
export type MilestoneType = "strategic" | "release" | "decision";
export type TimesliceMode = "weekly" | "monthly" | "quarterly";
export type GroupByMode = "theme" | "status" | "owner" | "quarter";

export interface RoadmapObjective {
  id: string;
  name: string;
  status: ObjectiveStatus;
  owner: string;
  start: string;        // ISO date "2026-01-15"
  end: string;          // ISO date "2026-03-30"
  prog: number;         // 0-100 progress percentage
  critical?: boolean;   // Is on critical path
}

export interface RoadmapMilestone {
  id: string;
  name: string;
  type: MilestoneType;
  date: string;         // ISO date
}

export interface RoadmapTheme {
  id: string;
  name: string;
  color: string;        // Hex color
  order: number;
  objs: RoadmapObjective[];
  ms: RoadmapMilestone[];
}

export interface RoadmapDependency {
  from: string;         // Objective ID
  to: string;           // Objective ID
  type: DependencyType;
}

export interface RoadmapData {
  themes: RoadmapTheme[];
  deps: RoadmapDependency[];
}

export interface RoadmapFilters {
  status: ObjectiveStatus[];
  owners: string[];
}

export interface RoadmapState {
  slice: TimesliceMode;
  zoom: number;         // 50-150
  snap: boolean;
  dark: boolean;
  presentation: boolean;
  selected: string | null;
  depMode: boolean;
  depFrom: string | null;
  depType: DependencyType;
  collapsed: Set<string>;
  filters: RoadmapFilters;
  groupBy: GroupByMode;
  editing: string | null;
}

export interface TimelineConfig {
  start: Date;
  end: Date;
  today: Date;
}

export interface RoadmapGroup {
  id: string;
  name: string;
  color: string;
  order: number;
  objs: RoadmapObjective[];
  ms: RoadmapMilestone[];
}

export const STATUS_COLORS: Record<ObjectiveStatus, string> = {
  "on-track": "#0d9488",
  "at-risk": "#d97706",
  "blocked": "#dc2626",
  "pending": "#737373",
};

export const MILESTONE_COLORS: Record<MilestoneType, string> = {
  "strategic": "#d97706",
  "release": "#0d9488",
  "decision": "#8b5cf6",
};

export const LAYOUT = {
  panelWidth: 280,
  filterWidth: 240,
  headerHeight: 52,
  summaryHeight: 68,
  rowHeight: 44,
  barHeight: 28,
  themeHeight: 32,
};
