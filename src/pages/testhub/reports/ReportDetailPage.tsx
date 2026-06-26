import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import Button from '@atlaskit/button/standard-button';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { supabase } from '@/integrations/supabase/client';

// ── constants ─────────────────────────────────────────────────────────────────

const REPORT_LABELS: Record<string, string> = {
  'execution-overview': 'Execution Overview',
  'execution-summary': 'Execution Summary',
  'execution-burndown': 'Execution Burndown',
  'execution-burnup': 'Execution Burnup',
  'execution-distribution': 'Execution Distribution',
  'execution-history': 'Execution History',
  'case-distribution': 'Case Distribution',
  'case-usage': 'Case Usage',
  'defect-summary': 'Defect Summary',
  'defect-impact': 'Defect Impact',
  'defect-trend': 'Defect Trend',
  'multi-cycle-comparison': 'Multi-Cycle Comparison',
  'multi-cycle-summary': 'Multi-Cycle Summary',
  'multi-cycle-detail': 'Multi-Cycle Detail',
  'multi-cycle-distribution': 'Multi-Cycle Distribution',
  'project-overview': 'Project Overview',
  'project-metrics': 'Project Metrics',
  'project-activity': 'Project Activity',
  'traceability-summary': 'Traceability Summary',
  'traceability-detail': 'Traceability Detail',
  'run-distribution': 'Run Distribution',
  'user-activity': 'User Activity',
};

type DateRange = '7d' | '30d' | '90d';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

// ── shared styles ─────────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--ds-text-subtle, #42526E)',
  textAlign: 'left',
  borderBottom: '2px solid var(--ds-border, #DFE1E6)',
  whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 14,
  color: 'var(--ds-text, #172B4D)',
  borderBottom: '1px solid var(--ds-border-subtle, #F1F2F4)',
  verticalAlign: 'middle',
};

const TD_RIGHT: React.CSSProperties = {
  ...TD,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

const CARD: React.CSSProperties = {
  background: 'var(--ds-surface, #FFFFFF)',
  border: '1px solid var(--ds-border, #DFE1E6)',
  borderRadius: 8,
  overflow: 'hidden',
};

// ── helpers ───────────────────────────────────────────────────────────────────

function dateFrom(range: DateRange): string {
  const d = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateShort(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function passRatePct(passed: number, total: number): string {
  if (total === 0) return '—';
  return `${Math.round((passed / total) * 100)}%`;
}

// ── active project hook ───────────────────────────────────────────────────────

function useActiveProject(): string | undefined {
  const { data } = useQuery({
    queryKey: ['tm-projects-first'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_projects')
        .select('id')
        .order('name', { ascending: true })
        .limit(1)
        .single();
      return data?.id as string | undefined;
    },
    staleTime: 5 * 60 * 1000,
  });
  return data;
}

// ── empty + loading states ────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)', margin: '0 0 8px' }}>
        No data available for this report.
      </p>
      <p style={{ fontSize: 14, color: 'var(--ds-text-subtle, #42526E)', margin: 0 }}>
        Run some test cycles and executions to generate report data.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
      <Spinner size="large" />
    </div>
  );
}

// ── date range picker ─────────────────────────────────────────────────────────

function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) {
  return (
    <div style={{ display: 'flex', gap: 0, border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 4, overflow: 'hidden' }}>
      {(['7d', '30d', '90d'] as DateRange[]).map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: value === opt ? 600 : 400,
            color: value === opt ? 'var(--ds-text-selected, #0052CC)' : 'var(--ds-text-subtle, #42526E)',
            background: value === opt ? 'var(--ds-background-selected, #E9F2FE)' : 'var(--ds-surface, #FFFFFF)',
            border: 'none',
            borderRight: opt !== '90d' ? '1px solid var(--ds-border, #DFE1E6)' : 'none',
            cursor: 'pointer',
          }}
        >
          {DATE_RANGE_LABELS[opt]}
        </button>
      ))}
    </div>
  );
}

// ── report-specific query hooks ───────────────────────────────────────────────

function useExecutionOverview(projectId: string | undefined, from: string) {
  return useQuery({
    queryKey: ['report-execution-overview', projectId, from],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_test_runs')
        .select('id, status, executed_at, tm_test_cycles!inner(project_id)')
        .eq('tm_test_cycles.project_id', projectId!)
        .gte('executed_at', from);
      const rows = data ?? [];
      const byStatus: Record<string, number> = {};
      for (const r of rows) {
        const s = (r as any).status ?? 'not_run';
        byStatus[s] = (byStatus[s] ?? 0) + 1;
      }
      const total = rows.length;
      const passed = byStatus['passed'] ?? 0;
      return { byStatus, total, passed };
    },
  });
}

function useExecutionSummary(projectId: string | undefined, from: string) {
  return useQuery({
    queryKey: ['report-execution-summary', projectId, from],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: cycles } = await supabase
        .from('tm_test_cycles')
        .select('id, name')
        .eq('project_id', projectId!);
      const cycleIds = (cycles ?? []).map((c: any) => c.id);
      if (cycleIds.length === 0) return [];
      const { data: runs } = await supabase
        .from('tm_test_runs')
        .select('id, status, cycle_id')
        .in('cycle_id', cycleIds)
        .gte('executed_at', from);
      const runsArr = runs ?? [];
      const cycleMap: Record<string, any> = {};
      for (const c of cycles ?? []) cycleMap[c.id] = { name: c.name, total: 0, passed: 0, failed: 0, blocked: 0, not_run: 0 };
      for (const r of runsArr) {
        const cm = cycleMap[(r as any).cycle_id];
        if (!cm) continue;
        cm.total++;
        const s = (r as any).status ?? 'not_run';
        if (cm[s] !== undefined) cm[s]++;
        else cm.not_run++;
      }
      return Object.values(cycleMap).filter((c: any) => c.total > 0);
    },
  });
}

