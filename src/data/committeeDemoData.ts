/**
 * Committee Queue Demo Data
 * 
 * Realistic sample data for QA validation of:
 * - Majority approval logic
 * - Absolute veto override
 * - addedBy attribution
 * - Timeline with timestamps
 * 
 * Scenarios:
 * A - Pending (majority not reached)
 * B - Approved by majority
 * C - Veto supersedes all
 * D - Aging risk (>7 days)
 * E - Approver added after send
 * F - Multiple approvals at different times
 */

import type { CommitteeQueueItem, CommitteeApprover, CommitteeAction } from '@/hooks/useCommitteeQueue';
import type { Incident, SeverityLevel } from '@/types/incident';

// Helper to generate dates
const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const hoursAgo = (hours: number): string => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
};

// Demo users for approvers
const DEMO_USERS = [
  { id: 'u1', name: 'Ahmed Al-Rashid', initials: 'AR', hasVeto: true },
  { id: 'u2', name: 'Sarah Mitchell', initials: 'SM', hasVeto: false },
  { id: 'u3', name: 'Khalid Hassan', initials: 'KH', hasVeto: true },
  { id: 'u4', name: 'Maria Garcia', initials: 'MG', hasVeto: false },
  { id: 'u5', name: 'James Wilson', initials: 'JW', hasVeto: false },
  { id: 'u6', name: 'Fatima Noor', initials: 'FN', hasVeto: false },
  { id: 'u7', name: 'David Chen', initials: 'DC', hasVeto: false },
];

const ADDERS = [
  { id: 'a1', name: 'System Admin' },
  { id: 'a2', name: 'Release Manager' },
  { id: 'a3', name: 'Incident Lead' },
];

// Create base incident
function createIncident(
  id: string,
  key: string,
  title: string,
  severity: SeverityLevel,
  isMajor: boolean
): Incident {
  return {
    id,
    incident_key: key,
    title,
    description: `Demo incident for committee queue testing - ${title}`,
    status: 'to_committee',
    severity,
    support_level: 'L3',
    priority: 'P2',
    impact: 'high',
    urgency: 'medium',
    is_major_incident: isMajor,
    requires_committee: true,
    created_at: daysAgo(10),
    updated_at: daysAgo(1),
  };
}

// Create approver
function createApprover(
  userId: string,
  decision: 'pending' | 'approved' | 'vetoed',
  decidedAt?: string,
  comment?: string,
  addedBy?: string,
  addedAt?: string
): CommitteeApprover {
  const user = DEMO_USERS.find(u => u.id === userId)!;
  const adder = addedBy ? ADDERS.find(a => a.id === addedBy) : ADDERS[0];
  
  return {
    id: `approver-${userId}-${Math.random().toString(36).substr(2, 6)}`,
    userId,
    userName: user.name,
    userInitials: user.initials,
    userEmail: `${user.name.toLowerCase().replace(' ', '.')}@catalyst.com`,
    decision,
    decidedAt,
    comment,
    hasVeto: user.hasVeto,
    addedBy: adder?.name,
    addedAt: addedAt || daysAgo(5),
  };
}

// Compute last action from approvers
function computeLastAction(approvers: CommitteeApprover[], sentAt: string): CommitteeAction {
  const decidedApprovers = approvers
    .filter(a => a.decidedAt)
    .sort((a, b) => new Date(b.decidedAt!).getTime() - new Date(a.decidedAt!).getTime());
  
  if (decidedApprovers.length > 0) {
    const last = decidedApprovers[0];
    return {
      type: last.decision === 'vetoed' ? 'vetoed' : 'approved',
      by: last.userName,
      at: last.decidedAt,
      details: last.comment,
    };
  }
  
  return { type: 'sent_to_committee', at: sentAt };
}

