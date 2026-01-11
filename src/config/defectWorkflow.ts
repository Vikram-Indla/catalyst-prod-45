/**
 * Enterprise Defect Workflow Configuration
 * Phase 1: 16-status system with 5-column Kanban grouping
 * Catalyst V5 Compliant Colors
 */

// Catalyst V5 Compliant Colors
export const WORKFLOW_COLORS = {
  gray: { bg: 'bg-gray-100', text: 'text-gray-700', solid: 'bg-gray-500', border: 'border-gray-400' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', solid: 'bg-blue-600', border: 'border-blue-500' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-700', solid: 'bg-teal-600', border: 'border-teal-500' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', solid: 'bg-orange-500', border: 'border-orange-500' },
  red: { bg: 'bg-red-100', text: 'text-red-700', solid: 'bg-red-600', border: 'border-red-500' },
  green: { bg: 'bg-green-100', text: 'text-green-700', solid: 'bg-green-600', border: 'border-green-500' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700', solid: 'bg-amber-500', border: 'border-amber-500' },
} as const;

export type WorkflowColor = keyof typeof WORKFLOW_COLORS;

export interface DefectStatus {
  id: string;
  name: string;
  description: string;
  category: 'backlog' | 'dev' | 'qa' | 'hold' | 'release' | 'done';
  color: WorkflowColor;
  order: number;
  isInitial: boolean;
  isFinal: boolean;
  kanbanColumn: string;
}

export const DEFECT_STATUSES: DefectStatus[] = [
  // BACKLOG COLUMN
  {
    id: 'todo',
    name: 'TODO',
    description: 'New defect awaiting triage',
    category: 'backlog',
    color: 'gray',
    order: 1,
    isInitial: true,
    isFinal: false,
    kanbanColumn: 'backlog'
  },
  {
    id: 'blocked',
    name: 'BLOCKED',
    description: 'Defect blocked by dependency or issue',
    category: 'hold',
    color: 'red',
    order: 2,
    isInitial: false,
    isFinal: false,
    kanbanColumn: 'backlog'
  },
  {
    id: 'awaiting_info',
    name: 'AWAITING INFO',
    description: 'Waiting for more information from reporter',
    category: 'hold',
    color: 'orange',
    order: 3,
    isInitial: false,
    isFinal: false,
    kanbanColumn: 'backlog'
  },
  {
    id: 'deferred',
    name: 'DEFERRED',
    description: 'Deferred for future integration',
    category: 'hold',
    color: 'gray',
    order: 4,
    isInitial: false,
    isFinal: false,
    kanbanColumn: 'backlog'
  },
  
  // DEV COLUMN
  {
    id: 'under_implementation',
    name: 'UNDER IMPLEMENTATION',
    description: 'Developer is actively working on fix',
    category: 'dev',
    color: 'blue',
    order: 5,
    isInitial: false,
    isFinal: false,
    kanbanColumn: 'dev'
  },
  
  // QA COLUMN
  {
    id: 'ready_for_qa',
    name: 'READY FOR QA',
    description: 'Fix complete, awaiting QA verification',
    category: 'qa',
    color: 'teal',
    order: 6,
    isInitial: false,
    isFinal: false,
    kanbanColumn: 'qa'
  },
  {
    id: 'retest',
    name: 'RETEST',
    description: 'Requires retesting after fix',
    category: 'qa',
    color: 'teal',
    order: 7,
    isInitial: false,
    isFinal: false,
    kanbanColumn: 'qa'
  },
  {
    id: 'rejected',
    name: 'REJECTED',
    description: 'QA rejected the fix, needs rework',
    category: 'qa',
    color: 'red',
    order: 8,
    isInitial: false,
    isFinal: false,
    kanbanColumn: 'qa'
  },
  {
    id: 'reopen',
    name: 'RE-OPEN',
    description: 'Previously closed defect has regressed',
    category: 'qa',
    color: 'orange',
    order: 9,
    isInitial: false,
    isFinal: false,
    kanbanColumn: 'qa'
  },
  
  // RELEASE COLUMN
  {
    id: 'uat_ready',
    name: 'UAT READY',
    description: 'Ready for User Acceptance Testing',
    category: 'release',
    color: 'teal',
    order: 10,
    isInitial: false,
    isFinal: false,
    kanbanColumn: 'release'
  },
  {
    id: 'in_beta',
    name: 'IN BETA',
    description: 'Deployed to beta environment',
    category: 'release',
    color: 'blue',
    order: 11,
    isInitial: false,
    isFinal: false,
    kanbanColumn: 'release'
  },
  {
    id: 'beta_ready',
    name: 'BETA READY',
    description: 'Verified in beta, ready for production',
    category: 'release',
    color: 'teal',
    order: 12,
    isInitial: false,
    isFinal: false,
    kanbanColumn: 'release'
  },
  {
    id: 'ready_for_production',
    name: 'READY FOR PROD',
    description: 'Approved for production deployment',
    category: 'release',
    color: 'green',
    order: 13,
    isInitial: false,
    isFinal: false,
    kanbanColumn: 'release'
  },
  {
    id: 'in_production',
    name: 'IN PRODUCTION',
    description: 'Deployed to production environment',
    category: 'release',
    color: 'green',
    order: 14,
    isInitial: false,
    isFinal: false,
    kanbanColumn: 'release'
  },
  {
    id: 'monitor',
    name: 'MONITOR',
    description: 'In production, under observation',
    category: 'release',
    color: 'amber',
    order: 15,
    isInitial: false,
    isFinal: false,
    kanbanColumn: 'release'
  },
  
  // DONE COLUMN
  {
    id: 'closed',
    name: 'CLOSED',
    description: 'Defect verified and closed',
    category: 'done',
    color: 'gray',
    order: 16,
    isInitial: false,
    isFinal: true,
    kanbanColumn: 'done'
  }
];

// Kanban Column Configuration
export interface KanbanColumn {
  id: string;
  name: string;
  color: WorkflowColor;
  statuses: string[];
  isVisible: boolean;
  order: number;
}

export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'backlog',
    name: 'Backlog',
    color: 'gray',
    statuses: ['todo', 'blocked', 'awaiting_info', 'deferred'],
    isVisible: true,
    order: 1
  },
  {
    id: 'dev',
    name: 'Development',
    color: 'blue',
    statuses: ['under_implementation'],
    isVisible: true,
    order: 2
  },
  {
    id: 'qa',
    name: 'QA / Testing',
    color: 'teal',
    statuses: ['ready_for_qa', 'retest', 'rejected', 'reopen'],
    isVisible: true,
    order: 3
  },
  {
    id: 'release',
    name: 'Release Pipeline',
    color: 'green',
    statuses: ['uat_ready', 'in_beta', 'beta_ready', 'ready_for_production', 'in_production', 'monitor'],
    isVisible: true,
    order: 4
  },
  {
    id: 'done',
    name: 'Done',
    color: 'gray',
    statuses: ['closed'],
    isVisible: true,
    order: 5
  }
];

// Helper functions
export const getStatusById = (id: string): DefectStatus | undefined => {
  return DEFECT_STATUSES.find(s => s.id === id);
};

export const getStatusesByColumn = (columnId: string): DefectStatus[] => {
  return DEFECT_STATUSES.filter(s => s.kanbanColumn === columnId)
    .sort((a, b) => a.order - b.order);
};

export const getStatusColor = (statusId: string) => {
  const status = getStatusById(statusId);
  if (!status) return WORKFLOW_COLORS.gray;
  return WORKFLOW_COLORS[status.color];
};

export const getColumnById = (columnId: string): KanbanColumn | undefined => {
  return DEFAULT_KANBAN_COLUMNS.find(c => c.id === columnId);
};

// Legacy status mapping (for backwards compatibility)
export const LEGACY_STATUS_MAP: Record<string, string> = {
  'open': 'todo',
  'in_progress': 'under_implementation',
  'resolved': 'ready_for_qa',
  'reopened': 'reopen'
};

export const mapLegacyStatus = (status: string): string => {
  return LEGACY_STATUS_MAP[status] || status;
};
