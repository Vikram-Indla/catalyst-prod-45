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

// Generate workstream code from name
export function getWorkstreamCode(name: string): string {
  const codeMap: Record<string, string> = {
    'Senaie': 'SEN',
    'Catalyst': 'CAT',
    'Tahommona': 'TAH',
    'Delivery': 'DEL',
    'MIM': 'MIM',
    'Stand-Alone': 'STD',
    'Data & AI': 'DAI',
  };
  return codeMap[name] || name.slice(0, 3).toUpperCase();
}
