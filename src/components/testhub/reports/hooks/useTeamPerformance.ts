/**
 * useTeamPerformance — real-data hook for the Team Performance report (B1 group 9).
 * Feature: CAT-TESTHUB-REPORT-REVAMP-20260627-001.
 *
 * Team derivation (D-010): testers assigned to a project's test cases. Scope = project (D-011).
 * Per-tester: assigned, executed (pass/fail/blocked), pending, defects raised. Plus team totals.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamMemberRow {
  testerId: string;
  name: string;
  assigned: number;
  executed: number;
  passed: number;
  failed: number;
  blocked: number;
  pending: number;
  defects: number;
}

export interface TeamPerformance {
  members: TeamMemberRow[];
  totals: { testers: number; assigned: number; executed: number; passed: number; failed: number; defects: number };
}

export function useTeamPerformance(projectId?: string) {
  return useQuery({
    queryKey: ['team-performance', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<TeamPerformance> => {
      // 1) Project cases + their assignee
      const { data: cases, error: casesError } = await supabase
        .from('tm_test_cases')
        .select('id, assigned_to')
        .eq('project_id', projectId!)
        .not('assigned_to', 'is', null);
      if (casesError) throw casesError;
      const caseList = (cases ?? []) as { id: string; assigned_to: string }[];
      if (!caseList.length) return { members: [], totals: { testers: 0, assigned: 0, executed: 0, passed: 0, failed: 0, defects: 0 } };

      const caseAssignee = new Map(caseList.map((c) => [c.id, c.assigned_to]));
      const caseIds = caseList.map((c) => c.id);
      const testerIds = Array.from(new Set(caseList.map((c) => c.assigned_to)));

      // 2) Names
      const { data: profs, error: profsError } = await supabase.from('profiles').select('id, full_name').in('id', testerIds);
      if (profsError) throw profsError;
      const nameById = new Map((profs ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? p.id]));

      // 3) Per-case latest status (cycle scope) → attribute to the case's assignee
      const member = new Map<string, TeamMemberRow>();
      const ensure = (id: string): TeamMemberRow => {
        let m = member.get(id);
        if (!m) { m = { testerId: id, name: nameById.get(id) ?? id, assigned: 0, executed: 0, passed: 0, failed: 0, blocked: 0, pending: 0, defects: 0 }; member.set(id, m); }
        return m;
      };
      for (const c of caseList) ensure(c.assigned_to).assigned += 1;

      const { data: scope, error: scopeError } = await supabase
        .from('tm_cycle_scope')
        .select('test_case_id, current_status')
        .in('test_case_id', caseIds);
      if (scopeError) throw scopeError;
      for (const s of scope ?? []) {
        const row = s as { test_case_id: string; current_status: string };
        const tid = caseAssignee.get(row.test_case_id);
        if (!tid) continue;
        const m = ensure(tid);
        if (row.current_status === 'passed') { m.passed += 1; m.executed += 1; }
        else if (row.current_status === 'failed') { m.failed += 1; m.executed += 1; }
        else if (row.current_status === 'blocked') { m.blocked += 1; m.executed += 1; }
        else m.pending += 1;
      }

      // 4) Defects raised per tester (in this project)
      const { data: defects, error: defectsError } = await supabase
        .from('tm_defects')
        .select('reporter_id')
        .eq('project_id', projectId!);
      if (defectsError) throw defectsError;
      for (const d of defects ?? []) {
        const rid = (d as { reporter_id: string | null }).reporter_id;
        if (rid && member.has(rid)) ensure(rid).defects += 1;
      }

      const members = Array.from(member.values()).sort((a, b) => b.assigned - a.assigned);
      const totals = members.reduce(
        (t, m) => ({
          testers: t.testers + 1,
          assigned: t.assigned + m.assigned,
          executed: t.executed + m.executed,
          passed: t.passed + m.passed,
          failed: t.failed + m.failed,
          defects: t.defects + m.defects,
        }),
        { testers: 0, assigned: 0, executed: 0, passed: 0, failed: 0, defects: 0 },
      );

      return { members, totals };
    },
  });
}
