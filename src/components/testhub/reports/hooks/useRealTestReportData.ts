/**
 * useRealTestReportData — live Supabase data for all Lab-derived registry reports.
 * Feature: CAT-REPORTS-HUB-20260703-001 (Phase 2 Lane B).
 *
 * For one tm_projects id, assembles the full ReportData shape consumed by
 * ReportCanvas (execution / cases / defects / multi-cycle / traceability):
 *   - tm_test_cases (+ tm_case_priorities / tm_case_types / tm_folders / profiles maps)
 *   - tm_test_cycles + tm_cycle_scope (scope membership + current_status pivots)
 *   - tm_test_runs joined via cycle_scope (execution dates = completed_at ?? started_at)
 *   - tm_defects (severity × status; parent_key → ph_issues chain)
 *   - tm_requirement_links → ph_issues (traceability) + ph_issue_links enrichment
 *
 * Every query THROWS on error (react-query isError → ReportRenderer boundary).
 * Zero-assumption: missing dates/fields stay null — never defaulted.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  ReportCase,
  ReportCycle,
  ReportData,
  ReportDefect,
  ReportIssue,
  ReportIssueLink,
  ReportRun,
} from '@/pages/testhub/reports/lab/reportData';

export interface ProjectOption {
  label: string;
  value: string;
}

/** tm_projects options for the report project picker (shared last-used key). */
export function useTmProjectOptions() {
  return useQuery({
    queryKey: ['tm-projects-list'],
    queryFn: async (): Promise<ProjectOption[]> => {
      const { data, error } = await supabase
        .from('tm_projects')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw error;
      // DEF-007: tm_projects can carry stale duplicate rows sharing a name
      // (e.g. an unmerged "Senaei BAU" pair) — dedupe by name so pickers show one entry.
      const seenNames = new Set<string>();
      return (data ?? [])
        .filter((p: { id: string; name: string }) => !seenNames.has(p.name) && seenNames.add(p.name))
        .map((p: { id: string; name: string }) => ({ label: p.name, value: p.id }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

async function fetchNameMap(
  table: 'tm_case_priorities' | 'tm_case_types' | 'tm_folders',
): Promise<Map<string, string>> {
  const { data, error } = await supabase.from(table).select('id, name');
  if (error) throw error;
  return new Map((data ?? []).map((r: { id: string; name: string }) => [r.id, r.name]));
}

export function useRealTestReportData(projectId?: string, projectName?: string) {
  return useQuery({
    queryKey: ['real-test-report-data', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ReportData> => {
      // 1) Lookup maps (priority / type / folder names)
      const [priorityName, typeName, folderName] = await Promise.all([
        fetchNameMap('tm_case_priorities'),
        fetchNameMap('tm_case_types'),
        fetchNameMap('tm_folders'),
      ]);

      // 2) Test cases for the project
      const { data: caseRows, error: caseErr } = await supabase
        .from('tm_test_cases')
        .select('id, case_key, title, status, created_at, priority_id, case_type_id, folder_id, assigned_to')
        .eq('project_id', projectId!)
        .eq('archived', false);
      if (caseErr) throw caseErr;
      const caseIds = (caseRows ?? []).map((c) => c.id);

      // 3) Cycles for the project
      const { data: cycleRows, error: cycleErr } = await supabase
        .from('tm_test_cycles')
        .select('id, name, status, planned_start, planned_end, actual_start, actual_end')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: true });
      if (cycleErr) throw cycleErr;
      const cycleIds = (cycleRows ?? []).map((c) => c.id);

      // 4) Cycle scope (membership + current status pivot)
      let scopeRows: { id: string; cycle_id: string; test_case_id: string; current_status: string | null }[] = [];
      if (cycleIds.length) {
        const { data, error } = await supabase
          .from('tm_cycle_scope')
          .select('id, cycle_id, test_case_id, current_status')
          .in('cycle_id', cycleIds);
        if (error) throw error;
        scopeRows = data ?? [];
      }
      const scopeById = new Map(scopeRows.map((s) => [s.id, s]));

      // 5) Runs joined via cycle_scope
      let runRows: {
        id: string;
        cycle_scope_id: string;
        status: string | null;
        executed_by: string | null;
        started_at: string | null;
        completed_at: string | null;
      }[] = [];
      if (scopeRows.length) {
        const { data, error } = await supabase
          .from('tm_test_runs')
          .select('id, cycle_scope_id, status, executed_by, started_at, completed_at')
          .in('cycle_scope_id', scopeRows.map((s) => s.id));
        if (error) throw error;
        runRows = data ?? [];
      }

      // 6) Defects for the project
      const { data: defectRows, error: defectErr } = await supabase
        .from('tm_defects')
        .select('id, defect_key, title, severity, status, created_at, parent_key, source_test_case_id')
        .eq('project_id', projectId!);
      if (defectErr) throw defectErr;

      // 7) Requirement links for the project's cases
      let linkRows: { test_case_id: string; external_key: string | null }[] = [];
      if (caseIds.length) {
        const { data, error } = await supabase
          .from('tm_requirement_links')
          .select('test_case_id, external_key')
          .in('test_case_id', caseIds);
        if (error) throw error;
        linkRows = data ?? [];
      }
      const linksByCase = new Map<string, string[]>();
      for (const l of linkRows) {
        if (!l.external_key) continue;
        const list = linksByCase.get(l.test_case_id) ?? [];
        if (!list.includes(l.external_key)) list.push(l.external_key);
        linksByCase.set(l.test_case_id, list);
      }

      // 8) Profile names (case owners ∪ run executors)
      const profileIds = [
        ...new Set(
          [
            ...(caseRows ?? []).map((c) => c.assigned_to),
            ...runRows.map((r) => r.executed_by),
          ].filter((id): id is string => !!id),
        ),
      ];
      const profileName = new Map<string, string>();
      if (profileIds.length) {
        const { data, error } = await supabase.from('profiles').select('id, full_name').in('id', profileIds);
        if (error) throw error;
        for (const p of data ?? []) {
          if (p.full_name) profileName.set(p.id, p.full_name);
        }
      }

      // 9) ph_issues summaries (requirement keys ∪ defect parent keys)
      const issueKeys = [
        ...new Set([
          ...linkRows.map((l) => l.external_key),
          ...(defectRows ?? []).map((d) => d.parent_key),
        ].filter((k): k is string => !!k)),
      ];
      let issues: ReportIssue[] = [];
      if (issueKeys.length) {
        const { data, error } = await supabase
          .from('ph_issues')
          .select('issue_key, summary')
          .in('issue_key', issueKeys);
        if (error) throw error;
        issues = (data ?? []).map((i) => ({ issueKey: i.issue_key, summary: i.summary ?? null }));
      }

      // 10) ph_issue_links enrichment (text issue keys on both sides)
      let issueLinks: ReportIssueLink[] = [];
      if (issueKeys.length) {
        const keyList = issueKeys.join(',');
        const { data, error } = await supabase
          .from('ph_issue_links')
          .select('source_id, target_id, link_type')
          .or(`source_id.in.(${keyList}),target_id.in.(${keyList})`);
        if (error) throw error;
        issueLinks = (data ?? []).map((l) => ({
          sourceId: l.source_id,
          targetId: l.target_id,
          linkType: l.link_type,
        }));
      }

      // ── assemble ReportData ──────────────────────────────────────────────
      const cases: ReportCase[] = (caseRows ?? []).map((c) => ({
        id: c.id,
        caseKey: c.case_key,
        title: c.title,
        status: c.status ?? null,
        priority: c.priority_id ? priorityName.get(c.priority_id) ?? null : null,
        type: c.case_type_id ? typeName.get(c.case_type_id) ?? null : null,
        owner: c.assigned_to ? profileName.get(c.assigned_to) ?? null : null,
        folder: c.folder_id ? folderName.get(c.folder_id) ?? null : null,
        linkedIssueKeys: linksByCase.get(c.id) ?? [],
        createdAt: c.created_at ?? null,
      }));

      const cycles: ReportCycle[] = (cycleRows ?? []).map((cy) => {
        const inCycle = scopeRows.filter((s) => s.cycle_id === cy.id);
        return {
          id: cy.id,
          name: cy.name,
          status: cy.status ?? null,
          startDate: cy.actual_start ?? cy.planned_start ?? null,
          endDate: cy.actual_end ?? cy.planned_end ?? null,
          scope: inCycle.map((s) => s.test_case_id),
          scopeStatus: Object.fromEntries(inCycle.map((s) => [s.test_case_id, s.current_status ?? null])),
        };
      });

      const runs: ReportRun[] = runRows.map((r) => {
        const scope = scopeById.get(r.cycle_scope_id);
        return {
          id: r.id,
          caseId: scope?.test_case_id ?? null,
          cycleId: scope?.cycle_id ?? null,
          status: r.status ?? null,
          executedAt: r.completed_at ?? r.started_at ?? null,
          executedBy: r.executed_by ? profileName.get(r.executed_by) ?? null : null,
        };
      });

      const defects: ReportDefect[] = (defectRows ?? []).map((d) => ({
        id: d.id,
        defectKey: d.defect_key,
        title: d.title,
        severity: d.severity ?? null,
        status: d.status ?? null,
        createdAt: d.created_at ?? null,
        linkedCaseIds: d.source_test_case_id ? [d.source_test_case_id] : [],
        parentKey: d.parent_key ?? null,
      }));

      return { cases, cycles, runs, defects, issues, issueLinks, projectName: projectName ?? null };
    },
  });
}