function useExecutionBurndown(projectId: string | undefined, from: string) {
  return useQuery({
    queryKey: ['report-execution-burndown', projectId, from],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_test_runs')
        .select('executed_at, tm_test_cycles!inner(project_id)')
        .eq('tm_test_cycles.project_id', projectId!)
        .gte('executed_at', from)
        .order('executed_at', { ascending: true });
      const rows = (data ?? []).filter((r: any) => r.executed_at);
      const byDay: Record<string, number> = {};
      for (const r of rows) {
        const day = (r as any).executed_at.slice(0, 10);
        byDay[day] = (byDay[day] ?? 0) + 1;
      }
      let cumulative = 0;
      return Object.entries(byDay).sort().map(([date, count]) => {
        cumulative += count;
        return { date, dailyCount: count, cumulative };
      });
    },
  });
}

function useExecutionBurnup(projectId: string | undefined, from: string) {
  return useQuery({
    queryKey: ['report-execution-burnup', projectId, from],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_test_runs')
        .select('executed_at, status, tm_test_cycles!inner(project_id)')
        .eq('tm_test_cycles.project_id', projectId!)
        .gte('executed_at', from)
        .order('executed_at', { ascending: true });
      const rows = (data ?? []).filter((r: any) => r.executed_at);
      const byDay: Record<string, { total: number; passed: number }> = {};
      for (const r of rows) {
        const day = (r as any).executed_at.slice(0, 10);
        if (!byDay[day]) byDay[day] = { total: 0, passed: 0 };
        byDay[day].total++;
        if ((r as any).status === 'passed') byDay[day].passed++;
      }
      let cumPassed = 0;
      let cumTotal = 0;
      return Object.entries(byDay).sort().map(([date, { total, passed }]) => {
        cumPassed += passed;
        cumTotal += total;
        return { date, cumPassed, cumTotal };
      });
    },
  });
}

function useExecutionDistribution(projectId: string | undefined, from: string) {
  return useQuery({
    queryKey: ['report-execution-distribution', projectId, from],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_test_runs')
        .select('status, tm_test_cycles!inner(project_id)')
        .eq('tm_test_cycles.project_id', projectId!)
        .gte('executed_at', from);
      const rows = data ?? [];
      const byStatus: Record<string, number> = {};
      for (const r of rows) {
        const s = (r as any).status ?? 'not_run';
        byStatus[s] = (byStatus[s] ?? 0) + 1;
      }
      return Object.entries(byStatus).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
    },
  });
}

function useExecutionHistory(projectId: string | undefined, from: string) {
  return useQuery({
    queryKey: ['report-execution-history', projectId, from],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_test_runs')
        .select('id, executed_at, status, executed_by, test_case_id, cycle_id, tm_test_cycles!inner(project_id), tm_test_cases(title, case_key), profiles(full_name)')
        .eq('tm_test_cycles.project_id', projectId!)
        .gte('executed_at', from)
        .order('executed_at', { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });
}

function useCaseDistribution(projectId: string | undefined) {
  return useQuery({
    queryKey: ['report-case-distribution', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_test_cases')
        .select('status')
        .eq('project_id', projectId!);
      const rows = data ?? [];
      const byStatus: Record<string, number> = {};
      for (const r of rows) {
        const s = (r as any).status ?? 'unknown';
        byStatus[s] = (byStatus[s] ?? 0) + 1;
      }
      return Object.entries(byStatus).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
    },
  });
}

function useCaseUsage(projectId: string | undefined) {
  return useQuery({
    queryKey: ['report-case-usage', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: scopeRows } = await supabase
        .from('tm_cycle_scope')
        .select('test_case_id, tm_test_cases(title, case_key, project_id)')
        .eq('tm_test_cases.project_id', projectId!);
      const rows = scopeRows ?? [];
      const countMap: Record<string, { title: string; case_key: string; cycleCount: number }> = {};
      for (const r of rows) {
        const id = (r as any).test_case_id;
        const tc = (r as any).tm_test_cases;
        if (!tc || !id) continue;
        if (!countMap[id]) countMap[id] = { title: tc.title ?? '—', case_key: tc.case_key ?? id, cycleCount: 0 };
        countMap[id].cycleCount++;
      }
      return Object.values(countMap).sort((a, b) => b.cycleCount - a.cycleCount);
    },
  });
}

function useDefectSummary(projectId: string | undefined, from: string) {
  return useQuery({
    queryKey: ['report-defect-summary', projectId, from],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_defects')
        .select('severity, status')
        .eq('project_id', projectId!)
        .gte('created_at', from);
      const rows = data ?? [];
      const matrix: Record<string, Record<string, number>> = {};
      for (const r of rows) {
        const sev = (r as any).severity ?? 'unknown';
        const st = (r as any).status ?? 'unknown';
        if (!matrix[sev]) matrix[sev] = {};
        matrix[sev][st] = (matrix[sev][st] ?? 0) + 1;
      }
      return Object.entries(matrix).map(([severity, statuses]) => ({
        severity,
        statuses,
        total: Object.values(statuses).reduce((a, b) => a + b, 0),
      })).sort((a, b) => b.total - a.total);
    },
  });
}

