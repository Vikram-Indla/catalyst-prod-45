/**
 * Program-Project Hierarchy Type Definitions
 * 
 * Hierarchy Structure:
 * - PROGRAM (top level, maps to 'portfolios' table)
 *   └── PROJECT (must be linked to Program, maps to 'programs' table)
 *         ├── Inherits Epics from Program
 *         ├── Features (linked to Epics)
 *         ├── Stories (linked to Features)
 *         ├── Tasks (standalone)
 *         ├── Subtasks (under Stories/Tasks)
 *         ├── Defects (standalone)
 *         └── Production Incidents (standalone)
 */

// ============================================
// SHARED TYPES
// ============================================

export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

export type Severity = 'critical' | 'major' | 'minor' | 'trivial';

export type ProjectType = 'scrum' | 'kanban';

export type IssueType = 
  | 'epic' 
  | 'feature' 
  | 'story' 
  | 'task' 
  | 'subtask' 
  | 'defect' 
  | 'incident';

export type IssueStatus = 
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'done'
  | 'cancelled';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// ============================================
// PROGRAM MODEL (maps to 'portfolios' table)
// ============================================

export interface Program {
  id: string;
  key: string;              // e.g., "PROD"
  name: string;             // e.g., "Product Program"
  description: string | null;
  lead: User | null;
  leadId: string | null;
  projects: Project[];      // Projects under this program
  epics: Epic[];            // All epics in this program
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;       // True for "Default" program
  status: 'active' | 'inactive';
}

export interface ProgramCreate {
  key: string;
  name: string;
  description?: string;
  leadId?: string;
  isDefault?: boolean;
}

export interface ProgramUpdate {
  key?: string;
  name?: string;
  description?: string | null;
  leadId?: string | null;
  status?: 'active' | 'inactive';
}

// ============================================
// PROJECT MODEL (maps to 'programs' table)
// ============================================

export interface Project {
  id: string;
  key: string;              // e.g., "ICP"
  name: string;             // e.g., "ICP Project"
  description: string | null;
  programId: string;        // REQUIRED - must link to program
  programKey: string;
  program?: Program;
  type: ProjectType;
  lead: User | null;
  leadId: string | null;
  defaultAssignee: User | null;
  defaultAssigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  isStarred: boolean;
}

export interface ProjectCreate {
  key: string;
  name: string;
  description?: string;
  programId: string;        // REQUIRED
  type?: ProjectType;
  leadId?: string;
  defaultAssigneeId?: string;
}

export interface ProjectUpdate {
  key?: string;
  name?: string;
  description?: string | null;
  programId?: string;
  type?: ProjectType;
  leadId?: string | null;
  defaultAssigneeId?: string | null;
}

// ============================================
// EPIC MODEL (lives at Program level)
// ============================================

export interface Epic {
  id: string;
  key: string;              // e.g., "PROD-1"
  programId: string;        // Lives in Program
  programKey: string;
  summary: string;
  description: string | null;
  status: IssueStatus;
  priority: Priority;
  assignee: User | null;
  assigneeId: string | null;
  reporter: User | null;
  reporterId: string | null;
  labels: string[];
  storyPoints: number | null;
  health: 'green' | 'yellow' | 'red' | 'gray' | null;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  features?: Feature[];     // Child features
}

export interface EpicCreate {
  programId: string;
  summary: string;
  description?: string;
  priority?: Priority;
  assigneeId?: string;
  labels?: string[];
}

// ============================================
// FEATURE MODEL (lives at Project level, links to Epic)
// ============================================

export interface Feature {
  id: string;
  key: string;              // e.g., "ICP-1"
  projectId: string;
  projectKey: string;
  epicId: string;           // REQUIRED - must link to Epic
  epicKey: string;
  epic?: Epic;
  summary: string;
  description: string | null;
  status: IssueStatus;
  priority: Priority;
  assignee: User | null;
  assigneeId: string | null;
  reporter: User | null;
  reporterId: string | null;
  labels: string[];
  storyPoints: number | null;
  health: 'green' | 'yellow' | 'red' | 'gray' | null;
  createdAt: Date;
  updatedAt: Date;
  stories?: Story[];        // Child stories
}

export interface FeatureCreate {
  projectId: string;
  epicId: string;           // REQUIRED
  summary: string;
  description?: string;
  priority?: Priority;
  assigneeId?: string;
  labels?: string[];
}

// ============================================
// STORY MODEL (lives at Project level, optionally links to Feature)
// ============================================