// Create queue item
function createQueueItem(
  incident: Incident,
  approvers: CommitteeApprover[],
  sentAt: string,
  sentBy: string = 'Release Manager',
  dueAt?: string
): CommitteeQueueItem {
  const totalMembers = approvers.length;
  const requiredApprovals = Math.ceil(totalMembers / 2);
  const approvalsCompletedCount = approvers.filter(a => a.decision === 'approved').length;
  const vetoCount = approvers.filter(a => a.decision === 'vetoed').length;
  const pendingCount = approvers.filter(a => a.decision === 'pending').length;
  
  // Determine status: veto overrides all
  let committeeStatus: 'pending' | 'approved' | 'vetoed' = 'pending';
  let decisionAt: string | undefined;
  
  if (vetoCount > 0) {
    committeeStatus = 'vetoed';
    const vetoer = approvers.find(a => a.decision === 'vetoed');
    decisionAt = vetoer?.decidedAt;
  } else if (approvalsCompletedCount >= requiredApprovals) {
    committeeStatus = 'approved';
    const lastApproval = approvers
      .filter(a => a.decision === 'approved')
      .sort((a, b) => new Date(b.decidedAt!).getTime() - new Date(a.decidedAt!).getTime())[0];
    decisionAt = lastApproval?.decidedAt;
  }
  
  const agingDays = Math.floor(
    (Date.now() - new Date(sentAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    incident,
    committeeId: `committee-${incident.id}`,
    committeeStatus,
    committeeSentAt: sentAt,
    committeeSentBy: sentBy,
    committeeDecisionAt: decisionAt,
    committeeDueAt: dueAt,
    committeeMajorityThreshold: requiredApprovals,
    approvers,
    approvalsCompletedCount,
    approvalsTotalCount: totalMembers,
    approvalsRequiredCount: requiredApprovals,
    vetoCount,
    pendingCount,
    lastAction: computeLastAction(approvers, sentAt),
    agingDays,
  };
}

/**
 * Generate all demo scenarios
 */
export function generateCommitteeDemoData(): CommitteeQueueItem[] {
  const items: CommitteeQueueItem[] = [];

  // SCENARIO A — Pending (majority not reached)
  // 5 approvers, 2 approved, 3 pending, no veto, aging 2d
  items.push(createQueueItem(
    createIncident('demo-a', 'INC-2401', 'API Gateway timeout affecting checkout flow', 'SEV2', false),
    [
      createApprover('u1', 'approved', hoursAgo(18), undefined, 'a1', daysAgo(2)),
      createApprover('u2', 'approved', hoursAgo(12), undefined, 'a1', daysAgo(2)),
      createApprover('u3', 'pending', undefined, undefined, 'a2', daysAgo(2)),
      createApprover('u4', 'pending', undefined, undefined, 'a2', daysAgo(2)),
      createApprover('u5', 'pending', undefined, undefined, 'a1', daysAgo(2)),
    ],
    daysAgo(2),
    'Release Manager',
    daysAgo(-3) // Due in 3 days
  ));

  // SCENARIO B — Approved by majority (auto moved to In Progress)
  // 5 approvers, 3 approved, 2 pending, no veto
  items.push(createQueueItem(
    createIncident('demo-b', 'INC-2398', 'Database connection pool exhaustion in production', 'SEV1', true),
    [
      createApprover('u1', 'approved', hoursAgo(48), undefined, 'a3', daysAgo(3)),
      createApprover('u2', 'approved', hoursAgo(36), undefined, 'a3', daysAgo(3)),
      createApprover('u3', 'approved', hoursAgo(24), undefined, 'a3', daysAgo(3)),
      createApprover('u4', 'pending', undefined, undefined, 'a1', daysAgo(3)),
      createApprover('u6', 'pending', undefined, undefined, 'a1', daysAgo(3)),
    ],
    daysAgo(3),
    'Incident Lead'
  ));

  // SCENARIO C — Veto supersedes all
  // 5 approvers, 2 approved, 1 vetoed (with mandatory comment), 2 pending
  items.push(createQueueItem(
    createIncident('demo-c', 'INC-2395', 'Payment processing service degradation', 'SEV1', true),
    [
      createApprover('u1', 'approved', hoursAgo(72), undefined, 'a2', daysAgo(4)),
      createApprover('u2', 'approved', hoursAgo(60), undefined, 'a2', daysAgo(4)),
      createApprover('u3', 'vetoed', hoursAgo(48), 'Critical security implications not addressed. The proposed fix bypasses authentication checks and could expose customer payment data. Requires security review before proceeding.', 'a2', daysAgo(4)),
      createApprover('u4', 'pending', undefined, undefined, 'a1', daysAgo(4)),
      createApprover('u5', 'pending', undefined, undefined, 'a1', daysAgo(4)),
    ],
    daysAgo(4),
    'System Admin'
  ));

  // SCENARIO D — Aging risk (>7 days)
  // Pending item aging 12d
  items.push(createQueueItem(
    createIncident('demo-d', 'INC-2380', 'Legacy system integration failure - batch processing', 'SEV3', false),
    [
      createApprover('u2', 'approved', daysAgo(8), undefined, 'a1', daysAgo(12)),
      createApprover('u4', 'pending', undefined, undefined, 'a1', daysAgo(12)),
      createApprover('u5', 'pending', undefined, undefined, 'a3', daysAgo(12)),
      createApprover('u6', 'pending', undefined, undefined, 'a3', daysAgo(12)),
    ],
    daysAgo(12),
    'Release Manager',
    daysAgo(-2) // Due in 2 days (overdue soon)
  ));

  // SCENARIO E — Approver edits after send
  // Shows timeline entries: "Approver added by <User>"
  items.push(createQueueItem(
    createIncident('demo-e', 'INC-2402', 'CDN configuration causing asset delivery failures', 'SEV2', false),
    [
      createApprover('u1', 'approved', hoursAgo(6), undefined, 'a1', daysAgo(3)),
      createApprover('u2', 'pending', undefined, undefined, 'a1', daysAgo(3)),
      createApprover('u6', 'pending', undefined, undefined, 'a2', daysAgo(1)), // Added later
      createApprover('u7', 'pending', undefined, undefined, 'a3', hoursAgo(12)), // Added even later
    ],
    daysAgo(3),
    'Incident Lead'
  ));

  // SCENARIO F — Multiple approvers approved at different times
  // Spread decidedAt across 1–6 hours
  items.push(createQueueItem(
    createIncident('demo-f', 'INC-2399', 'Mobile app crash on iOS 17 devices', 'SEV2', false),
    [
      createApprover('u1', 'approved', hoursAgo(6), undefined, 'a1', daysAgo(1)),
      createApprover('u2', 'approved', hoursAgo(4), undefined, 'a1', daysAgo(1)),
      createApprover('u3', 'approved', hoursAgo(2), undefined, 'a1', daysAgo(1)),
      createApprover('u4', 'approved', hoursAgo(1), undefined, 'a2', daysAgo(1)),
      createApprover('u5', 'pending', undefined, undefined, 'a2', daysAgo(1)),
    ],
    daysAgo(1),
    'System Admin'
  ));

  // Additional variety scenarios
  
  // SEV4 low priority, still pending
  items.push(createQueueItem(
    createIncident('demo-g', 'INC-2405', 'Documentation portal search indexing delay', 'SEV4', false),
    [
      createApprover('u4', 'pending', undefined, undefined, 'a1', daysAgo(5)),
      createApprover('u5', 'pending', undefined, undefined, 'a1', daysAgo(5)),
      createApprover('u6', 'pending', undefined, undefined, 'a1', daysAgo(5)),
    ],
    daysAgo(5),
    'Release Manager'
  ));

  // SEV3 with mixed votes
  items.push(createQueueItem(
    createIncident('demo-h', 'INC-2403', 'Email notification service rate limiting', 'SEV3', false),
    [
      createApprover('u1', 'approved', hoursAgo(24), undefined, 'a2', daysAgo(2)),
      createApprover('u3', 'pending', undefined, undefined, 'a2', daysAgo(2)),
      createApprover('u5', 'pending', undefined, undefined, 'a3', daysAgo(2)),
      createApprover('u7', 'approved', hoursAgo(18), undefined, 'a3', daysAgo(2)),
    ],
    daysAgo(2),
    'Incident Lead'
  ));

  return items;
}

/**
 * Check if demo data should be loaded
 */
export function shouldLoadDemoData(): boolean {
  // Check URL param
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('seed') === '1') return true;
  }
  
  // Check if development mode
  if (import.meta.env.DEV) return true;
  
  return false;
}
