/**
 * useApprovalAge — real-data hook for the Approval Age report.
 * Feature: CAT-REPORTS-HUB-20260703-001 gap closure S2.3.
 *
 * Sources (both carry requested_at/decided_at natively — no history table needed):
 *  - tm_plan_approvals (test-plan approvals; subject = tm_test_plans.name)
 *  - tm_release_signoffs (release signoffs; subject = stakeholder_role)
 * Age = decided_at − requested_at for decided rows, now − requested_at for pending.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ApprovalAgeRow {
  id: string;
  kind: 'Plan approval' | 'Release signoff';
  subject: string;
  /** Decision/status label as stored ('pending', 'approved', …). */
  status: string;
  requestedAt: string | null;
  decidedAt: string | null;
  /** Whole days from request to decision (or to now when undecided). Null when requested_at missing. */
  ageDays: number | null;
}

export interface ApprovalAge {
  rows: ApprovalAgeRow[];
  pending: number;
  decided: number;
  avgDecisionDays: number | null;
  oldestPendingDays: number | null;
}

function days(from: string, to: number): number {
  return Math.max(0, Math.round((to - new Date(from).getTime()) / 86_400_000));
}

export function useApprovalAge() {
  return useQuery({
    queryKey: ['approval-age'],
    queryFn: async (): Promise<ApprovalAge> => {
      const now = Date.now();
      const [approvalsRes, signoffsRes] = await Promise.all([
        supabase.from('tm_plan_approvals').select('id, plan_id, status, requested_at, decided_at'),
        supabase.from('tm_release_signoffs').select('id, stakeholder_role, decision, requested_at, decided_at'),
      ]);
      if (approvalsRes.error) throw approvalsRes.error;
      if (signoffsRes.error) throw signoffsRes.error;

      const approvals = (approvalsRes.data ?? []) as {
        id: string; plan_id: string | null; status: string; requested_at: string | null; decided_at: string | null;
      }[];
      const signoffs = (signoffsRes.data ?? []) as {
        id: string; stakeholder_role: string | null; decision: string | null; requested_at: string | null; decided_at: string | null;
      }[];

      // Plan names for readable subjects.
      const planIds = [...new Set(approvals.map((a) => a.plan_id).filter(Boolean))] as string[];
      const planNameById = new Map<string, string>();
      if (planIds.length) {
        const { data: plans, error: plansError } = await supabase.from('tm_test_plans').select('id, name').in('id', planIds);
        if (plansError) throw plansError;
        for (const p of (plans ?? []) as { id: string; name: string }[]) planNameById.set(p.id, p.name);
      }

      const rows: ApprovalAgeRow[] = [
        ...approvals.map((a): ApprovalAgeRow => ({
          id: a.id,
          kind: 'Plan approval',
          subject: (a.plan_id && planNameById.get(a.plan_id)) || '—',
          status: a.status,
          requestedAt: a.requested_at,
          decidedAt: a.decided_at,
          ageDays: a.requested_at ? days(a.requested_at, a.decided_at ? new Date(a.decided_at).getTime() : now) : null,
        })),
        ...signoffs.map((s): ApprovalAgeRow => ({
          id: s.id,
          kind: 'Release signoff',
          subject: s.stakeholder_role ?? '—',
          status: s.decision ?? 'pending',
          requestedAt: s.requested_at,
          decidedAt: s.decided_at,
          ageDays: s.requested_at ? days(s.requested_at, s.decided_at ? new Date(s.decided_at).getTime() : now) : null,
        })),
      ].sort((a, b) => (b.ageDays ?? -1) - (a.ageDays ?? -1));

      const decidedRows = rows.filter((r) => r.decidedAt);
      const pendingRows = rows.filter((r) => !r.decidedAt);
      const decidedAges = decidedRows.map((r) => r.ageDays).filter((n): n is number => n !== null);
      const pendingAges = pendingRows.map((r) => r.ageDays).filter((n): n is number => n !== null);

      return {
        rows,
        pending: pendingRows.length,
        decided: decidedRows.length,
        avgDecisionDays: decidedAges.length
          ? Math.round((decidedAges.reduce((a, b) => a + b, 0) / decidedAges.length) * 10) / 10
          : null,
        oldestPendingDays: pendingAges.length ? Math.max(...pendingAges) : null,
      };
    },
  });
}
