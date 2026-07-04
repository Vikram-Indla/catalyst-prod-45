// Incident Lifecycle Business Rules
// Source of truth: 05-BUSINESS-RULES.md

import type { IncidentStatus, SeverityLevel, ImpactLevel, UrgencyLevel, SupportLevel } from '@/types/incident';

// ============================================
// 1. STATUS STATE MACHINE
// ============================================

/**
 * Valid status transitions per business rules:
 * 
 * NEW → TRIAGE (when assignee set)
 * NEW → RESOLVED (direct resolution for minor issues)
 * TRIAGE → IN_PROGRESS (investigation started)
 * TRIAGE → RESOLVED (quick fix applied)
 * IN_PROGRESS → ON_HOLD (blocked/waiting for external)
 * IN_PROGRESS → RESOLVED (fix verified)
 * ON_HOLD → IN_PROGRESS (blocker resolved)
 * RESOLVED → CLOSED (verified by reporter/QA)
 * RESOLVED → IN_PROGRESS (issue recurred)
 * CLOSED → (terminal state, no transitions)
 * 
 * Note: Current DB uses 'open' instead of 'new', 'to_committee' for committee queue
 */

interface StatusTransition {
  action: string;
  targetStatus: IncidentStatus;
  label: string;
  condition?: string;
}

// Maps current status → allowed transitions
export const STATUS_TRANSITIONS: Record<IncidentStatus, StatusTransition[]> = {
  open: [
    { action: 'Start Triage', targetStatus: 'triage', label: 'Triage', condition: 'Assignee should be set' },
    { action: 'Resolve Directly', targetStatus: 'resolved', label: 'Resolved', condition: 'For minor issues' },
  ],
  triage: [
    { action: 'Start Investigation', targetStatus: 'in_progress', label: 'In Progress' },
    { action: 'Quick Fix', targetStatus: 'resolved', label: 'Resolved' },
    { action: 'Send to Committee', targetStatus: 'to_committee', label: 'To Committee', condition: 'L3 only' },
  ],
  to_committee: [
    { action: 'Committee Approved', targetStatus: 'in_progress', label: 'In Progress', condition: 'After approval' },
    { action: 'Return to Triage', targetStatus: 'triage', label: 'Triage' },
  ],
  in_progress: [
    { action: 'Put On Hold', targetStatus: 'resolved', label: 'Resolved' },
    { action: 'Resolve', targetStatus: 'resolved', label: 'Resolved' },
  ],
  resolved: [
    { action: 'Close Verified', targetStatus: 'closed', label: 'Closed' },
    { action: 'Reopen', targetStatus: 'in_progress', label: 'In Progress', condition: 'Issue recurred' },
  ],
  converted: [
    // Terminal state - no outbound transitions
  ],
  closed: [
    // Terminal state per business rules - no transitions allowed
  ],
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  const transitions = STATUS_TRANSITIONS[from] || [];
  return transitions.some(t => t.targetStatus === to);
}

/**
 * Get allowed transitions from current status
 */
export function getAllowedTransitions(
  currentStatus: IncidentStatus,
  supportLevel?: SupportLevel | null,
  hasCommitteeApproval?: boolean
): StatusTransition[] {
  const transitions = STATUS_TRANSITIONS[currentStatus] || [];
  
  return transitions.filter(t => {
    // L3 committee gate: only L3 can go to_committee
    if (t.targetStatus === 'to_committee' && supportLevel !== 'L3') {
      return false;
    }
    
    // If waiting for committee and not approved, block in_progress transition
    if (currentStatus === 'to_committee' && t.targetStatus === 'in_progress' && !hasCommitteeApproval) {
      return false;
    }
    
    return true;
  });
}

// ============================================
// 2. PRIORITY CALCULATION
// ============================================
//
// Priority is derived server-side by the derive_incident_priority() DB trigger
// (impact x urgency matrix, severity not a factor). No client-side calculator here —
// a prior version of this file computed priority from a severity+impact+urgency score
// sum that never matched the DB and was never imported by any component. Read
// `incident.priority` from the row; don't recompute it client-side.

// ============================================
// 3. CAP COMMITTEE RULES
// ============================================

/**
 * Determine if incident requires committee approval
 * Only L3 incidents require committee approval for conversion
 */
export function requiresCommitteeApproval(supportLevel?: SupportLevel | null): boolean {
  return supportLevel === 'L3';
}

/**
 * Check if conversion is allowed based on committee status
 */
export function canConvertIncident(
  status: IncidentStatus,
  supportLevel?: SupportLevel | null,
  committeeStatus?: 'pending' | 'approved' | 'rejected' | null
): { allowed: boolean; reason?: string } {
  // Already converted
  if (status === 'converted') {
    return { allowed: false, reason: 'Incident is already converted' };
  }
  
  // L3 requires committee approval
  if (supportLevel === 'L3') {
    if (!committeeStatus) {
      return { allowed: false, reason: 'L3 incident must be sent to committee first' };
    }
    if (committeeStatus === 'pending') {
      return { allowed: false, reason: 'Awaiting committee approval' };
    }
    if (committeeStatus === 'rejected') {
      return { allowed: false, reason: 'Committee has rejected conversion' };
    }
  }
  
  return { allowed: true };
}

/**
 * Check if incident can be sent to committee
 * Only L3 incidents can be sent to committee
 */
export function canSendToCommittee(
  currentStatus: IncidentStatus,
  supportLevel?: SupportLevel | null
): { allowed: boolean; reason?: string } {
  if (currentStatus === 'to_committee') {
    return { allowed: false, reason: 'Already in committee queue' };
  }
  
  if (currentStatus === 'converted' || currentStatus === 'closed') {
    return { allowed: false, reason: 'Cannot send closed/converted incidents to committee' };
  }
  
  if (supportLevel !== 'L3') {
    return { allowed: false, reason: 'Only L3 incidents require committee approval' };
  }
  
  return { allowed: true };
}

// ============================================
// 4. MAJOR INCIDENT RULES
// ============================================

/**
 * Auto-flag major incident criteria:
 * IF severity = 'SEV1' AND impact = 'High' AND urgency = 'High' THEN isMajorIncident = TRUE
 */
export function shouldBeMajorIncident(
  severity: SeverityLevel,
  impact: ImpactLevel,
  urgency: UrgencyLevel
): boolean {
  return severity === 'SEV1' && impact === 'high' && urgency === 'high';
}

// ============================================
// 5. SLA TARGETS
// ============================================
//
// SLA minutes live in the `sla_configs` table (source of truth for
// create_incident_sla_record() / recalc_incident_sla_on_severity_change()).
// No client-side constant here — a prior version of this file hardcoded
// different minutes than the DB table and was never imported anywhere.
// Query `sla_configs` (or read `sla_records` due dates) instead of hardcoding.