function useDefectImpact(projectId: string | undefined) {
  return useQuery({
    queryKey: ['report-defect-impact', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_defects')
        .select('id, title, severity, status, defect_key, tm_defect_links(test_run_id, tm_test_runs(test_case_id, tm_test_cases(title, case_key)))')
        .eq('project_id', projectId!)
        .limit(200);
      return data ?? [];
    },
  });
}

function useDefectTrend(projectId: string | undefined, from: string) {
  return useQuery({
    queryKey: ['report-defect-trend', projectId, from],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_defects')
        .select('created_at')
        .eq('project_id', projectId!)
        .gte('created_at', from)
        .order('created_at', { ascending: true });
      const rows = data ?? [];
      const byDay: Record<string, number> = {};
      for (const r of rows) {
        const day = (r as any).created_at?.slice(0, 10);
        if (day) byDay[day] = (byDay[day] ?? 0) + 1;
      }
      return Object.entries(byDay).sort().map(([date, count]) => ({ date, count }));
    },
  });
}

function useMultiCycleComparison(projectId: string | undefined) {
  return useQuery({
    queryKey: ['report-multi-cycle-comparison', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: cycles } = await supabase
        .from('tm_test_cycles')
        .select('id, name, status, start_date, end_date')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      const cycleIds = (cycles ?? []).map((c: any) => c.id);
      if (cycleIds.length === 0) return [];
      const { data: scope } = await supabase
        .from('tm_cycle_scope')
        .select('cycle_id, execution_status')
        .in('cycle_id', cycleIds);
      const cycleMap: Record<string, any> = {};
      for (const c of cycles ?? []) cycleMap[c.id] = { ...c, total: 0, passed: 0, failed: 0, blocked: 0, not_run: 0 };
      for (const s of scope ?? []) {
        const cm = cycleMap[(s as any).cycle_id];
        if (!cm) continue;
        cm.total++;
        const st = (s as any).execution_status ?? 'not_run';
        if (cm[st] !== undefined) cm[st]++;
        else cm.not_run++;
      }
      return Object.values(cycleMap);
    },
  });
}

function useMultiCycleDetail(projectId: string | undefined) {
  return useQuery({
    queryKey: ['report-multi-cycle-detail', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: cycles } = await supabase
        .from('tm_test_cycles')
        .select('id, name')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      const cycleIds = (cycles ?? []).map((c: any) => c.id);
      if (cycleIds.length === 0) return { cycles: [], rows: [] };
      const { data: scope } = await supabase
        .from('tm_cycle_scope')
        .select('cycle_id, test_case_id, execution_status, tm_test_cases(title, case_key)')
        .in('cycle_id', cycleIds)
        .limit(500);
      return { cycles: cycles ?? [], rows: scope ?? [] };
    },
  });
}

function useMultiCycleDistribution(projectId: string | undefined) {
  return useQuery({
    queryKey: ['report-multi-cycle-distribution', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: cycles } = await supabase
        .from('tm_test_cycles')
        .select('id, name')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      const cycleIds = (cycles ?? []).map((c: any) => c.id);
      if (cycleIds.length === 0) return { cycles: [], statuses: [], matrix: {} };
      const { data: scope } = await supabase
        .from('tm_cycle_scope')
        .select('cycle_id, execution_status')
        .in('cycle_id', cycleIds);
      const matrix: Record<string, Record<string, number>> = {};
      const statusSet = new Set<string>();
      for (const s of scope ?? []) {
        const cid = (s as any).cycle_id;
        const st = (s as any).execution_status ?? 'not_run';
        statusSet.add(st);
        if (!matrix[st]) matrix[st] = {};
        matrix[st][cid] = (matrix[st][cid] ?? 0) + 1;
      }
      return { cycles: cycles ?? [], statuses: Array.from(statusSet), matrix };
    },
  });
}

function useProjectOverview(projectId: string | undefined) {
  return useQuery({
    queryKey: ['report-project-overview', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const [casesRes, cyclesRes, activeCyclesRes, runsRes] = await Promise.all([
        supabase.from('tm_test_cases').select('id', { count: 'exact', head: true }).eq('project_id', projectId!),
        supabase.from('tm_test_cycles').select('id', { count: 'exact', head: true }).eq('project_id', projectId!),
        supabase.from('tm_test_cycles').select('id', { count: 'exact', head: true }).eq('project_id', projectId!).in('status', ['active', 'in_progress']),
        supabase.from('tm_test_runs').select('id, status, tm_test_cycles!inner(project_id)').eq('tm_test_cycles.project_id', projectId!),
      ]);
      const runs = runsRes.data ?? [];
      const total = runs.length;
      const passed = runs.filter((r: any) => r.status === 'passed').length;
      return {
        totalCases: casesRes.count ?? 0,
        totalCycles: cyclesRes.count ?? 0,
        activeCycles: activeCyclesRes.count ?? 0,
        totalRuns: total,
        passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      };
    },
  });
}

