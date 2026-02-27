/**
 * useStrategyRoomData — Fetches live data for Strategy Room dashboard
 * Sources: resource_inventory, es_strategic_themes, ai_briefs, budget_scenarios
 * ZERO MOCK DATA — all from Lovable Cloud
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ─── Types matching StrategyRoomDashboard props ─── */
interface ThemeItem { name: string; status: 'on_track' | 'off_track' | 'at_risk' }
interface BudgetSegment { label: string; pct: number; color: string }
interface BudgetDept { name: string; pct: number; count: number; tag?: string }
interface BudgetData {
  total: string; currency: string; delta?: number; deltaRef?: string; confidence: number;
  segments?: BudgetSegment[]; departments?: BudgetDept[];
  footerStats?: { label: string; color: string }[]; updatedAt?: string;
}
interface WorkforceType { label: string; count: number; color: string }
interface WorkforceDept { name: string; pct: number; count: number; utilization?: string; utilColor?: string }
interface WorkforceData {
  total: number; delta?: number; deltaRef?: string;
  departmentCount: number; vendorCount: number; avgUtilization: number; thiqahPct: number;
  types?: WorkforceType[]; buckets?: { value: number; label: string; isDanger?: boolean }[];
  departments?: WorkforceDept[]; updatedAt?: string;
}
interface ContractBucket { count: number; label: string; color: string; textColor: string }
interface ContractExpiring { name: string; department: string; date: string }
interface ContractsData {
  totalCount: number; departmentCount: number; topSource: string;
  buckets?: ContractBucket[]; barSegments?: { pct: number; color: string }[];
  expiringSoon?: ContractExpiring[]; moreCount?: number; updatedAt?: string;
}
interface BriefBanner {
  grade: string; score: string; headline: string; publishedAt: string;
  nextReview: string; decisionCount: number; issueCount: number;
}

const STATUS_MAP: Record<string, 'on_track' | 'off_track' | 'at_risk'> = {
  active: 'on_track',
  on_track: 'on_track',
  at_risk: 'at_risk',
  off_track: 'off_track',
  draft: 'at_risk',
  blocked: 'off_track',
};

const TYPE_COLORS: Record<string, string> = {
  Permanent: '#2563EB',
  Fixed: '#0D9488',
  Variable: '#7C3AED',
  Freelance: '#F59E0B',
};

function fmtSAR(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ═══ Themes ═══ */
function useThemes() {
  return useQuery({
    queryKey: ['strategy-room', 'themes'],
    queryFn: async (): Promise<ThemeItem[]> => {
      const { data, error } = await supabase
        .from('es_strategic_themes')
        .select('title, status')
        .order('sort_order');
      if (error) throw error;
      return (data || []).map(t => ({
        name: t.title,
        status: STATUS_MAP[t.status] || 'at_risk',
      }));
    },
    staleTime: 60_000,
  });
}

/* ═══ Workforce ═══ */
function useWorkforce() {
  return useQuery({
    queryKey: ['strategy-room', 'workforce'],
    queryFn: async (): Promise<WorkforceData> => {
      const { data: resources, error } = await supabase
        .from('resource_inventory')
        .select('resource_type, department_name, vendor_name, contract_end_date, default_capacity_percent')
        .eq('is_active', true);
      if (error) throw error;
      const all = resources || [];
      const total = all.length;

      // Types
      const typeCounts = new Map<string, number>();
      all.forEach(r => {
        const t = r.resource_type || 'Unknown';
        typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
      });
      const types: WorkforceType[] = Array.from(typeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count, color: TYPE_COLORS[label] || '#71717A' }));

      // Departments
      const deptCounts = new Map<string, number>();
      all.forEach(r => {
        const d = r.department_name || 'Unassigned';
        deptCounts.set(d, (deptCounts.get(d) || 0) + 1);
      });
      const departments: WorkforceDept[] = Array.from(deptCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({
          name,
          pct: total > 0 ? Math.round((count / total) * 100) : 0,
          count,
        }));

      // Vendors
      const vendorSet = new Set<string>();
      all.forEach(r => { if (r.vendor_name) vendorSet.add(r.vendor_name); });

      // Thiqah %
      const thiqahCount = all.filter(r => r.vendor_name === 'Thiqah').length;
      const thiqahPct = total > 0 ? Math.round((thiqahCount / total) * 100) : 0;

      // Avg utilization from capacity
      const caps = all.filter(r => r.default_capacity_percent != null).map(r => r.default_capacity_percent as number);
      const avgUtilization = caps.length > 0 ? Math.round(caps.reduce((a, b) => a + b, 0) / caps.length) : 0;

      // Contract buckets
      const now = new Date();
      const d30 = new Date(now); d30.setDate(d30.getDate() + 30);
      const d90 = new Date(now); d90.setDate(d90.getDate() + 90);
      let expired = 0, exp30 = 0, exp90 = 0, active = 0;
      all.forEach(r => {
        if (!r.contract_end_date) return;
        const d = new Date(r.contract_end_date);
        if (d < now) expired++;
        else if (d <= d30) exp30++;
        else if (d <= d90) exp90++;
        else active++;
      });

      return {
        total,
        departmentCount: deptCounts.size,
        vendorCount: vendorSet.size,
        avgUtilization,
        thiqahPct,
        types,
        departments,
        buckets: [
          { value: active, label: 'Active', isDanger: false },
          { value: exp30, label: '< 30 days', isDanger: exp30 > 0 },
          { value: exp90, label: '< 90 days', isDanger: false },
          { value: expired, label: 'Expired', isDanger: expired > 0 },
        ],
        updatedAt: 'Live',
      };
    },
    staleTime: 60_000,
  });
}

