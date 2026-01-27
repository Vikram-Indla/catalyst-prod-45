// ============================================================
// WORKSTREAMS MODULE TYPES
// Type definitions for workstream cards and health calculations
// ============================================================

export interface WorkstreamMember {
  id: string;
  initials: string;
  color: string;
}

export interface WorkstreamData {
  id: string;
  name: string;
  code: string;
  color: string;
  task_count: number;
  overdue_count: number;
  completed_count: number;
  in_progress_count: number;
  backlog_count: number;
  progress: number;
  members: WorkstreamMember[];
  health: 'healthy' | 'at-risk' | 'critical';
}

export interface WorkstreamsSummary {
  totalWorkstreams: number;
  totalTasks: number;
  overallProgress: number;
  atRiskCount: number;
  criticalCount: number;
  healthyCount: number;
}

// Health calculation logic per spec
export function calculateHealth(
  overdueCount: number,
  taskCount: number,
  completedCount: number,
  backlogCount: number
): 'healthy' | 'at-risk' | 'critical' {
  if (taskCount === 0) return 'healthy';
  
  const overdueRate = overdueCount / taskCount;
  const progressRate = completedCount / taskCount;
  
  // Critical: >30% overdue OR <25% progress with tasks in backlog
  if (overdueRate > 0.3 || (progressRate < 0.25 && backlogCount > 5)) {
    return 'critical';
  }
  
  // At Risk: >15% overdue OR <50% progress midway through sprint
  if (overdueRate > 0.15 || progressRate < 0.5) {
    return 'at-risk';
  }
  
  return 'healthy';
}

// Workstream color palette from spec
export const WORKSTREAM_PALETTE: Record<string, string> = {
  'Senaie': '#06b6d4',
  'Senaie Track': '#06b6d4',
  'Catalyst': '#8b5cf6',
  'Catalyst Track': '#8b5cf6',
  'Tahommona': '#6366f1',
  'Tahommona Track': '#6366f1',
  'Delivery': '#f97316',
  'Delivery Track': '#f97316',
  'MIM': '#ec4899',
  'MIM Website': '#ec4899',
  'MIM Website Track': '#ec4899',
  'Stand-Alone Projects': '#84cc16',
  'Stand-Alone Projects Track': '#84cc16',
  'Data & AI': '#14b8a6',
  'Data & AI Track': '#14b8a6',
};

export function getWorkstreamColor(name: string): string {
  return WORKSTREAM_PALETTE[name] || '#64748b';
}

export function getWorkstreamCode(name: string): string {
  const codeMap: Record<string, string> = {
    'Senaie': 'SEN',
    'Senaie Track': 'SEN',
    'Catalyst': 'CAT',
    'Catalyst Track': 'CAT',
    'Tahommona': 'TAH',
    'Tahommona Track': 'TAH',
    'Delivery': 'DEL',
    'Delivery Track': 'DEL',
    'MIM': 'MIM',
    'MIM Website': 'MIM',
    'MIM Website Track': 'MIM',
    'Stand-Alone Projects': 'STD',
    'Stand-Alone Projects Track': 'STD',
    'Data & AI': 'DAI',
    'Data & AI Track': 'DAI',
  };
  return codeMap[name] || name.slice(0, 3).toUpperCase();
}