function useProjectMetrics(projectId: string | undefined, from: string) {
  return useQuery({
    queryKey: ['report-project-metrics', projectId, from],
    enabled: !!projectId,
    queryFn: async () => {
      const [runsRes, defectsRes, cyclesRes] = await Promise.all([
        supabase.from('tm_test_runs').select('executed_at, status, tm_test_cycles!inner(project_id)').eq('tm_test_cycles.project_id', projectId!).gte('executed_at', from),
        supabase.from('tm_defects').select('id', { count: 'exact', head: true }).eq('project_id', projectId!).gte('created_at', from),
        supabase.from('tm_test_cycles').select('start_date, end_date').eq('project_id', projectId!).gte('start_date', from),
      ]);
      const runs = runsRes.data ?? [];
      const totalRuns = runs.length;
      const passed = runs.filter((r: any) => r.status === 'passed').length;
      const defectCount = defectsRes.count ?? 0;
      // velocity = runs per day over range
      const rangeDays = from ? Math.max(1, Math.round((Date.now() - new Date(from).getTime()) / 86400000)) : 30;
      const velocity = (totalRuns / rangeDays).toFixed(2);
      const defectRate = totalRuns > 0 ? ((defectCount / totalRuns) * 100).toFixed(1) : '0';
      const passRate = totalRuns > 0 ? Math.round((passed / totalRuns) * 100) : 0;
      return [
        { metric: 'Total Runs', value: totalRuns },
        { metric: 'Passed Runs', value: passed },
        { metric: 'Pass Rate', value: `${passRate}%` },
        { metric: 'Velocity (runs/day)', value: velocity },
        { metric: 'Total Defects', value: defectCount },
        { metric: 'Defect Rate', value: `${defectRate}%` },
      ];
    },
  });
}

function useProjectActivity(projectId: string | undefined, from: string) {
  return useQuery({
    queryKey: ['report-project-activity', projectId, from],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_test_runs')
        .select('id, executed_at, status, executed_by, test_case_id, tm_test_cycles!inner(project_id, name), tm_test_cases(case_key), profiles(full_name)')
        .eq('tm_test_cycles.project_id', projectId!)
        .gte('executed_at', from)
        .order('executed_at', { ascending: false })
        .limit(200);
      return (data ?? []).map((r: any) => ({
        date: r.executed_at,
        action: `Run ${r.status ?? 'executed'}`,
        user: r.profiles?.full_name ?? r.executed_by ?? '—',
        entity: r.tm_test_cases?.case_key ?? r.test_case_id ?? '—',
        cycle: r.tm_test_cycles?.name ?? '—',
      }));
    },
  });
}

function useTraceabilitySummary(projectId: string | undefined) {
  return useQuery({
    queryKey: ['report-traceability-summary', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: cases } = await supabase
        .from('tm_test_cases')
        .select('id, title, case_key, status, linked_work_item_id')
        .eq('project_id', projectId!)
        .not('linked_work_item_id', 'is', null);
      const caseRows = cases ?? [];
      const issueIds = [...new Set(caseRows.map((c: any) => c.linked_work_item_id).filter(Boolean))];
      let issueMap: Record<string, { issue_key: string; summary: string }> = {};
      if (issueIds.length > 0) {
        const { data: issues } = await supabase
          .from('ph_issues')
          .select('id, issue_key, summary')
          .in('id', issueIds);
        for (const i of issues ?? []) issueMap[i.id] = { issue_key: i.issue_key, summary: i.summary ?? '—' };
      }
      const grouped: Record<string, { issue_key: string; summary: string; caseCount: number }> = {};
      for (const c of caseRows) {
        const lid = (c as any).linked_work_item_id;
        if (!lid) continue;
        const iss = issueMap[lid];
        if (!iss) continue;
        if (!grouped[lid]) grouped[lid] = { ...iss, caseCount: 0 };
        grouped[lid].caseCount++;
      }
      return Object.values(grouped).sort((a, b) => b.caseCount - a.caseCount);
    },
  });
}

function useTraceabilityDetail(projectId: string | undefined) {
  return useQuery({
    queryKey: ['report-traceability-detail', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: cases } = await supabase
        .from('tm_test_cases')
        .select('id, title, case_key, status, linked_work_item_id')
        .eq('project_id', projectId!)
        .not('linked_work_item_id', 'is', null)
        .order('linked_work_item_id', { ascending: true });
      const caseRows = cases ?? [];
      const issueIds = [...new Set(caseRows.map((c: any) => c.linked_work_item_id).filter(Boolean))];
      let issueMap: Record<string, { issue_key: string; summary: string }> = {};
      if (issueIds.length > 0) {
        const { data: issues } = await supabase
          .from('ph_issues')
          .select('id, issue_key, summary')
          .in('id', issueIds);
        for (const i of issues ?? []) issueMap[i.id] = { issue_key: i.issue_key, summary: i.summary ?? '—' };
      }
      // Latest run per case
      const caseIds = caseRows.map((c: any) => c.id);
      let runMap: Record<string, string> = {};
      if (caseIds.length > 0) {
        const { data: runs } = await supabase
          .from('tm_test_runs')
          .select('test_case_id, status, executed_at')
          .in('test_case_id', caseIds)
          .order('executed_at', { ascending: false });
        for (const r of runs ?? []) {
          if (!runMap[(r as any).test_case_id]) runMap[(r as any).test_case_id] = (r as any).status ?? '—';
        }
      }
      return caseRows.map((c: any) => ({
        caseKey: c.case_key ?? c.id,
        caseTitle: c.title ?? '—',
        caseStatus: c.status ?? '—',
        lastRunStatus: runMap[c.id] ?? 'not run',
        issue: issueMap[c.linked_work_item_id] ?? null,
      }));
    },
  });
}