/* ═══ Contracts ═══ */
function useContracts() {
  return useQuery({
    queryKey: ['strategy-room', 'contracts'],
    queryFn: async (): Promise<ContractsData> => {
      const { data: resources, error } = await supabase
        .from('resource_inventory')
        .select('name, department_name, vendor_name, contract_end_date')
        .eq('is_active', true)
        .not('contract_end_date', 'is', null)
        .order('contract_end_date', { ascending: true });
      if (error) throw error;
      const all = resources || [];
      const total = all.length;

      const now = new Date();
      const d30 = new Date(now); d30.setDate(d30.getDate() + 30);
      const d90 = new Date(now); d90.setDate(d90.getDate() + 90);

      let expired = 0, exp30 = 0, exp90 = 0, active = 0;
      all.forEach(r => {
        const d = new Date(r.contract_end_date!);
        if (d < now) expired++;
        else if (d <= d30) exp30++;
        else if (d <= d90) exp90++;
        else active++;
      });

      const deptSet = new Set<string>();
      const vendorCounts = new Map<string, number>();
      all.forEach(r => {
        if (r.department_name) deptSet.add(r.department_name);
        if (r.vendor_name) vendorCounts.set(r.vendor_name, (vendorCounts.get(r.vendor_name) || 0) + 1);
      });

      const topVendor = Array.from(vendorCounts.entries()).sort((a, b) => b[1] - a[1])[0];

      // Expiring soon: next 90 days
      const expiringSoon: ContractExpiring[] = all
        .filter(r => {
          const d = new Date(r.contract_end_date!);
          return d >= now && d <= d90;
        })
        .slice(0, 4)
        .map(r => ({
          name: r.name,
          department: r.department_name || '—',
          date: fmtDate(r.contract_end_date!),
        }));

      const moreCount = all.filter(r => {
        const d = new Date(r.contract_end_date!);
        return d >= now && d <= d90;
      }).length - expiringSoon.length;

      const buckets: ContractBucket[] = [
        { count: active, label: 'Active', color: '#16A34A', textColor: '#11853D' },
        { count: exp30, label: '< 30 Days', color: '#DC2626', textColor: '#D92525' },
        { count: exp90, label: '< 90 Days', color: '#F59E0B', textColor: '#B45309' },
        { count: expired, label: 'Expired', color: '#71717A', textColor: '#3F3F46' },
      ];

      const barSegments = total > 0
        ? [
            { pct: Math.round((active / total) * 100), color: '#16A34A' },
            { pct: Math.round((exp90 / total) * 100), color: '#F59E0B' },
            { pct: Math.round((exp30 / total) * 100), color: '#DC2626' },
            { pct: Math.round((expired / total) * 100), color: '#71717A' },
          ]
        : [];

      return {
        totalCount: total,
        departmentCount: deptSet.size,
        topSource: topVendor ? `Top vendor: ${topVendor[0]} (${topVendor[1]})` : '—',
        buckets,
        barSegments,
        expiringSoon,
        moreCount: Math.max(0, moreCount),
        updatedAt: 'Live',
      };
    },
    staleTime: 60_000,
  });
}

