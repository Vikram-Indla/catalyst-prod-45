/**
 * Resource 360° Drawer Types
 * Complete work context visualization for resources
 */

export interface Resource360Data {
  id: string;
  profile_id?: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar_url?: string;
  currentAllocation: number;
  availableCapacity: number;
}

export interface WorkItemAssignment {
  id: string;
  item_id: string;
  title: string;
  type: 'theme' | 'objective' | 'key_result' | 'epic' | 'feature' | 'story' | 'defect' | 'incident' | 'business_request';
  status: 'current' | 'future' | 'completed' | 'cancelled';
  level: 'enterprise' | 'program' | 'project' | 'product';
  project?: { id: string; name: string };
  parent?: { id: string; item_id: string; title: string; type: string };
  story_points?: number;
  allocation_percentage?: number;
  release_version?: string;
  start_date?: string;
  end_date?: string;
}

export interface HierarchyNode {
  id: string;
  item_id: string;
  title: string;
  type: 'theme' | 'objective' | 'key_result' | 'epic' | 'feature' | 'story' | 'defect' | 'incident' | 'business_request';
  status: 'current' | 'future' | 'completed';
  level: 'enterprise' | 'program' | 'project' | 'product';
  project?: string;
  story_points?: number;
  release_version?: string;
  children?: HierarchyNode[];
}

export interface SunburstNode {
  name: string;
  id?: string;
  value?: number;
  color?: string;
  type?: string;
  children?: SunburstNode[];
}

export interface SunburstMetrics {
  totalItems: number;
  totalStoryPoints: number;
  itemsByType: Record<string, number>;
  itemsByStatus?: {
    completed: number;
    in_progress: number;
    upcoming: number;
  };
}

export type DrawerTab = 'hierarchy' | 'sunburst';

// Work item type icons and colors config
export const WorkItemConfig = {
  theme: { color: '#0d9488', bgColor: 'bg-[#0d9488]/10', label: 'Theme', level: 'enterprise' },
  objective: { color: '#6b7280', bgColor: 'bg-[#6b7280]/10', label: 'Objective', level: 'enterprise' },
  key_result: { color: '#3b82f6', bgColor: 'bg-[#3b82f6]/10', label: 'Key Result', level: 'enterprise' },
  epic: { color: '#2563eb', bgColor: 'bg-[#2563eb]/10', label: 'Epic', level: 'program' },
  feature: { color: '#0d9488', bgColor: 'bg-[#0d9488]/10', label: 'Feature', level: 'project' },
  story: { color: '#10b981', bgColor: 'bg-[#10b981]/10', label: 'Story', level: 'project' },
  defect: { color: '#dc2626', bgColor: 'bg-[#dc2626]/10', label: 'Defect', level: 'project' },
  incident: { color: '#d97706', bgColor: 'bg-[#d97706]/10', label: 'Incident', level: 'project' },
  business_request: { color: '#22c55e', bgColor: 'bg-[#22c55e]/10', label: 'Business Request', level: 'product' },
} as const;