function useRunDistribution(projectId: string | undefined, from: string) {
  return useQuery({
    queryKey: ['report-run-distribution', projectId, from],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_test_runs')
        .select('status, executed_by, profiles(full_name), tm_test_cycles!inner(project_id)')
        .eq('tm_test_cycles.project_id', projectId!)
        .gte('executed_at', from);
      const rows = data ?? [];
      const byUser: Record<string, { name: string; total: number; passed: number; failed: number }> = {};
      for (const r of rows) {
        const uid = (r as any).executed_by ?? 'unknown';
        const name = (r as any).profiles?.full_name ?? uid;
        if (!byUser[uid]) byUser[uid] = { name, total: 0, passed: 0, failed: 0 };
        byUser[uid].total++;
        const s = (r as any).status ?? '';
        if (s === 'passed') byUser[uid].passed++;
        if (s === 'failed') byUser[uid].failed++;
      }
      return Object.values(byUser).sort((a, b) => b.total - a.total);
    },
  });
}

function useUserActivity(projectId: string | undefined, from: string) {
  return useQuery({
    queryKey: ['report-user-activity', projectId, from],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_test_runs')
        .select('status, executed_by, profiles(full_name), tm_test_cycles!inner(project_id)')
        .eq('tm_test_cycles.project_id', projectId!)
        .gte('executed_at', from);
      const rows = data ?? [];
      const byUser: Record<string, { name: string; total: number; passed: number }> = {};
      for (const r of rows) {
        const uid = (r as any).executed_by ?? 'unknown';
        const name = (r as any).profiles?.full_name ?? uid;
        if (!byUser[uid]) byUser[uid] = { name, total: 0, passed: 0 };
        byUser[uid].total++;
        if ((r as any).status === 'passed') byUser[uid].passed++;
      }
      return Object.values(byUser).sort((a, b) => b.total - a.total);
    },
  });
}

// ── report body components ────────────────────────────────────────────────────

function ReportTable({ headers, rows, emptyMessage }: {
  headers: { label: string; align?: 'left' | 'right' }[];
  rows: React.ReactNode[][];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState />;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ ...TH, textAlign: h.align ?? 'left' }}>{h.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={headers[ci]?.align === 'right' ? TD_RIGHT : TD}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    passed: 'var(--ds-text-success, #006644)',
    failed: 'var(--ds-text-danger, #AE2A19)',
    blocked: 'var(--ds-text-warning, #974F0C)',
    not_run: 'var(--ds-text-subtlest, #6B778C)',
    skipped: 'var(--ds-text-subtlest, #6B778C)',
    in_progress: 'var(--ds-link, #0052CC)',
  };
  const bgMap: Record<string, string> = {
    passed: 'var(--ds-background-success, #E3FCEF)',
    failed: 'var(--ds-background-danger, #FFEBE6)',
    blocked: 'var(--ds-background-warning, #FFFAE6)',
    not_run: 'var(--ds-background-neutral, #F1F2F4)',
    skipped: 'var(--ds-background-neutral, #F1F2F4)',
    in_progress: 'var(--ds-background-information, #DEEBFF)',
  };
  const label = status.replace(/_/g, ' ');
  const color = colorMap[status] ?? 'var(--ds-text-subtle, #42526E)';
  const bg = bgMap[status] ?? 'var(--ds-background-neutral, #F1F2F4)';
  return (
    <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 3, background: bg, color }}>
      {label}
    </span>
  );
}

// ── individual report renderers ───────────────────────────────────────────────

function ExecutionOverviewReport({ projectId, from }: { projectId: string; from: string }) {
  const { data, isLoading } = useExecutionOverview(projectId, from);
  if (isLoading) return <LoadingState />;
  if (!data || data.total === 0) return <EmptyState />;
  const { byStatus, total, passed } = data;
  const rows = Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => [
    <StatusBadge key={status} status={status} />,
    count,
    total > 0 ? `${Math.round((count / total) * 100)}%` : '—',
  ]);
  rows.push([<strong key="total">Total</strong>, total, `${Math.round((passed / total) * 100)}% pass`]);
  return (
    <ReportTable
      headers={[{ label: 'Status' }, { label: 'Count', align: 'right' }, { label: 'Share', align: 'right' }]}
      rows={rows}
    />
  );
}

function ExecutionSummaryReport({ projectId, from }: { projectId: string; from: string }) {
  const { data, isLoading } = useExecutionSummary(projectId, from);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const rows = (data as any[]).map(c => [
    c.name,
    c.total,
    c.passed,
    c.failed,
    c.blocked ?? 0,
    passRatePct(c.passed, c.total),
  ]);
  return (
    <ReportTable
      headers={[
        { label: 'Cycle' },
        { label: 'Total', align: 'right' },
        { label: 'Passed', align: 'right' },
        { label: 'Failed', align: 'right' },
        { label: 'Blocked', align: 'right' },
        { label: 'Pass Rate', align: 'right' },
      ]}
      rows={rows}
    />
  );
}

function ExecutionBurndownReport({ projectId, from }: { projectId: string; from: string }) {
  const { data, isLoading } = useExecutionBurndown(projectId, from);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const rows = (data as any[]).map(d => [formatDateShort(d.date), d.dailyCount, d.cumulative]);
  return (
    <ReportTable
      headers={[
        { label: 'Date' },
        { label: 'Runs Executed', align: 'right' },
        { label: 'Cumulative', align: 'right' },
      ]}
      rows={rows}
    />
  );
}

function ExecutionBurnupReport({ projectId, from }: { projectId: string; from: string }) {
  const { data, isLoading } = useExecutionBurnup(projectId, from);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const rows = (data as any[]).map(d => [
    formatDateShort(d.date),
    d.cumPassed,
    d.cumTotal,
    d.cumTotal > 0 ? `${Math.round((d.cumPassed / d.cumTotal) * 100)}%` : '—',
  ]);
  return (
    <ReportTable
      headers={[
        { label: 'Date' },
        { label: 'Cumulative Passed', align: 'right' },
        { label: 'Cumulative Total', align: 'right' },
        { label: 'Pass Rate', align: 'right' },
      ]}
      rows={rows}
    />
  );
}

