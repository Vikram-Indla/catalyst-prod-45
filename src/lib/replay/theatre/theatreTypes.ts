// Theatre input types
export type TheatreMode = 'product-br' | 'project-epic' | 'release-bundle' | 'view-modal';

export type TheatrePersonRole = 'reporter' | 'assignee' | 'qa-owner' | 'incident-owner' | 'release-owner' | 'contributor';

export interface TheatrePerson {
  id: string;
  name: string;
  avatarUrl: string | null; // null = use initials
  initials: string;
  color: string; // consistent avatar bg color
  roles: TheatrePersonRole[];
  enteredAt: string; // ISO date when they entered the story
}

export type TheatreItemType = 'Business Request' | 'Epic' | 'Feature' | 'Story' | 'QA Bug' | 'Production Incident' | 'Change Request' | 'Business Gap';

export interface TheatreStatusSegment {
  status: string;
  category: 'To Do' | 'In Progress' | 'Done';
  startAt: string; // ISO
  endAt: string | null; // null = current/open
  durationDays: number | null;
  assignee: TheatrePerson | null;
}

export interface TheatreRegression {
  fromStatus: string;
  toStatus: string;
  startAt: string;
  endAt: string | null;
  durationDays: number | null;
  isBoomerang: boolean; // returned to original status
  assignee: TheatrePerson | null;
}

export interface TheatreMilestone {
  type: 'sprint_entry' | 'release_assigned' | 'sprint_end' | 'release_date' | 'due_date';
  at: string;
  label: string;
  context: string; // e.g. "Sprint 2.2 — 15 May 2026"
}

export interface TheatreCharacter {
  key: string; // e.g. "MDT-742"
  type: TheatreItemType;
  title: string;
  parentKey: string | null;
  reporter: TheatrePerson | null;
  segments: TheatreStatusSegment[];
  regressions: TheatreRegression[];
  milestones: TheatreMilestone[];
  createdAt: string;
  completedAt: string | null;
  isLateAddition: boolean;
  daysLateAfterParent: number | null;
  isScopeCreep: boolean;
  hierarchyLevel: number; // 0=root, 1=epic, 2=story/feature, 3=subtask — subtasks excluded
  moduleSource: string; // "Product · MDT" | "Project · BAU"
}

export type TheatreEventType =
  | 'replay_opening'
  | 'person_entered'
  | 'item_created'
  | 'branch_created'
  | 'status_transition'
  | 'assignee_handover'
  | 'sprint_assigned'
  | 'release_assigned'
  | 'regression_started'
  | 'boomerang_returned'
  | 'hold_started'
  | 'hold_released'
  | 'late_item_added'
  | 'item_completed'
  | 'branch_completed'
  | 'final_map_formed'
  | 'contribution_credits';

export interface TheatreEvent {
  id: string;
  type: TheatreEventType;
  date: string; // ISO — when this event occurred
  pauseMs: number; // how long to hold on this event during playback

  // Primary subject
  character?: TheatreCharacter;
  person?: TheatrePerson;
  fromPerson?: TheatrePerson;
  toPerson?: TheatrePerson;

  // Status context
  fromStatus?: string;
  toStatus?: string;
  durationDays?: number;

  // Milestone context
  milestone?: TheatreMilestone;

  // Narrative
  headline: string; // "Story BAU-727 entered the delivery branch"
  subheadline?: string; // optional subtitle
  bullets: string[]; // evidence bullets
  whyItMatters: string; // executive "why" explanation

  // Camera instruction
  focusKey: string | null; // which item to focus on
  cameraAction: 'none' | 'pan-to-item' | 'zoom-in' | 'zoom-out' | 'survey';

  // Visual instruction
  animationType: 'fade-in' | 'branch-grow' | 'path-draw' | 'avatar-move' | 'regression-arc' | 'milestone-drop' | 'complete-pulse' | 'map-form' | 'credits-roll';

  // Grouping — dense events in same branch
  groupId?: string; // events with same groupId can be grouped
  groupLabel?: string; // "3 related events in User Management branch"
}

export interface TheatreContribution {
  person: TheatrePerson;
  roleInJourney: string; // "Business Reporter / Originator"
  itemsReported: TheatreCharacter[];
  itemsOwned: TheatreCharacter[];
  totalDaysHeld: number;
  handoversReceived: number;
  handoversGiven: number;
  bugsHandled: TheatreCharacter[];
  incidentsHandled: TheatreCharacter[];
  sprintBoundWork: TheatreCharacter[];
  releaseBoundWork: TheatreCharacter[];
  significantEvents: string[]; // key narrative highlights
}

export interface TheatreScript {
  mode: TheatreMode;
  rootKey: string;
  rootTitle: string;
  rootType: TheatreItemType;
  period: string; // "Feb 2026 – Aug 2026"

  characters: TheatreCharacter[];
  people: TheatrePerson[];
  events: TheatreEvent[];
  contributions: TheatreContribution[];

  releaseContext?: {
    number: string;
    name: string;
    startDate: string;
    endDate: string | null;
    totalTickets: number;
    connectedTrees: number;
    independentTickets: number;
  };

  sprintContext?: {
    name: string;
    startDate: string;
    endDate: string;
  };

  // Summary stats
  stats: {
    totalDays: number;
    completedItems: number;
    openItems: number;
    regressions: number;
    boomerangs: number;
    lateAdditions: number;
    handovers: number;
    longestDwellStatus: string;
    longestDwellDays: number;
    mostActiveAssignee: TheatrePerson | null;
  };
}

export interface TheatreEligibility {
  isEligible: boolean;
  reasons: string[]; // why it's eligible (or why not)
  score: number; // 0–100 lifecycle richness score
}

export interface TheatreConfig {
  mode: TheatreMode;
  enableProductReplay: boolean;
  enableProjectReplay: boolean;
  enableReleaseReplay: boolean;
  minTransitionCount: number;
  minChildCount: number;
  oversightToleranceHours: number;
  defaultSpeed: number; // 1 = normal, 2 = fast
  defaultPauseMs: number;
  showRegressions: boolean;
  showBoomerangs: boolean;
  showSprintMarkers: boolean;
  showReleaseMarkers: boolean;
  showLateAdditions: boolean;
  subtaskTypes: string[];
}

export const DEFAULT_THEATRE_CONFIG: TheatreConfig = {
  mode: 'product-br',
  enableProductReplay: true,
  enableProjectReplay: true,
  enableReleaseReplay: true,
  minTransitionCount: 3,
  minChildCount: 0,
  oversightToleranceHours: 1,
  defaultSpeed: 1,
  defaultPauseMs: 2000,
  showRegressions: true,
  showBoomerangs: true,
  showSprintMarkers: true,
  showReleaseMarkers: true,
  showLateAdditions: true,
  subtaskTypes: ['Sub-task', 'Backend', 'Frontend', 'Integration', 'API Requirement', 'BRD Task', 'Figma'],
};
