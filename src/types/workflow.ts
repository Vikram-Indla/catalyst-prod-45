export interface WorkflowStatus {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  description?: string;
}

export const WORKFLOW_STATUSES: WorkflowStatus[] = [
  { id: 'backlog', name: 'Backlog', color: 'hsl(210, 5%, 80%)', bgColor: 'hsl(210, 5%, 80%, 0.15)', description: 'Awaiting prioritization' },
  { id: 'design', name: 'Design', color: 'hsl(30, 22%, 44%)', bgColor: 'hsl(30, 22%, 44%, 0.15)', description: 'In design phase' },
  { id: 'ready_dev', name: 'Ready for Development', color: 'hsl(217, 91%, 60%)', bgColor: 'hsl(217, 91%, 60%, 0.1)', description: 'Ready to be picked up' },
  { id: 'in_dev', name: 'In Development', color: 'hsl(32, 45%, 60%)', bgColor: 'hsl(32, 45%, 60%, 0.15)', description: 'Actively being developed' },
  { id: 'qa', name: 'QA Testing', color: 'hsl(38, 92%, 50%)', bgColor: 'hsl(38, 92%, 50%, 0.1)', description: 'Ready for quality assurance' },
  { id: 'uat', name: 'UAT Testing', color: 'hsl(32, 41%, 71%)', bgColor: 'hsl(32, 41%, 71%, 0.2)', description: 'User acceptance testing' },
  { id: 'beta', name: 'In Beta', color: 'hsl(120, 14%, 43%)', bgColor: 'hsl(120, 14%, 43%, 0.15)', description: 'Beta release' },
  { id: 'ready_prod', name: 'Ready for Production', color: 'hsl(142, 71%, 45%)', bgColor: 'hsl(142, 71%, 45%, 0.1)', description: 'Approved for production' },
  { id: 'in_prod', name: 'In Production', color: 'hsl(142, 76%, 29%)', bgColor: 'hsl(142, 76%, 29%, 0.15)', description: 'Deployed to production' },
  { id: 'on_hold', name: 'On Hold', color: 'hsl(0, 0%, 45%)', bgColor: 'hsl(0, 0%, 45%, 0.1)', description: 'Paused or blocked' },
];

// Define valid transitions from each status
export const VALID_TRANSITIONS: Record<string, string[]> = {
  backlog: ['design', 'on_hold'],
  design: ['ready_dev', 'backlog', 'on_hold'],
  ready_dev: ['in_dev', 'design', 'on_hold'],
  in_dev: ['qa', 'design', 'on_hold'],
  qa: ['uat', 'in_dev', 'on_hold'],
  uat: ['beta', 'qa', 'on_hold'],
  beta: ['ready_prod', 'uat', 'on_hold'],
  ready_prod: ['in_prod', 'beta', 'on_hold'],
  in_prod: ['on_hold'],
  on_hold: ['backlog', 'design', 'ready_dev', 'in_dev', 'qa', 'uat', 'beta', 'ready_prod'],
};

// Transitions that typically require approval
export const APPROVAL_TRANSITIONS = [
  { from: 'in_dev', to: 'qa' },
  { from: 'qa', to: 'uat' },
  { from: 'uat', to: 'beta' },
  { from: 'ready_prod', to: 'in_prod' },
];

// Get status order for determining backward transitions
const STATUS_ORDER = WORKFLOW_STATUSES.map(s => s.id);

export function isBackwardTransition(fromStatus: string, toStatus: string): boolean {
  if (toStatus === 'on_hold') return false;
  const fromIndex = STATUS_ORDER.indexOf(fromStatus);
  const toIndex = STATUS_ORDER.indexOf(toStatus);
  return toIndex < fromIndex;
}

export function getWorkflowStatus(statusId: string): WorkflowStatus | undefined {
  return WORKFLOW_STATUSES.find(s => s.id === statusId);
}

export function requiresApproval(fromStatus: string, toStatus: string): boolean {
  return APPROVAL_TRANSITIONS.some(t => t.from === fromStatus && t.to === toStatus);
}