function ExecutionDistributionReport({ projectId, from }: { projectId: string; from: string }) {
  const { data, isLoading } = useExecutionDistribution(projectId, from);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const total = (data as any[]).reduce((s, r) => s + r.count, 0);
  const rows = (data as any[]).map(r => [
    <StatusBadge key={r.status} status={r.status} />,
    r.count,
    total > 0 ? `${Math.round((r.count / total) * 100)}%` : '—',
  ]);
  return (
    <ReportTable
      headers={[{ label: 'Status' }, { label: 'Count', align: 'right' }, { label: 'Share', align: 'right' }]}
      rows={rows}
    />
  );
}

function ExecutionHistoryReport({ projectId, from }: { projectId: string; from: string }) {
  const { data, isLoading } = useExecutionHistory(projectId, from);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const rows = (data as any[]).map(r => [
    formatDate(r.executed_at),
    (r as any).tm_test_cases?.case_key ?? r.test_case_id ?? '—',
    (r as any).tm_test_cases?.title ?? '—',
    (r as any).profiles?.full_name ?? r.executed_by ?? '—',
    <StatusBadge key={r.id} status={r.status ?? 'not_run'} />,
  ]);
  return (
    <ReportTable
      headers={[
        { label: 'Date' },
        { label: 'Case Key' },
        { label: 'Case Title' },
        { label: 'Executor' },
        { label: 'Result' },
      ]}
      rows={rows}
    />
  );
}

function CaseDistributionReport({ projectId }: { projectId: string }) {
  const { data, isLoading } = useCaseDistribution(projectId);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const total = (data as any[]).reduce((s, r) => s + r.count, 0);
  const rows = (data as any[]).map(r => [
    r.status,
    r.count,
    total > 0 ? `${Math.round((r.count / total) * 100)}%` : '—',
  ]);
  return (
    <ReportTable
      headers={[{ label: 'Status' }, { label: 'Count', align: 'right' }, { label: 'Share', align: 'right' }]}
      rows={rows}
    />
  );
}

function CaseUsageReport({ projectId }: { projectId: string }) {
  const { data, isLoading } = useCaseUsage(projectId);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const rows = (data as any[]).map(r => [r.case_key, r.title, r.cycleCount]);
  return (
    <ReportTable
      headers={[{ label: 'Case Key' }, { label: 'Title' }, { label: 'Cycles Used In', align: 'right' }]}
      rows={rows}
    />
  );
}

function DefectSummaryReport({ projectId, from }: { projectId: string; from: string }) {
  const { data, isLoading } = useDefectSummary(projectId, from);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const rows = (data as any[]).map(r => [
    r.severity,
    r.total,
    Object.entries(r.statuses).map(([s, c]: [string, any]) => `${s}: ${c}`).join(', '),
  ]);
  return (
    <ReportTable
      headers={[{ label: 'Severity' }, { label: 'Total', align: 'right' }, { label: 'By Status' }]}
      rows={rows}
    />
  );
}

function DefectImpactReport({ projectId }: { projectId: string }) {
  const { data, isLoading } = useDefectImpact(projectId);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const rows = (data as any[]).flatMap((d: any) => {
    const links = d.tm_defect_links ?? [];
    if (links.length === 0) {
      return [[d.defect_key ?? d.id, d.severity ?? '—', d.title ?? '—', '—']];
    }
    return links.map((l: any) => {
      const tc = l.tm_test_runs?.tm_test_cases;
      return [d.defect_key ?? d.id, d.severity ?? '—', d.title ?? '—', tc?.case_key ?? tc?.title ?? '—'];
    });
  });
  return (
    <ReportTable
      headers={[{ label: 'Defect Key' }, { label: 'Severity' }, { label: 'Defect Title' }, { label: 'Linked Test Case' }]}
      rows={rows}
    />
  );
}

function DefectTrendReport({ projectId, from }: { projectId: string; from: string }) {
  const { data, isLoading } = useDefectTrend(projectId, from);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const rows = (data as any[]).map(r => [formatDateShort(r.date), r.count]);
  return (
    <ReportTable
      headers={[{ label: 'Date' }, { label: 'Defects Created', align: 'right' }]}
      rows={rows}
    />
  );
}

function MultiCycleComparisonReport({ projectId }: { projectId: string }) {
  const { data, isLoading } = useMultiCycleComparison(projectId);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const rows = (data as any[]).map(c => [
    c.name,
    c.total,
    c.passed ?? 0,
    c.failed ?? 0,
    c.blocked ?? 0,
    passRatePct(c.passed ?? 0, c.total),
  ]);
  return (
    <ReportTable
      headers={[
        { label: 'Cycle' },
        { label: 'Total', align: 'right' },
        { label: 'Passed', align: 'right' },
        { label: 'Failed', align: 'right' },
        { label: 'Blocked', align: 'right' },
        { label: 'Pass Rate', align: 'right' },
      ]}
      rows={rows}
    />
  );
}

function MultiCycleSummaryReport({ projectId }: { projectId: string }) {
  // Same data as comparison but condensed
  const { data, isLoading } = useMultiCycleComparison(projectId);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const rows = (data as any[]).map(c => [
    c.name,
    c.status ?? '—',
    c.total,
    passRatePct(c.passed ?? 0, c.total),
    formatDate(c.start_date),
    formatDate(c.end_date),
  ]);
  return (
    <ReportTable
      headers={[
        { label: 'Cycle' },
        { label: 'Status' },
        { label: 'Total Cases', align: 'right' },
        { label: 'Pass Rate', align: 'right' },
        { label: 'Start Date' },
        { label: 'End Date' },
      ]}
      rows={rows}
    />
  );
}