export interface Story {
  id: string;
  key: string;              // e.g., "ICP-2"
  projectId: string;
  projectKey: string;
  featureId: string | null; // Optional - can link to Feature
  featureKey: string | null;
  feature?: Feature | null;
  epicId: string | null;    // Inherited from Feature
  epicKey: string | null;
  summary: string;
  description: string | null;
  status: IssueStatus;
  priority: Priority;
  assignee: User | null;
  assigneeId: string | null;
  reporter: User | null;
  reporterId: string | null;
  storyPoints: number | null;
  labels: string[];
  acceptanceCriteria: string | null;
  createdAt: Date;
  updatedAt: Date;
  subtasks?: Subtask[];     // Child subtasks
}

export interface StoryCreate {
  projectId: string;
  featureId?: string;
  summary: string;
  description?: string;
  priority?: Priority;
  assigneeId?: string;
  storyPoints?: number;
  labels?: string[];
  acceptanceCriteria?: string;
}

// ============================================
// TASK MODEL (standalone at Project level)
// ============================================

export interface Task {
  id: string;
  key: string;              // e.g., "ICP-3"
  projectId: string;
  projectKey: string;
  parentId: string | null;  // Can be standalone or under Story
  parentKey: string | null;
  parentType: 'story' | null;
  summary: string;
  description: string | null;
  status: IssueStatus;
  priority: Priority;
  assignee: User | null;
  assigneeId: string | null;
  reporter: User | null;
  reporterId: string | null;
  labels: string[];
  estimatedHours: number | null;
  loggedHours: number | null;
  createdAt: Date;
  updatedAt: Date;
  subtasks?: Subtask[];     // Child subtasks
}

export interface TaskCreate {
  projectId: string;
  parentId?: string;
  summary: string;
  description?: string;
  priority?: Priority;
  assigneeId?: string;
  labels?: string[];
  estimatedHours?: number;
}

// ============================================
// SUBTASK MODEL (must have parent: Story or Task)
// ============================================

