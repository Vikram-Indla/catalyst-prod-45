// Backlog Management Module Types
// Based on Catalyst Backlog specification

export type BacklogScope = 'enterprise' | 'portfolio' | 'solution' | 'program' | 'team';

export type BacklogType = 'theme' | 'epic' | 'capability' | 'feature' | 'story' | 'defect' | 'objective';

export type BacklogViewType = 
  | 'list' 
  | 'state' 
  | 'processFlow' 
  | 'column' 
  | 'sprint' 
  | 'teamFeatures';

export type TimeboxType = 'pi' | 'sprint' | 'all';

export interface BacklogState {
  scope: BacklogScope;
  type: BacklogType;
  timeboxType: TimeboxType;
  timeboxId: string | null;
  view: BacklogViewType;
  filters: Record<string, unknown>;
  sort?: { field: string; direction: 'asc' | 'desc' };
  columnsShown: string[];
  hideAcceptedConfig: Record<string, any>;
  unassignedOpen: boolean;
}

export interface BacklogMeta {
  states?: string[];
  processSteps?: ProcessStep[];
  programIncrements?: ProgramIncrement[];
  sprints?: Sprint[];
  teams?: Team[];
  fields: BacklogField[];
  permissions: BacklogPermissions;
  hideAcceptedConfig: Record<string, any>;
  rankingAllowed: boolean;
  availableViews: BacklogViewType[];
}

export interface BacklogPermissions {
  canRank: boolean;
  canAssign: boolean;
  canMassMove: boolean;
  canMassDelete: boolean;
  canRestore: boolean;
  canPermanentDelete: boolean;
  canEdit: boolean;
  canCreate: boolean;
}

export interface BacklogItem {
  id: string;
  type: BacklogType;
  name: string;
  displayId: string | number;
  state?: string;
  processStep?: string;
  piId?: string | null;
  sprintId?: string | null;
  teamId?: string | null;
  programId?: string | null;
  portfolioId?: string | null;
  rank?: number;
  globalRank?: number;
  portfolioRank?: number;
  programRank?: number;
  piRank?: number;
  health?: 'green' | 'yellow' | 'red' | 'gray';
  points?: number;
  estimate?: number;
  mvp?: boolean;
  blocked?: boolean;
  parentId?: string | null;
  themeId?: string | null;
  epicId?: string | null;
  capabilityId?: string | null;
  featureId?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
  owner?: string;
  labels?: BacklogLabel[];
  tags?: string[];
  isParked?: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  parkedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // Epic-specific roll-up fields (Phase II)
  progress?: number;
  featureCount?: number;
  completedFeatures?: number;
  totalEstimate?: number;
  technicalScore?: number;
  businessScore?: number;
  targetDate?: string | null;
  // Allow additional dynamic properties
  [key: string]: any;
}

export interface BacklogLabel {
  id: string;
  name: string;
  color: string;
}

export interface BacklogField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  options?: string[];
  visible: boolean;
}

export interface ProcessStep {
  id: string;
  name: string;
  order: number;
  exitCriteria?: string;
  color?: string;
}

export interface ProgramIncrement {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status?: 'planning' | 'active' | 'done';
}

export interface Sprint {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  teamId: string;
  piId?: string;
}

export interface Team {
  id: string;
  name: string;
  programId: string;
}

export interface BacklogQueryParams {
  scope: BacklogScope;
  type: BacklogType;
  timeboxType: TimeboxType;
  timeboxId?: string | null;
  view: BacklogViewType;
  sort?: { field: string; direction: 'asc' | 'desc' };
  filters?: Record<string, unknown>;
  search?: string;
}

export interface BacklogResponse {
  items: BacklogItem[];
  meta: BacklogMeta;
  sections?: BacklogPISection[];
}

export interface BacklogPISection {
  id: string;
  type: 'pi' | 'unassigned';
  piId?: string | null;
  piCode?: string;
  piName?: string;
  title: string;
  itemCount: number;
  isExpanded: boolean;
  progress?: number;
  items: BacklogItem[];
}

export interface MassMovePayload {
  itemIds: string[];
  target: {
    piId?: string;
    sprintId?: string;
    programId?: string;
    teamId?: string;
    processStepId?: string;
  };
}

export interface RankUpdatePayload {
  itemId: string;
  beforeId?: string;
  afterId?: string;
  targetRank?: number;
}