function MultiCycleDetailReport({ projectId }: { projectId: string }) {
  const { data, isLoading } = useMultiCycleDetail(projectId);
  if (isLoading) return <LoadingState />;
  const { cycles, rows: scopeRows } = (data ?? { cycles: [], rows: [] }) as any;
  if (!scopeRows || scopeRows.length === 0) return <EmptyState />;
  const tableRows = scopeRows.slice(0, 500).map((s: any) => {
    const cycle = cycles.find((c: any) => c.id === s.cycle_id);
    const tc = s.tm_test_cases;
    return [
      cycle?.name ?? s.cycle_id,
      tc?.case_key ?? s.test_case_id,
      tc?.title ?? '—',
      <StatusBadge key={s.cycle_id + s.test_case_id} status={s.execution_status ?? 'not_run'} />,
    ];
  });
  return (
    <ReportTable
      headers={[{ label: 'Cycle' }, { label: 'Case Key' }, { label: 'Case Title' }, { label: 'Status' }]}
      rows={tableRows}
    />
  );
}

function MultiCycleDistributionReport({ projectId }: { projectId: string }) {
  const { data, isLoading } = useMultiCycleDistribution(projectId);
  if (isLoading) return <LoadingState />;
  const { cycles, statuses, matrix } = (data ?? { cycles: [], statuses: [], matrix: {} }) as any;
  if (!cycles || cycles.length === 0) return <EmptyState />;
  // Pivot: rows = statuses, cols = cycles
  const rows = statuses.map((s: string) => {
    const cells: React.ReactNode[] = [<StatusBadge key={s} status={s} />];
    for (const c of cycles) {
      cells.push(matrix[s]?.[c.id] ?? 0);
    }
    return cells;
  });
  return (
    <ReportTable
      headers={[
        { label: 'Status' },
        ...cycles.map((c: any) => ({ label: c.name, align: 'right' as const })),
      ]}
      rows={rows}
    />
  );
}

function ProjectOverviewReport({ projectId }: { projectId: string }) {
  const { data, isLoading } = useProjectOverview(projectId);
  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState />;
  const rows = [
    ['Total Test Cases', data.totalCases],
    ['Total Cycles', data.totalCycles],
    ['Active Cycles', data.activeCycles],
    ['Total Runs', data.totalRuns],
    ['Overall Pass Rate', `${data.passRate}%`],
  ];
  return (
    <ReportTable
      headers={[{ label: 'Metric' }, { label: 'Value', align: 'right' }]}
      rows={rows}
    />
  );
}

function ProjectMetricsReport({ projectId, from }: { projectId: string; from: string }) {
  const { data, isLoading } = useProjectMetrics(projectId, from);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const rows = (data as any[]).map(r => [r.metric, r.value]);
  return (
    <ReportTable
      headers={[{ label: 'Metric' }, { label: 'Value', align: 'right' }]}
      rows={rows}
    />
  );
}

function ProjectActivityReport({ projectId, from }: { projectId: string; from: string }) {
  const { data, isLoading } = useProjectActivity(projectId, from);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const rows = (data as any[]).map(r => [
    formatDate(r.date),
    r.action,
    r.user,
    r.entity,
    r.cycle,
  ]);
  return (
    <ReportTable
      headers={[{ label: 'Date' }, { label: 'Action' }, { label: 'User' }, { label: 'Entity' }, { label: 'Cycle' }]}
      rows={rows}
    />
  );
}

function TraceabilitySummaryReport({ projectId }: { projectId: string }) {
  const { data, isLoading } = useTraceabilitySummary(projectId);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const rows = (data as any[]).map(r => [r.issue_key, r.summary, r.caseCount]);
  return (
    <ReportTable
      headers={[{ label: 'Jira Issue Key' }, { label: 'Issue Summary' }, { label: 'Linked Test Cases', align: 'right' }]}
      rows={rows}
    />
  );
}

function TraceabilityDetailReport({ projectId }: { projectId: string }) {
  const { data, isLoading } = useTraceabilityDetail(projectId);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const rows = (data as any[]).map(r => [
    r.issue?.issue_key ?? '—',
    r.issue?.summary ?? '—',
    r.caseKey,
    r.caseTitle,
    <StatusBadge key={r.caseKey} status={r.lastRunStatus} />,
  ]);
  return (
    <ReportTable
      headers={[
        { label: 'Jira Issue Key' },
        { label: 'Issue Summary' },
        { label: 'Case Key' },
        { label: 'Case Title' },
        { label: 'Last Run Status' },
      ]}
      rows={rows}
    />
  );
}

function RunDistributionReport({ projectId, from }: { projectId: string; from: string }) {
  const { data, isLoading } = useRunDistribution(projectId, from);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const rows = (data as any[]).map(r => [
    r.name,
    r.total,
    r.passed,
    r.failed,
    passRatePct(r.passed, r.total),
  ]);
  return (
    <ReportTable
      headers={[
        { label: 'User' },
        { label: 'Total Runs', align: 'right' },
        { label: 'Passed', align: 'right' },
        { label: 'Failed', align: 'right' },
        { label: 'Pass Rate', align: 'right' },
      ]}
      rows={rows}
    />
  );
}

