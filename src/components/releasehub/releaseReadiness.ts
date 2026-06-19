/**
 * releaseReadiness — pure composition for the Release readiness panel.
 *
 * Turns the live Release Hub data (releases + pending approvals + freeze
 * conflicts) into a per-release worklist of gates. No score, no invented
 * severity tiers — only Jira-native gate states and an SLA-based overdue age.
 *
 * Stalled SOP signal: a gate whose approval has been waiting longer than the
 * SLA is marked overdue (overdueDays > 0). Until a per-gate SOP/SLA table
 * exists, one flat default applies (DEFAULT_SLA_DAYS).
 */
import { differenceInDays } from 'date-fns';
import type { ReleaseListRow, PendingApproval } from '@/hooks/useReleaseHub';

export const DEFAULT_SLA_DAYS = 3;

export type GateStatus = 'awaiting_approval' | 'in_review' | 'blocked' | 'approved';
export type GateTransition = 'approve' | 'open' | 'review';

export interface ReadinessTicket {
  key: string;
  summary: string;
  assignee: string | null;
}

export interface ReadinessGate {
  id: string;
  name: string;
  status: GateStatus;
  /** Days past SLA. null when the gate is within SLA or not time-bound. */
  overdueDays: number | null;
  owner: { role: string | null; name: string | null };
  sopAction: string;
  transition: GateTransition;
  tickets: ReadinessTicket[];
}

export interface ReleaseReadiness {
  releaseId: string;
  name: string;
  targetDate: string | null;
  overdueCount: number;
  blockedCount: number;
  gates: ReadinessGate[];
}

export interface ReadinessInput {
  releases: ReleaseListRow[];
  approvals: PendingApproval[];
  freezeConflicts: number;
  now: Date;
  slaDays?: number;
}

function approvalGateName(chgNumber: string | null): string {
  return chgNumber && /^CR/i.test(chgNumber) ? 'Change record approval' : 'Approval';
}

export function buildReleaseReadiness(input: ReadinessInput): ReleaseReadiness[] {
  const sla = input.slaDays ?? DEFAULT_SLA_DAYS;

  return input.releases.map((r) => {
    const gates: ReadinessGate[] = [];

    // Approval gates — release sign-offs that are still waiting. Overdue is an
    // SLA breach measured from wait_started_at; never an invented severity.
    input.approvals
      .filter((a) => a.entityType === 'release' && a.changeId === r.id)
      .forEach((a) => {
        const waitDays = a.waitStartedAt ? differenceInDays(input.now, new Date(a.waitStartedAt)) : null;
        const overdueDays = waitDays != null && waitDays > sla ? waitDays : null;
        gates.push({
          id: a.id,
          name: approvalGateName(a.chgNumber),
          status: 'awaiting_approval',
          overdueDays,
          owner: { role: a.role, name: a.approverName },
          sopAction: a.chgNumber ? `approve ${a.chgNumber}` : 'approve',
          transition: 'approve',
          tickets: a.chgNumber
            ? [{ key: a.chgNumber, summary: a.changeTitle ?? '', assignee: a.approverName }]
            : [],
        });
      });

    // Deploy-freeze gate — a freeze conflict blocks the deployment window. The
    // conflict count is environment-scoped, so only releases with a target env
    // carry it. The release manager owns the exception per SOP.
    if (input.freezeConflicts > 0 && r.target_env) {
      gates.push({
        id: `freeze-${r.id}`,
        name: 'Deploy-freeze window',
        status: 'blocked',
        overdueDays: null,
        owner: { role: 'release_manager', name: null },
        sopAction: 'request exception',
        transition: 'open',
        tickets: [],
      });
    }

    return {
      releaseId: r.id,
      name: r.name,
      targetDate: r.planned_release_date ?? r.target_date,
      overdueCount: gates.filter((g) => g.overdueDays != null).length,
      blockedCount: gates.filter((g) => g.status === 'blocked').length,
      gates,
    };
  });
}