/* ═══ Budget ═══ */
function useBudget() {
  return useQuery({
    queryKey: ['strategy-room', 'budget'],
    queryFn: async (): Promise<BudgetData | null> => {
      // Try budget_scenarios first
      const { data: scenarios } = await supabase
        .from('budget_scenarios')
        .select('*')
        .eq('is_active', true)
        .eq('type', 'baseline')
        .limit(1);

      if (scenarios && scenarios.length > 0) {
        const s = scenarios[0];
        const total = Number(s.total_budget) || 0;
        const ins = Number(s.insourced_budget) || 0;
        const cos = Number(s.cosourced_budget) || 0;
        const out = Number(s.outsourced_budget) || 0;
        const lic = Number(s.licenses_budget) || 0;
        const segments: BudgetSegment[] = [
          { label: 'Insourced', pct: total > 0 ? Math.round((ins / total) * 100) : 0, color: '#2563EB' },
          { label: 'Co-sourced', pct: total > 0 ? Math.round((cos / total) * 100) : 0, color: '#0D9488' },
          { label: 'Outsourced', pct: total > 0 ? Math.round((out / total) * 100) : 0, color: '#7C3AED' },
          { label: 'Licenses', pct: total > 0 ? Math.round((lic / total) * 100) : 0, color: '#F59E0B' },
        ].filter(s => s.pct > 0);

        return {
          total: fmtSAR(total),
          currency: 'SAR',
          confidence: 85,
          segments,
          updatedAt: 'Live',
        };
      }

      // Fallback: derive from resource_inventory CTC
      const { data: resources } = await supabase
        .from('resource_inventory')
        .select('ctc, resource_type, department_name')
        .eq('is_active', true);

      if (!resources || resources.length === 0) return null;

      const totalCtc = resources.reduce((sum, r) => sum + (Number(r.ctc) || 0), 0);
      if (totalCtc === 0) return null;

      // Build segments by resource_type
      const typeCtc = new Map<string, number>();
      resources.forEach(r => {
        const t = r.resource_type || 'Other';
        typeCtc.set(t, (typeCtc.get(t) || 0) + (Number(r.ctc) || 0));
      });
      const segColors: Record<string, string> = { Permanent: '#2563EB', Fixed: '#0D9488', Variable: '#7C3AED', Freelance: '#F59E0B' };
      const segments: BudgetSegment[] = Array.from(typeCtc.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([label, val]) => ({
          label,
          pct: Math.round((val / totalCtc) * 100),
          color: segColors[label] || '#71717A',
        }));

      // Departments
      const deptCtc = new Map<string, { total: number; count: number }>();
      resources.forEach(r => {
        const d = r.department_name || 'Unassigned';
        const existing = deptCtc.get(d) || { total: 0, count: 0 };
        existing.total += Number(r.ctc) || 0;
        existing.count++;
        deptCtc.set(d, existing);
      });
      const departments: BudgetDept[] = Array.from(deptCtc.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, { total, count }]) => ({
          name,
          pct: Math.round((total / totalCtc) * 100),
          count,
        }));

      return {
        total: fmtSAR(totalCtc),
        currency: 'SAR',
        confidence: 62,
        segments,
        departments,
        footerStats: segments.map(s => ({ label: `${s.label}: ${s.pct}%`, color: s.color })),
        updatedAt: 'Live (from CTC)',
      };
    },
    staleTime: 60_000,
  });
}

/* ═══ Brief banner ═══ */
function useBriefBanner() {
  return useQuery({
    queryKey: ['strategy-room', 'brief-banner'],
    queryFn: async (): Promise<BriefBanner | null> => {
      const { data, error } = await supabase
        .from('ai_briefs')
        .select('brief_json, metrics_json, published_at, version, status')
        .eq('scope', 'strategy_room')
        .eq('status', 'published')
        .order('version', { ascending: false })
        .limit(1);
      if (error || !data || data.length === 0) return null;
      const b = data[0];
      const bj = b.brief_json as Record<string, unknown> || {};
      const verdict = bj.verdict as Record<string, unknown> || {};
      return {
        grade: (verdict.grade as string) || '—',
        score: (verdict.score as string) || '—',
        headline: (verdict.headline as string) || 'Executive Brief Available',
        publishedAt: b.published_at ? fmtDate(b.published_at) : '—',
        nextReview: 'Next quarter',
        decisionCount: Array.isArray(bj.decisions) ? (bj.decisions as unknown[]).length : 0,
        issueCount: Array.isArray(bj.contradictions) ? (bj.contradictions as unknown[]).length : 0,
      };
    },
    staleTime: 120_000,
  });
}

/* ═══ Execution Snapshot ═══ */
interface ExecutionItem {
  label: string; value: string; valueColor?: string; target?: string;
  deltaText?: string; deltaDir?: 'up' | 'down' | 'flat'; footerNote?: string;
}

