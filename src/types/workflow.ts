export interface WorkflowStatus {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  description?: string;
}

// Atlaskit semantic-token fallback hexes. Previously HSL, with four values
// collapsing to banned Golden Hour palette (§7). See types/views.ts for
// the canonical STATUS_CONFIG mapping rationale.
export const WORKFLOW_STATUSES: WorkflowStatus[] = [
  { id: 'backlog', name: 'Backlog', color: '#42526E', bgColor: '#DFE1E6', description: 'Awaiting prioritization' },
  { id: 'design', name: 'Design', color: '#5243AA', bgColor: '#EAE6FF', description: 'In design phase' },
  { id: 'ready_dev', name: 'Ready for Development', color: '#0052CC', bgColor: '#DEEBFF', description: 'Ready to be picked up' },
  { id: 'in_dev', name: 'In Development', color: '#FF991F', bgColor: '#FFF0B3', description: 'Actively being developed' },
  { id: 'qa', name: 'QA Testing', color: '#FFAB00', bgColor: '#FFF0B3', description: 'Ready for quality assurance' },
  { id: 'uat', name: 'UAT Testing', color: '#FF991F', bgColor: '#FFF0B3', description: 'User acceptance testing' },
  { id: 'beta', name: 'In Beta', color: '#36B37E', bgColor: '#E3FCEF', description: 'Beta release' },
  { id: 'ready_prod', name: 'Ready for Production', color: '#00875A', bgColor: '#E3FCEF', description: 'Approved for production' },
  { id: 'in_prod', name: 'In Production', color: '#006644', bgColor: '#E3FCEF', description: 'Deployed to production' },
  { id: 'on_hold', name: 'On Hold', color: '#42526E', bgColor: '#DFE1E6', description: 'Paused or blocked' },
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