export interface Subtask {
  id: string;
  key: string;              // e.g., "ICP-4"
  projectId: string;
  projectKey: string;
  parentId: string;         // REQUIRED - must have parent
  parentKey: string;
  parentType: 'story' | 'task';
  summary: string;
  description: string | null;
  status: IssueStatus;
  priority: Priority;
  assignee: User | null;
  assigneeId: string | null;
  reporter: User | null;
  reporterId: string | null;
  estimatedHours: number | null;
  loggedHours: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubtaskCreate {
  projectId: string;
  parentId: string;         // REQUIRED
  parentType: 'story' | 'task';
  summary: string;
  description?: string;
  priority?: Priority;
  assigneeId?: string;
  estimatedHours?: number;
}

// ============================================
// DEFECT MODEL (standalone at Project level)
// ============================================

export interface Defect {
  id: string;
  key: string;              // e.g., "ICP-5"
  projectId: string;
  projectKey: string;
  summary: string;
  description: string | null;
  status: IssueStatus;
  priority: Priority;
  severity: Severity;
  assignee: User | null;
  assigneeId: string | null;
  reporter: User | null;
  reporterId: string | null;
  labels: string[];
  stepsToReproduce: string | null;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  environment: string | null;
  affectsVersions: string[];
  fixVersions: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}

export interface DefectCreate {
  projectId: string;
  summary: string;
  description?: string;
  priority?: Priority;
  severity: Severity;
  assigneeId?: string;
  labels?: string[];
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  environment?: string;
}

// ============================================
// PRODUCTION INCIDENT MODEL (standalone at Project level)
// ============================================

export interface ProductionIncident {
  id: string;
  key: string;              // e.g., "ICP-6"
  projectId: string;
  projectKey: string;
  summary: string;
  description: string | null;
  status: IssueStatus;
  priority: 'highest' | 'high';  // Incidents are always high priority
  severity: 'critical' | 'major';
  assignee: User | null;
  assigneeId: string | null;
  reporter: User | null;
  reporterId: string | null;
  labels: string[];
  impactDescription: string | null;
  rootCause: string | null;
  resolution: string | null;
  affectedServices: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  acknowledgedAt: Date | null;
  escalatedAt: Date | null;
}

export interface ProductionIncidentCreate {
  projectId: string;
  summary: string;
  description?: string;
  priority?: 'highest' | 'high';
  severity: 'critical' | 'major';
  assigneeId?: string;
  labels?: string[];
  impactDescription?: string;
  affectedServices?: string[];
}

// ============================================
// UNIFIED ISSUE TYPE (for generic handling)
// ============================================

export interface Issue {
  id: string;
  key: string;
  type: IssueType;
  projectId: string;
  projectKey: string;
  programId?: string;       // Only for Epics
  programKey?: string;
  parentId?: string | null;
  parentKey?: string | null;
  parentType?: string | null;
  epicId?: string | null;
  epicKey?: string | null;
  featureId?: string | null;
  featureKey?: string | null;
  summary: string;
  description: string | null;
  status: IssueStatus;
  priority: Priority;
  assignee: User | null;
  assigneeId: string | null;
  reporter: User | null;
  reporterId: string | null;
  labels: string[];
  storyPoints?: number | null;
  severity?: Severity;
  health?: 'green' | 'yellow' | 'red' | 'gray' | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date | null;
}

export interface IssueCreate {
  type: IssueType;
  projectId: string;
  programId?: string;       // Required for epics
  parentId?: string;
  epicId?: string;
  featureId?: string;
  summary: string;
  description?: string;
  priority?: Priority;
  assigneeId?: string;
  labels?: string[];
  storyPoints?: number;
  severity?: Severity;
}

// ============================================
// HIERARCHY HELPERS
// ============================================

export interface IssueHierarchy {
  epic?: Epic;
  feature?: Feature;
  story?: Story;
  task?: Task;
  subtask?: Subtask;
}

export interface ProjectHierarchy {
  program: Program;
  project: Project;
  epics: Epic[];            // Inherited from Program
  features: Feature[];
  stories: Story[];
  tasks: Task[];
  subtasks: Subtask[];
  defects: Defect[];
  incidents: ProductionIncident[];
}

// Issue type configuration for UI
export const ISSUE_TYPE_CONFIG: Record<IssueType, {
  label: string;
  pluralLabel: string;
  icon: string;
  color: string;
  canHaveParent: boolean;
  parentTypes: IssueType[];
  canHaveChildren: boolean;
  childTypes: IssueType[];
}> = {
  epic: {
    label: 'Epic',
    pluralLabel: 'Epics',
    icon: '⚡',
    color: '#904EE2',
    canHaveParent: false,
    parentTypes: [],
    canHaveChildren: true,
    childTypes: ['feature'],
  },
  feature: {
    label: 'Feature',
    pluralLabel: 'Features',
    icon: '🎯',
    color: '#36B37E',
    canHaveParent: true,
    parentTypes: ['epic'],
    canHaveChildren: true,
    childTypes: ['story'],
  },
  story: {
    label: 'Story',
    pluralLabel: 'Stories',
    icon: '📖',
    color: '#36B37E',
    canHaveParent: true,
    parentTypes: ['feature'],
    canHaveChildren: true,
    childTypes: ['subtask'],
  },
  task: {
    label: 'Task',
    pluralLabel: 'Tasks',
    icon: '✅',
    color: '#4C9AFF',
    canHaveParent: true,
    parentTypes: ['story'],
    canHaveChildren: true,
    childTypes: ['subtask'],
  },
  subtask: {
    label: 'Subtask',
    pluralLabel: 'Subtasks',
    icon: '📋',
    color: '#4C9AFF',
    canHaveParent: true,
    parentTypes: ['story', 'task'],
    canHaveChildren: false,
    childTypes: [],
  },
  defect: {
    label: 'Defect',
    pluralLabel: 'Defects',
    icon: '🐛',
    color: '#FF5630',
    canHaveParent: false,
    parentTypes: [],
    canHaveChildren: false,
    childTypes: [],
  },
  incident: {
    label: 'Incident',
    pluralLabel: 'Incidents',
    icon: '🚨',
    color: '#FF5630',
    canHaveParent: false,
    parentTypes: [],
    canHaveChildren: false,
    childTypes: [],
  },
};

// Priority configuration for UI
export const PRIORITY_CONFIG: Record<Priority, {
  label: string;
  icon: string;
  color: string;
}> = {
  highest: { label: 'Highest', icon: '🔴', color: '#FF5630' },
  high: { label: 'High', icon: '🟠', color: '#FF991F' },
  medium: { label: 'Medium', icon: '🟡', color: '#FFAB00' },
  low: { label: 'Low', icon: '🟢', color: '#36B37E' },
  lowest: { label: 'Lowest', icon: '🔵', color: '#0065FF' },
};

// Severity configuration for UI
export const SEVERITY_CONFIG: Record<Severity, {
  label: string;
  color: string;
}> = {
  critical: { label: 'Critical', color: '#FF5630' },
  major: { label: 'Major', color: '#FF991F' },
  minor: { label: 'Minor', color: '#FFAB00' },
  trivial: { label: 'Trivial', color: '#6B778C' },
};