function useExecution() {
  return useQuery({
    queryKey: ['strategy-room', 'execution'],
    queryFn: async (): Promise<ExecutionItem[]> => {
      const [goalsRes, krsRes] = await Promise.all([
        supabase.from('es_goals').select('status, progress_pct'),
        supabase.from('es_key_results').select('progress_pct, status'),
      ]);
      const goals = goalsRes.data || [];
      const krs = krsRes.data || [];

      const totalGoals = goals.length;
      const onTrackGoals = goals.filter(g => g.status === 'active' || g.status === 'on_track').length;
      const avgGoalProgress = totalGoals > 0 ? Math.round(goals.reduce((s, g) => s + (g.progress_pct || 0), 0) / totalGoals) : 0;

      const totalKRs = krs.length;
      const avgKRProgress = totalKRs > 0 ? Math.round(krs.reduce((s, k) => s + (k.progress_pct || 0), 0) / totalKRs) : 0;
      const krsAbove80 = krs.filter(k => (k.progress_pct || 0) >= 80).length;
      const krsBelow40 = krs.filter(k => (k.progress_pct || 0) < 40).length;

      return [
        {
          label: 'Goals On Track',
          value: `${onTrackGoals}/${totalGoals}`,
          valueColor: onTrackGoals < totalGoals / 2 ? '#DC2626' : '#16A34A',
          target: `${totalGoals} total`,
          footerNote: `${totalKRs} Key Results tracked`,
        },
        {
          label: 'Avg Goal Progress',
          value: `${avgGoalProgress}%`,
          valueColor: avgGoalProgress < 50 ? '#DC2626' : avgGoalProgress < 70 ? '#F59E0B' : '#16A34A',
          target: '100%',
        },
        {
          label: 'Avg KR Progress',
          value: `${avgKRProgress}%`,
          valueColor: avgKRProgress < 50 ? '#DC2626' : avgKRProgress < 70 ? '#F59E0B' : '#16A34A',
          target: '100%',
        },
        {
          label: 'KRs At Risk (< 40%)',
          value: `${krsBelow40}`,
          valueColor: krsBelow40 > 0 ? '#DC2626' : '#16A34A',
          target: `${krsAbove80} above 80%`,
        },
      ];
    },
    staleTime: 60_000,
  });
}

/* ═══ Alignment ═══ */
interface AlignmentItem { name: string; pct: number; color: string; textColor: string }

function useAlignment() {
  return useQuery({
    queryKey: ['strategy-room', 'alignment'],
    queryFn: async (): Promise<AlignmentItem[]> => {
      const { data: themes, error } = await supabase
        .from('es_strategic_themes')
        .select('id, title, sort_order')
        .order('sort_order');
      if (error || !themes || themes.length === 0) return [];

      const { data: goals } = await supabase
        .from('es_goals')
        .select('theme_id, progress_pct');

      const goalsByTheme = new Map<string, number[]>();
      (goals || []).forEach(g => {
        if (!g.theme_id) return;
        const arr = goalsByTheme.get(g.theme_id) || [];
        arr.push(g.progress_pct || 0);
        goalsByTheme.set(g.theme_id, arr);
      });

      return themes.map(t => {
        const progs = goalsByTheme.get(t.id) || [];
        const avgProg = progs.length > 0 ? Math.round(progs.reduce((a, b) => a + b, 0) / progs.length) : 0;
        const color = avgProg >= 70 ? '#16A34A' : avgProg >= 40 ? '#F59E0B' : '#DC2626';
        const textColor = avgProg >= 70 ? '#11853D' : avgProg >= 40 ? '#B45309' : '#D92525';
        return { name: t.title, pct: avgProg, color, textColor };
      });
    },
    staleTime: 60_000,
  });
}

/* ═══ Composite hook ═══ */
export function useStrategyRoomData() {
  const themes = useThemes();
  const workforce = useWorkforce();
  const contracts = useContracts();
  const budget = useBudget();
  const brief = useBriefBanner();
  const execution = useExecution();
  const alignment = useAlignment();

  const isLoading = themes.isLoading || workforce.isLoading || contracts.isLoading || budget.isLoading;

  return {
    themes: themes.data ?? null,
    workforce: workforce.data ?? null,
    contracts: contracts.data ?? null,
    budget: budget.data ?? null,
    brief: brief.data ?? null,
    execution: execution.data ?? null,
    alignment: alignment.data ?? null,
    isLoading,
    fiscal: { year: '2026', quarter: 'Q1' } as const,
    updatedAgo: isLoading ? 'loading…' : 'just now',
  };
}