function UserActivityReport({ projectId, from }: { projectId: string; from: string }) {
  const { data, isLoading } = useUserActivity(projectId, from);
  if (isLoading) return <LoadingState />;
  if (!data || (data as any[]).length === 0) return <EmptyState />;
  const rows = (data as any[]).map(r => [
    r.name,
    r.total,
    passRatePct(r.passed, r.total),
  ]);
  return (
    <ReportTable
      headers={[{ label: 'User' }, { label: 'Runs Executed', align: 'right' }, { label: 'Pass Rate', align: 'right' }]}
      rows={rows}
    />
  );
}

// ── report router ─────────────────────────────────────────────────────────────

function ReportBody({ type, projectId, from, dateRange }: {
  type: string;
  projectId: string;
  from: string;
  dateRange: DateRange;
}) {
  // Types that don't use date range
  const noDateRange = ['case-distribution', 'case-usage', 'defect-impact', 'multi-cycle-comparison', 'multi-cycle-summary', 'multi-cycle-detail', 'multi-cycle-distribution', 'project-overview', 'traceability-summary', 'traceability-detail'];

  switch (type) {
    case 'execution-overview': return <ExecutionOverviewReport projectId={projectId} from={from} />;
    case 'execution-summary': return <ExecutionSummaryReport projectId={projectId} from={from} />;
    case 'execution-burndown': return <ExecutionBurndownReport projectId={projectId} from={from} />;
    case 'execution-burnup': return <ExecutionBurnupReport projectId={projectId} from={from} />;
    case 'execution-distribution': return <ExecutionDistributionReport projectId={projectId} from={from} />;
    case 'execution-history': return <ExecutionHistoryReport projectId={projectId} from={from} />;
    case 'case-distribution': return <CaseDistributionReport projectId={projectId} />;
    case 'case-usage': return <CaseUsageReport projectId={projectId} />;
    case 'defect-summary': return <DefectSummaryReport projectId={projectId} from={from} />;
    case 'defect-impact': return <DefectImpactReport projectId={projectId} />;
    case 'defect-trend': return <DefectTrendReport projectId={projectId} from={from} />;
    case 'multi-cycle-comparison': return <MultiCycleComparisonReport projectId={projectId} />;
    case 'multi-cycle-summary': return <MultiCycleSummaryReport projectId={projectId} />;
    case 'multi-cycle-detail': return <MultiCycleDetailReport projectId={projectId} />;
    case 'multi-cycle-distribution': return <MultiCycleDistributionReport projectId={projectId} />;
    case 'project-overview': return <ProjectOverviewReport projectId={projectId} />;
    case 'project-metrics': return <ProjectMetricsReport projectId={projectId} from={from} />;
    case 'project-activity': return <ProjectActivityReport projectId={projectId} from={from} />;
    case 'traceability-summary': return <TraceabilitySummaryReport projectId={projectId} />;
    case 'traceability-detail': return <TraceabilityDetailReport projectId={projectId} />;
    case 'run-distribution': return <RunDistributionReport projectId={projectId} from={from} />;
    case 'user-activity': return <UserActivityReport projectId={projectId} from={from} />;
    default:
      return (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ds-text-subtle, #42526E)' }}>
          Unknown report type: {type}
        </div>
      );
  }
}

// ── save report mutation ──────────────────────────────────────────────────────

function useSaveReport(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, type, filters }: { name: string; type: string; filters: Record<string, string> }) => {
      const { error } = await supabase
        .from('tm_saved_reports')
        .insert({ name, type, filters, project_id: projectId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-saved-reports'] });
    },
  });
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function ReportDetailPage() {
  const { type = '', projectKey = 'BAU' } = useParams<{ type: string; projectKey: string }>();
  const navigate = useNavigate();
  const projectId = useActiveProject();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [saving, setSaving] = useState(false);
  const saveReport = useSaveReport(projectId);

  const reportLabel = REPORT_LABELS[type] ?? type;
  const from = dateFrom(dateRange);

  // Types that don't use date range
  const noDateRange = ['case-distribution', 'case-usage', 'defect-impact', 'multi-cycle-comparison', 'multi-cycle-summary', 'multi-cycle-detail', 'multi-cycle-distribution', 'project-overview', 'traceability-summary', 'traceability-detail'];
  const showDateRange = !noDateRange.includes(type);

  const handleSave = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      await saveReport.mutateAsync({
        name: reportLabel,
        type,
        filters: showDateRange ? { dateRange } : {},
      });
    } finally {
      setSaving(false);
    }
  };

  const actions = (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {showDateRange && (
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      )}
      <Button
        appearance="primary"
        onClick={handleSave}
        isDisabled={!projectId || saving}
      >
        {saving ? 'Saving…' : 'Save report'}
      </Button>
    </div>
  );

  return (
    <div
      style={{
        fontFamily: 'var(--ds-font-family-body)',
        minHeight: '100vh',
        background: 'var(--ds-surface-sunken, #F7F8F9)',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 16,
      }}
    >
      <ProjectPageHeader
        hubType="test"
        title={reportLabel}
        trail={[
          { text: 'Reports', href: '/testhub/reports' },
          { text: reportLabel },
        ]}
        actions={actions}
      />

      <div style={{ flex: 1, padding: '24px 24px 48px', maxWidth: 1200, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {!projectId ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <Spinner size="large" />
          </div>
        ) : (
          <div style={CARD}>
            <ReportBody type={type} projectId={projectId} from={from} dateRange={dateRange} />
          </div>
        )}
      </div>
    </div>
  );
}