export const StatusConfig = {
  current: { color: '#0d9488', bgColor: 'bg-[#0d9488]/10', label: 'CURRENT' },
  future: { color: '#2563eb', bgColor: 'bg-[#2563eb]/10', label: 'FUTURE' },
  completed: { color: '#6b7280', bgColor: 'bg-[#6b7280]/10', label: 'COMPLETED' },
  cancelled: { color: '#dc2626', bgColor: 'bg-[#dc2626]/10', label: 'CANCELLED' },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// R360 V2 — Database-aligned interfaces (from G03 Schema)
// ═══════════════════════════════════════════════════════════════════════════════

export type R360Hub =
  | 'StrategyHub' | 'ProductHub' | 'ProjectHub' | 'ReleaseHub'
  | 'TestHub' | 'IncidentHub' | 'TaskHub';

export type R360WorkItemType =
  | 'Initiative' | 'Epic' | 'Feature' | 'Story' | 'Subtask' | 'Bug' | 'Task'
  | 'Test Case' | 'Test Plan' | 'Incident' | 'Release' | 'Requirement';

export type R360StatusCategory = 'todo' | 'progress' | 'done';
export type R360Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type R360ResourceRole = 'assigned' | 'reported';
export type R360ContractType = 'Fixed' | 'Variable' | 'Freelance';
export type R360LocationType = 'Onsite' | 'Off-Shore' | 'Hybrid';
export type R360ReleaseStatus = 'Planning' | 'In Progress' | 'Released' | 'Cancelled';
export type R360Verdict = 'on_track' | 'at_risk' | 'off_track';
export type R360ExportFormat = 'pdf' | 'docx' | 'xlsx';

export interface R360AuditFields {
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: string | null;
}

export interface R360Department extends R360AuditFields {
  id: string;
  deptCode: string;
  name: string;
  description: string | null;
}

export interface R360Vendor extends R360AuditFields {
  id: string;
  vendorCode: string;
  name: string;
}

export interface R360Assignment extends R360AuditFields {
  id: string;
  assignmentCode: string;
  name: string;
}

export interface R360Resource extends R360AuditFields {
  id: string;
  rid: string;
  userId: string | null;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  initials: string | null;
  jobRole: string;
  departmentId: string;
  assignmentId: string | null;
  contractStart: string;
  contractEnd: string;
  contractType: R360ContractType;
  vendorId: string;
  country: string;
  locationType: R360LocationType;
  ctc: number | null;
  isActive: boolean;
}

export interface R360Release extends R360AuditFields {
  id: string;
  releaseKey: string;
  name: string;
  startDate: string;
  endDate: string;
  status: R360ReleaseStatus;
}

export interface R360Project extends R360AuditFields {
  id: string;
  projectKey: string;
  name: string;
}

export interface R360WorkItem extends R360AuditFields {
  id: string;
  itemKey: string;
  title: string;
  description: string | null;
  workItemType: R360WorkItemType;
  sourceHub: R360Hub;
  status: string;
  statusCategory: R360StatusCategory;
  priority: R360Priority;
  projectId: string | null;
  releaseId: string | null;
  parentItemId: string | null;
  resourceId: string;
  resourceRole: R360ResourceRole;
  assignedBy: string | null;
  assignedDate: string;
  dueDate: string | null;
  resolvedDate: string | null;
  sourceTable: string | null;
  sourceId: string | null;
}

export interface R360StatusTransition {
  id: string;
  workItemId: string;
  fromStatus: string | null;
  toStatus: string;
  fromCategory: R360StatusCategory | null;
  toCategory: R360StatusCategory;
  transitionedAt: string;
  dwellDays: number | null;
  createdAt: string;
  createdBy: string | null;
}

export interface R360DeliveryMetrics {
  avgSubtaskDays: number;
  avgStoryDays: number;
  avgBugDays: number;
  pickupSpeedHours: number;
  weeklyClosureAvg: number;
  weeklyClosureHistory: number[];
  closureRatePct: number;
  totalAssigned: number;
  totalClosed: number;
}

export interface R360HubDistributionEntry { pct: number; items: number; }
export interface R360HubClosureEntry { closurePct: number; avgCycleDays: number | null; }

export interface R360RoleExpectationData {
  expected: string[];
  actualDistribution: Array<{ label: string; pct: number }>;
  anomalies: string[];
}

export interface R360AiProfile extends R360AuditFields {
  id: string;
  resourceId: string;
  resourcePattern: string;
  deliverySummary: string | null;
  strengthAnalysis: string | null;
  deliveryMetrics: R360DeliveryMetrics;
  hubDistribution: Record<R360Hub, R360HubDistributionEntry>;
  hubClosureRates: Record<R360Hub, R360HubClosureEntry>;
  roleExpectation: R360RoleExpectationData;
  generatedAt: string;
  generationVersion: string;
  nextRefreshAt: string | null;
}

export interface R360AiBehavioralPattern extends R360AuditFields {
  id: string;
  resourceId: string;
  patternText: string;
  evidenceRefs: string[];
  evidenceFilter: string | null;
  sortOrder: number;
}

export interface R360ProjectStandingEntry {
  project: string;
  items: number;
  done: number;
  statusEmoji: string;
}

export interface R360AiReleaseStanding extends R360AuditFields {
  id: string;
  resourceId: string;
  releaseId: string;
  totalItems: number;
  doneCount: number;
  progressCount: number;
  todoCount: number;
  completionPct: number;
  projectStandings: R360ProjectStandingEntry[];
  criticalPathItems: string[];
  verdict: R360Verdict;
  verdictText: string | null;
  confidenceScore: number | null;
  currentClosureRate: number | null;
  requiredClosureRate: number | null;
  snapshotDate: string;
}

export interface R360AiExport {
  id: string;
  resourceId: string;
  exportDate: string;
  exportFormat: R360ExportFormat;
  fileUrl: string | null;
  requestedBy: string;
  createdAt: string;
}

// View interfaces
export interface R360ResourceSummary {
  resourceId: string;
  fullName: string;
  jobRole: string;
  rid: string;
  totalItems: number;
  todoCount: number;
  progressCount: number;
  doneCount: number;
}

export interface R360WorkItemEnriched extends R360WorkItem {
  ageDays: number;
  resourceName: string;
  resourceInitials: string;
  resourceJobRole: string;
  assignedByName: string | null;
  projectName: string | null;
  projectKey: string | null;
  releaseKey: string | null;
  releaseEndDate: string | null;
  parentItemKey: string | null;
  effectiveDueDate: string | null;
  daysUntilDue: number | null;
}

export interface R360ResourceHubDistribution {
  resourceId: string;
  sourceHub: R360Hub;
  hubItemCount: number;
  hubPct: number;
  hubDoneCount: number;
  hubClosurePct: number;
}

export interface R360ChronologyEvent {
  resourceId: string;
  eventType: 'assigned' | 'status_change' | 'closed';
  eventDate: string;
  workItemId: string;
  itemKey: string;
  title: string;
  workItemType: R360WorkItemType;
  sourceHub: R360Hub;
  statusCategory: R360StatusCategory;
  actorName: string | null;
  releaseKey: string | null;
}

export interface R360GanttEntry {
  resourceId: string;
  workItemId: string;
  itemKey: string;
  title: string;
  workItemType: R360WorkItemType;
  statusCategory: R360StatusCategory;
  barStart: string;
  barEnd: string;
  barDays: number;
  releaseKey: string | null;
  projectName: string | null;
}

export interface R360ConstellationMember {
  resourceId: string;
  fullName: string;
  initials: string;
  jobRole: string;
  vendorId: string;
  vendorName: string;
  totalItems: number;
  doneItems: number;
  projectCount: number;
}

// Edge function types
export interface R360GenerateAiProfileRequest {
  resourceId: string;
  forceRefresh?: boolean;
}

export interface R360GenerateAiProfileResponse {
  success: boolean;
  profileId: string;
  generatedAt: string;
  sections: {
    resourcePattern: boolean;
    deliveryMetrics: boolean;
    hubDistribution: boolean;
    roleExpectation: boolean;
    behavioralPatterns: boolean;
    releaseStanding: boolean;
  };
}

export interface R360ExportPdfRequest {
  resourceId: string;
  exportDate: string;
  sections?: string[];
}

export interface R360ExportPdfResponse {
  success: boolean;
  exportId: string;
  fileUrl: string;
  generatedAt: string;
}

export interface R360TimeLapseRequest {
  resourceId: string;
  releaseId?: string;
}

export interface R360TimeLapseStep {
  stepIndex: number;
  date: string;
  eventType: 'assigned' | 'created' | 'resolved';
  workItem: R360WorkItemEnriched;
  assignerName: string;
  narrativeText: string;
}

export interface R360TimeLapseResponse {
  steps: R360TimeLapseStep[];
  totalSteps: number;
  dateRange: { start: string; end: string };
}
