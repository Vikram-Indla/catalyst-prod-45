/**
 * TestHub Dashboard Page — CATALYST10 Redesign
 * Route: /testhub/dashboard
 * Viewport-locked layout, CATALYST10 typography tokens
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, Download, AlertTriangle, ChevronRight, Plus, Play, FileText,
} from 'lucide-react';
import { TestHubPageHeader } from '@/components/testhub/TestHubPageHeader';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { useTheme } from '@/hooks/useTheme';
import type { ActiveCycle } from '@/components/testhub/dashboard/ActiveCyclesList';
import type { RecentActivity } from '@/components/testhub/dashboard/RecentActivityFeed';
import type { FailingTest } from '@/components/testhub/dashboard/TopFailingTests';
import type { DefectStats } from '@/components/testhub/dashboard/DefectStatsWidget';

// ── Sparkline SVG ──
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 120, h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 28, marginTop: 6 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} fillOpacity={0.07} stroke="none" />
    </svg>
  );
}

export default function TestHubDashboardPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [totalTestCases, setTotalTestCases] = useState(0);
  const [totalCycles, setTotalCycles] = useState(0);
  const [activeCyclesCount, setActiveCyclesCount] = useState(0);
  const [completedCyclesCount, setCompletedCyclesCount] = useState(0);
  const [totalPassed, setTotalPassed] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);
  const [totalBlocked, setTotalBlocked] = useState(0);
  const [totalNotRun, setTotalNotRun] = useState(0);
  const [overallPassRate, setOverallPassRate] = useState(0);
  const [activeCycles, setActiveCycles] = useState<ActiveCycle[]>([]);
  const [cycleStatsMap, setCycleStatsMap] = useState<Map<string, { passed: number; failed: number; blocked: number; notRun: number; total: number }>>(new Map());
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [failingTests, setFailingTests] = useState<FailingTest[]>([]);
  const [defectStats, setDefectStats] = useState<DefectStats | null>(null);
  const [automationCoverage, setAutomationCoverage] = useState(0);
  const [automatedCount, setAutomatedCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myExecutionsToday, setMyExecutionsToday] = useState(0);
  const [myPassedToday, setMyPassedToday] = useState(0);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // ── Parallel fetch: direct tm_* queries + defect RPCs ──
      const [
        testCasesRes,
        scopeStatusesRes,
        activeCyclesCountRes,
        completedCyclesCountRes,
        totalCyclesRes,
        cyclesRes,
        activityRes,
        failingScopesRes,
        defectStatsRes,
        defectDirectRes,
        automationRes,
        myStatsRes,
      ] = await Promise.all([
        // Total test cases
        supabase.from('tm_test_cases').select('*', { count: 'exact', head: true }),
        // Execution status counts
        typedQuery('tm_cycle_scope').select('current_status'),
        // Active cycle count
        supabase.from('tm_test_cycles').select('*', { count: 'exact', head: true }).in('status', ['active', 'in_progress']),
        // Completed cycle count
        supabase.from('tm_test_cycles').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        // Total cycles
        supabase.from('tm_test_cycles').select('*', { count: 'exact', head: true }),
        // Active cycles list (DO NOT TOUCH this query)
        typedQuery('tm_test_cycles')
          .select('id, cycle_key, name, status, total_cases, passed_count, failed_count, blocked_count, not_run_count, in_progress_count')
          .in('status', ['active', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(5),
        // Recent activity from th_test_executions
        typedQuery('th_test_executions')
          .select('id, result, executed_at, executed_by, cycle_scope_id, tm_cycle_scope!inner(cycle_id, test_case_id, tm_test_cycles!inner(cycle_key, name), tm_test_cases!inner(case_key, title))')
          .not('executed_at', 'is', null)
          .order('executed_at', { ascending: false })
          .limit(10),
        // Top failing tests
        typedQuery('tm_cycle_scope')
          .select('test_case_id, tm_test_cases!inner(id, case_key, title, priority)')
          .eq('current_status', 'failed'),
        // Defect stats (DO NOT TOUCH)
        supabase.rpc('get_defect_stats', { p_project_id: null }),
        typedQuery('tm_defects').select('status'),
        supabase.from('tm_test_cases').select('automation_status'),
        currentUserId
          ? typedQuery('th_test_executions')
              .select('id, result')
              .eq('executed_by', currentUserId)
              .gte('executed_at', new Date().toISOString().slice(0, 10))
          : Promise.resolve({ data: [], error: null }),
      ]);

      // ── Process: test case count ──
      setTotalTestCases(testCasesRes.count ?? 0);

      if (!automationRes.error && automationRes.data) {
        const total = automationRes.data.length;
        const automated = automationRes.data.filter((r: any) => r.automation_status === 'automated').length;
        const pct = total > 0 ? Math.round((automated / total) * 100) : 0;
        setAutomatedCount(automated);
        setAutomationCoverage(pct);
      }

      if (!myStatsRes.error && myStatsRes.data) {
        setMyExecutionsToday((myStatsRes.data as any[]).length);
        setMyPassedToday((myStatsRes.data as any[]).filter((r: any) => r.result === 'passed').length);
      }

      // ── Process: execution status counts from tm_cycle_scope ──
      const scopeStatuses = (scopeStatusesRes.data as any[] | null) ?? [];
      const _totalPassed  = scopeStatuses.filter((r: any) => r.current_status === 'passed').length;
      const _totalFailed  = scopeStatuses.filter((r: any) => r.current_status === 'failed').length;
      const _totalBlocked = scopeStatuses.filter((r: any) => r.current_status === 'blocked').length;
      const _totalNotRun  = scopeStatuses.filter((r: any) => !r.current_status || r.current_status === 'not_run').length;
      const _totalScoped  = scopeStatuses.length;
      const _passRate     = _totalScoped > 0 ? Math.round((_totalPassed / _totalScoped) * 100 * 10) / 10 : 0;
      setTotalPassed(_totalPassed);
      setTotalFailed(_totalFailed);
      setTotalBlocked(_totalBlocked);
      setTotalNotRun(_totalNotRun);
      setOverallPassRate(_passRate);

      // ── Process: cycle counts ──
      setActiveCyclesCount(activeCyclesCountRes.count ?? 0);
      setCompletedCyclesCount(completedCyclesCountRes.count ?? 0);
      setTotalCycles(totalCyclesRes.count ?? 0);

      // ── Process: active cycles list (query untouched) ──
      if (!cyclesRes.error && cyclesRes.data) {
        setActiveCycles(cyclesRes.data as unknown as ActiveCycle[]);

        // Fix 3: Batch query for live cycle stats from tm_cycle_scope
        const cycleIds = (cyclesRes.data as any[]).map((c: any) => c.id);
        if (cycleIds.length > 0) {
          const { data: allScopeRows } = await typedQuery('tm_cycle_scope')
            .select('cycle_id, current_status')
            .in('cycle_id', cycleIds);

          const statsMap = new Map<string, { passed: number; failed: number; blocked: number; notRun: number; total: number }>();
          cycleIds.forEach((id: string) => statsMap.set(id, { passed: 0, failed: 0, blocked: 0, notRun: 0, total: 0 }));
          (allScopeRows as any[] | null)?.forEach((row: any) => {
            const s = statsMap.get(row.cycle_id);
            if (!s) return;
            s.total++;
            if (row.current_status === 'passed')       s.passed++;
            else if (row.current_status === 'failed')  s.failed++;
            else if (row.current_status === 'blocked') s.blocked++;
            else                                        s.notRun++;
          });
          setCycleStatsMap(statsMap);
        }
      }

      // ── Process: recent activity from th_test_executions ──
      if (!activityRes.error && activityRes.data) {
        setRecentActivity(
          (activityRes.data as any[]).map((a: any) => ({
            id: a.id,
            execution_status: a.result ?? 'not_run',
            executed_at: a.executed_at ?? '',
            case_key: a.tm_cycle_scope?.tm_test_cases?.case_key ?? '',
            title: a.tm_cycle_scope?.tm_test_cases?.title ?? '',
            cycle_key: a.tm_cycle_scope?.tm_test_cycles?.cycle_key ?? '',
            cycle_id: a.tm_cycle_scope?.cycle_id ?? '',
            executed_by_name: a.executed_by ? String(a.executed_by).slice(0, 8) : 'Unknown',
          }))
        );
      }

      // ── Process: top failing tests from tm_cycle_scope ──
      if (!failingScopesRes.error && failingScopesRes.data) {
        const failMap = new Map<string, { test_case_id: string; case_key: string; title: string; priority: string; failure_count: number; last_failed: string }>();
        (failingScopesRes.data as any[]).forEach((row: any) => {
          const tc = row.tm_test_cases;
          if (!tc) return;
          const existing = failMap.get(tc.id);
          if (existing) { existing.failure_count++; }
          else { failMap.set(tc.id, { test_case_id: tc.id, case_key: tc.case_key, title: tc.title, priority: tc.priority ?? 'medium', failure_count: 1, last_failed: '' }); }
        });
        const topFailing = [...failMap.values()]
          .sort((a, b) => b.failure_count - a.failure_count)
          .slice(0, 5);
        setFailingTests(topFailing as FailingTest[]);
      }

      // Defect stats: prefer RPC, fallback to direct query (DO NOT TOUCH)
      if (!defectStatsRes.error && defectStatsRes.data && Array.isArray(defectStatsRes.data) && defectStatsRes.data.length) {
        setDefectStats(defectStatsRes.data[0] as unknown as DefectStats);
      } else if (!defectDirectRes.error && defectDirectRes.data) {
        const counts = { open_defects: 0, in_progress_defects: 0, fixed_defects: 0, closed_defects: 0, total_defects: 0 };
        (defectDirectRes.data as any[]).forEach((d: any) => {
          const s = (d.status || '').toLowerCase().replace(/\s+/g, '_');
          counts.total_defects++;
          if (s === 'open' || s === 'new') counts.open_defects++;
          else if (s === 'in_progress') counts.in_progress_defects++;
          else if (s === 'fixed' || s === 'resolved') counts.fixed_defects++;
          else if (s === 'closed') counts.closed_defects++;
          else counts.open_defects++; // default to open
        });
        setDefectStats(counts as unknown as DefectStats);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      catalystToast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const formatLastUpdated = () =>
    lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  // ── Derived data ──
  const totalExecuted = totalPassed + totalFailed + totalBlocked;
  const totalAll = totalExecuted + totalNotRun;
  const passRate = overallPassRate;
  const passRateColor = passRate < 60 ? '#DC2626' : passRate < 80 ? '#D97706' : '#059669';

  const execSegments = useMemo(() => {
    if (totalAll === 0) return [];
    return [
      { label: 'Passed', count: totalPassed, pct: (totalPassed / totalAll) * 100, color: '#10B981' },
      { label: 'Failed', count: totalFailed, pct: (totalFailed / totalAll) * 100, color: '#EF4444' },
      { label: 'Blocked', count: totalBlocked, pct: (totalBlocked / totalAll) * 100, color: '#F59E0B' },
      { label: 'Not run', count: totalNotRun, pct: (totalNotRun / totalAll) * 100, color: '#CBD5E1' },
    ];
  }, [totalPassed, totalFailed, totalBlocked, totalNotRun, totalAll]);

  const attentionItems = useMemo(() => {
    const items: { title: string; meta: string; danger: boolean }[] = [];
    if (totalBlocked > 0) items.push({ title: `${totalBlocked} blocked tests`, meta: 'Require unblocking', danger: true });
    if (totalFailed > 0) items.push({ title: `${totalFailed} failed tests`, meta: 'Need investigation', danger: true });
    if (failingTests.length > 0) items.push({ title: `${failingTests.length} recurring failures`, meta: 'Review test stability', danger: false });
    if (defectStats && defectStats.open_defects > 0) items.push({ title: `${defectStats.open_defects} open defects`, meta: 'Pending resolution', danger: false });
    return items.slice(0, 4);
  }, [totalBlocked, totalFailed, failingTests, defectStats]);

  if (isLoading) {
    return (
      <div style={{ height: 'calc(100vh - 44px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: isDark ? '#0A0A0A' : '#F8FAFC', padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, flexShrink: 0, marginBottom: 12 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse" style={{ height: 130, background: isDark ? '#1A1A1A' : '#E2E8F0', borderRadius: 8 }} />
          ))}
        </div>
        <div className="animate-pulse" style={{ height: 48, background: isDark ? '#1A1A1A' : '#E2E8F0', borderRadius: 8, marginBottom: 12, flexShrink: 0 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 320px', gap: 12, flex: 1, minHeight: 0 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse" style={{ height: '100%', background: isDark ? '#1A1A1A' : '#E2E8F0', borderRadius: 8 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: 'calc(100vh - 44px)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: isDark ? '#0A0A0A' : '#F8FAFC', fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* ═══ PAGE HEADER — 64px ═══ */}
      <TestHubPageHeader title="TestHub Dashboard" subtitle="Test execution metrics and activity">
          <span style={{ fontSize: 12, fontWeight: 400, color: isDark ? '#878787' : '#64748B' }}>
            Updated {formatLastUpdated()}
          </span>
          <button onClick={fetchDashboardData} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 32, padding: '8px 12px', fontSize: 13, fontWeight: 500,
            color: isDark ? '#EDEDED' : '#0F172A', background: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`,
            borderRadius: 6, cursor: 'pointer',
          }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 32, padding: '8px 12px', fontSize: 13, fontWeight: 500,
            color: isDark ? '#EDEDED' : '#0F172A', background: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`,
            borderRadius: 6, cursor: 'pointer',
          }}>
            <Download size={13} /> Export
          </button>
      </TestHubPageHeader>

      {/* ═══ BODY ═══ */}
      <div style={{ flex: 1, minHeight: 0, padding: '12px 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── KPI STRIP — 6 cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, flexShrink: 0 }}>
          <KPICard label="Total test cases" value={totalTestCases} accent="#2563EB"
            trend={{ direction: 'up', value: '+3', color: '#059669' }}
            subtitle={`${totalCycles} cycles total`} sparkData={[4, 6, 5, 8, 10, 9, 12, 14]} />
          <KPICard label="Overall pass rate" value={`${passRate}%`} accent={passRate < 60 ? "#EF4444" : "#D97706"}
            trend={{ direction: 'down', value: '−12%', color: '#DC2626' }}
            subtitle={`${totalExecuted} of ${totalAll} executed`} sparkData={[80, 72, 65, 58, 52, 48, 46, 47]}
            valueColor={passRateColor} isDanger={passRate < 60} />
          <KPICard label="Active cycles" value={activeCycles.length} accent="#3B82F6"
            trend={{ direction: 'flat', value: '—', color: '#94A3B8' }}
            subtitle={`${completedCyclesCount} completed`} sparkData={[3, 4, 5, 5, 5, 5, 5, 5]} />
          <KPICard label="Blocked tests" value={totalBlocked} accent="#EF4444"
            trend={{ direction: 'up', value: '+2', color: '#DC2626' }}
            subtitle={`${totalFailed} failed tests`} sparkData={[0, 1, 1, 2, 2, 3, 3, 3]}
            valueColor={totalBlocked > 0 ? '#DC2626' : undefined} />
          <KPICard label="Automation coverage" value={`${automationCoverage}%`} accent="#10B981"
            trend={{ direction: 'flat', value: '—', color: '#94A3B8' }}
            subtitle={`${automatedCount} of ${totalTestCases} automated`}
            sparkData={[0, 0, 0, 0, 0, 0, 0, automationCoverage]} />
          <KPICard label="My executions today" value={myExecutionsToday} accent="#8B5CF6"
            trend={{ direction: 'flat', value: '—', color: '#94A3B8' }}
            subtitle={`${myPassedToday} passed today`}
            sparkData={[0, 0, 0, 0, 0, 0, 0, myExecutionsToday]} />
        </div>

        {/* ── EXECUTION STATUS BAR — 48px ── */}
        <div style={{
          background: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8,
          padding: '10px 16px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#A1A1A1' : '#334155' }}>Execution status</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A' }}>{totalAll} total</span>
          </div>
          <div style={{ display: 'flex', height: 8, borderRadius: 4, background: isDark ? '#1A1A1A' : '#F1F5F9', gap: 1, overflow: 'hidden' }}>
            {execSegments.map(seg => (
              seg.pct > 0 && (
                <div key={seg.label} style={{
                  width: `${seg.pct}%`, background: seg.color, borderRadius: 4,
                  transition: 'width 500ms ease-out', minWidth: 3,
                }} />
              )
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            {execSegments.map(seg => (
              <span key={seg.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: seg.color, display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: isDark ? '#A1A1A1' : '#334155' }}>{seg.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A' }}>{seg.count}</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── CONTENT GRID ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 320px', gap: 12, flex: 1, minHeight: 0 }}>

          {/* ═ LEFT: Active Cycles ═ */}
          <Card title="Active Cycles" badge={String(activeCycles.length)} onViewAll={() => navigate('/testhub/cycles')}>
             {activeCycles.length === 0 ? (
               <EmptyMini icon={<Play size={24} color="#94A3B8" />} text="No active cycles" />
             ) : (
               <>
                 {activeCycles.slice(0, 20).map(cycle => {
                   const cs = cycleStatsMap.get(cycle.id);
                   const csPassed = cs?.passed ?? 0;
                   const csFailed = cs?.failed ?? 0;
                   const csBlocked = cs?.blocked ?? 0;
                   const csNotRun = cs?.notRun ?? 0;
                   const csTotal = cs?.total ?? 0;
                   const pct = csTotal > 0 ? Math.min(Math.round(((csPassed + csFailed + csBlocked) / csTotal) * 100), 100) : 0;
                   const barColor = pct === 0 ? '#CBD5E1' : pct <= 30 ? '#EF4444' : pct <= 70 ? '#F59E0B' : '#10B981';
                   return (
                     <div key={cycle.id} onClick={() => navigate(`/testhub/cycles/${cycle.id}`)}
                       className="c10-row"
                       style={{
                         display: 'grid', gridTemplateColumns: '90px 1fr 100px 130px',
                         alignItems: 'center', height: 50, padding: '0 16px',
                         cursor: 'pointer', borderBottom: `1px solid ${isDark ? '#292929' : '#F1F5F9'}`,
                       }}>
                       <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: '#2563EB' }}>
                         {cycle.cycle_key}
                       </span>
                       <span style={{ fontSize: 14, fontWeight: 500, color: isDark ? '#EDEDED' : '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                         {cycle.name}
                       </span>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                         <div style={{ flex: 1, height: 4, borderRadius: 4, background: isDark ? '#1A1A1A' : '#F1F5F9', overflow: 'hidden' }}>
                           <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 400ms ease-out' }} />
                         </div>
                         <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                       </div>
                       <div style={{ display: 'flex', gap: 6, fontSize: 12, fontWeight: 600, justifyContent: 'flex-end' }}>
                         <span style={{ color: '#059669' }}>{csPassed}P</span>
                         <span style={{ color: '#64748B' }}>·</span>
                         <span style={{ color: '#DC2626' }}>{csFailed}F</span>
                         <span style={{ color: '#64748B' }}>·</span>
                         <span style={{ color: '#64748B' }}>{csNotRun}NR</span>
                       </div>
                     </div>
                   );
                 })}
                 {activeCycles.length === activeCycles.length && (
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 4, padding: '32px 16px' }}>
                     <span style={{ fontSize: 12, fontWeight: 400, color: isDark ? '#878787' : '#94A3B8' }}>
                       All {activeCycles.length} active cycle{activeCycles.length !== 1 ? 's' : ''} shown
                     </span>
                     <a href="/testhub/cycles" style={{ fontSize: 12, fontWeight: 500, color: '#2563EB', textDecoration: 'none', cursor: 'pointer' }}>
                       View completed cycles →
                     </a>
                   </div>
                 )}
               </>
             )}
          </Card>

           {/* ═ MIDDLE: Failing Tests + Defects (Merged) ═ */}
           <div style={{
             display: 'flex', flexDirection: 'column', minHeight: 0,
             background: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8, overflow: 'hidden',
           }}>
             {/* Header: Top Failing Tests */}
             <div style={{
               padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
               borderBottom: `1px solid ${isDark ? '#292929' : '#F1F5F9'}`, flexShrink: 0,
             }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                 <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A' }}>Top Failing Tests</span>
                 <span style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', background: isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2', padding: '2px 8px', borderRadius: 10 }}>
                   {failingTests.length}
                 </span>
               </div>
               <button onClick={() => navigate('/testhub/repository')} style={{ fontSize: 13, fontWeight: 500, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                 View all <ChevronRight size={12} />
               </button>
             </div>

             {/* Body: Failing Tests rows */}
             <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
               {failingTests.length === 0 ? (
                 <EmptyMini icon={<AlertTriangle size={24} color="#94A3B8" />} text="No failing tests" />
               ) : (
                 <>
                   {failingTests.slice(0, 10).map(test => {
                     const sevColor = test.priority?.toLowerCase() === 'high' || test.priority?.toLowerCase() === 'critical'
                       ? { bg: isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2', color: '#DC2626' }
                       : { bg: isDark ? 'rgba(251,191,36,0.12)' : '#FFFBEB', color: '#D97706' };
                     return (
                       <div key={test.test_case_id} onClick={() => navigate(`/testhub/repository?view=${test.test_case_id}`)}
                         className="c10-row-danger"
                         style={{
                           display: 'grid', gridTemplateColumns: '72px 1fr 60px 64px',
                           alignItems: 'center', height: 50, padding: '0 16px',
                           cursor: 'pointer', borderBottom: `1px solid ${isDark ? '#292929' : '#F1F5F9'}`,
                         }}>
                         <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: '#2563EB' }}>
                           {test.case_key}
                         </span>
                         <span style={{ fontSize: 14, fontWeight: 500, color: isDark ? '#EDEDED' : '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                           {test.title}
                         </span>
                         <span style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>
                           {test.failure_count} fail{test.failure_count !== 1 ? 's' : ''}
                         </span>
                         <span style={{
                           fontSize: 11, fontWeight: 600, letterSpacing: '0.03em',
                           background: sevColor.bg, color: sevColor.color,
                           padding: '2px 8px', borderRadius: 4, textAlign: 'center',
                         }}>
                           {test.priority || 'Med'}
                         </span>
                       </div>
                     );
                   })}
                 </>
               )}
             </div>

             {/* Divider: dashed border */}
             <div style={{ borderTop: `1px dashed ${isDark ? '#2E2E2E' : '#E2E8F0'}`, flexShrink: 0 }} />

             {/* Defects Section: Sub-header + Grid */}
             <div style={{ flexShrink: 0 }}>
               <div style={{
                 padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                 flexShrink: 0,
               }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                   <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A' }}>Defects</span>
                   <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#878787' : '#64748B', background: isDark ? '#1A1A1A' : '#F1F5F9', padding: '2px 8px', borderRadius: 10 }}>
                     {defectStats?.total_defects ?? 0}
                   </span>
                 </div>
                 <button onClick={() => navigate('/testhub/defects')} style={{ fontSize: 13, fontWeight: 500, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                   View all <ChevronRight size={12} />
                 </button>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                 {[
                   { label: 'Open', value: defectStats?.open_defects ?? 0 },
                   { label: 'In progress', value: defectStats?.in_progress_defects ?? 0 },
                   { label: 'Fixed', value: defectStats?.fixed_defects ?? 0 },
                   { label: 'Closed', value: defectStats?.closed_defects ?? 0 },
                 ].map((d, i) => (
                   <div key={d.label} style={{
                     textAlign: 'center', padding: '12px 8px',
                     borderRight: i < 3 ? `1px solid ${isDark ? '#292929' : '#F1F5F9'}` : 'none',
                   }}>
                     <div style={{ fontSize: 20, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A', lineHeight: 1 }}>{d.value}</div>
                     <div style={{ fontSize: 12, fontWeight: 500, color: isDark ? '#878787' : '#64748B', marginTop: 4 }}>{d.label}</div>
                   </div>
                 ))}
               </div>
             </div>
           </div>

          {/* ═ RIGHT: Needs Attention + Activity + Quick Actions ═ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            {/* Needs Attention */}
            <div style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8,
              borderLeft: '3px solid #EF4444', overflow: 'hidden', flexShrink: 0,
            }}>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A' }}>Needs attention</span>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: '#DC2626', background: isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2',
                  padding: '2px 8px', borderRadius: 12,
                }}>
                  {attentionItems.length}
                </span>
              </div>
              {attentionItems.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: isDark ? '#878787' : '#64748B' }}>
                  All clear — no issues
                </div>
              ) : (
                attentionItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderTop: i > 0 ? `1px solid ${isDark ? '#292929' : '#F1F5F9'}` : 'none' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: item.danger ? (isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2') : (isDark ? 'rgba(251,191,36,0.12)' : '#FFFBEB'),
                    }}>
                      <AlertTriangle size={12} color={item.danger ? '#DC2626' : '#D97706'} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: isDark ? '#EDEDED' : '#0F172A' }}>{item.title}</div>
                      <div style={{ fontSize: 12, fontWeight: 400, color: isDark ? '#878787' : '#64748B' }}>{item.meta}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Activity Feed + Quick Actions */}
            <div style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8,
              flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${isDark ? '#292929' : '#F1F5F9'}`, flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A' }}>Activity</span>
              </div>
               <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                 {recentActivity.length === 0 ? (
                   <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: isDark ? '#878787' : '#64748B' }}>
                     No test executions recorded yet.
                   </div>
                 ) : (
                   <>
                     {recentActivity.slice(0, 10).map((a, i) => {
                       const dotColor = a.execution_status === 'passed' ? '#10B981'
                         : a.execution_status === 'failed' ? '#EF4444'
                         : a.execution_status === 'blocked' ? '#F59E0B'
                         : '#3B82F6';
                       const verb = a.execution_status === 'passed' ? 'passed'
                         : a.execution_status === 'failed' ? 'failed'
                         : a.execution_status === 'blocked' ? 'blocked'
                         : 'created';
                       return (
                         <div key={a.id} style={{
                           display: 'flex', alignItems: 'flex-start', gap: 8,
                           padding: '8px 16px', borderTop: i > 0 ? `1px solid ${isDark ? '#292929' : '#F1F5F9'}` : 'none',
                         }}>
                           <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, marginTop: 6, flexShrink: 0 }} />
                           <div style={{ flex: 1, minWidth: 0 }}>
                             <div style={{ fontSize: 13, fontWeight: 400, color: isDark ? '#EDEDED' : '#0F172A', lineHeight: 1.43 }}>
                               <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: '#2563EB' }}>{a.case_key}</span>
                               {' '}<span style={{ fontWeight: 600 }}>{verb}</span> in {a.cycle_key}
                             </div>
                             <div style={{ fontSize: 11, fontWeight: 400, color: isDark ? '#878787' : '#64748B' }}>
                               {a.executed_by_name} · {formatTimeAgo(a.executed_at)}
                             </div>
                           </div>
                         </div>
                       );
                     })}
                     {recentActivity.length < 3 && (
                       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontSize: 12, fontWeight: 400, color: isDark ? '#878787' : '#94A3B8' }}>
                         No more recent activity
                       </div>
                     )}
                   </>
                 )}
               </div>
               {/* Quick Actions — pinned bottom */}
               <div style={{ display: 'flex', gap: 8, padding: '10px 16px', paddingRight: '80px', borderTop: `1px solid ${isDark ? '#292929' : '#F1F5F9'}`, flexShrink: 0 }}>
                 <QuickBtn label="New case" onClick={() => navigate('/testhub/repository')} />
                 <QuickBtn label="Start cycle" onClick={() => navigate('/testhub/cycles')} />
                 <QuickBtn label="Report" onClick={() => navigate('/testhub/reports')} />
               </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Inline styles for hover ── */}
      <style>{`
        .c10-row:hover { background: ${isDark ? '#1A1A1A' : '#F8FAFC'}; }
        .c10-row-danger:hover { background: ${isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2'}; }
        .c10-kpi:hover { border-color: ${isDark ? '#454545' : '#CBD5E1'} !important; box-shadow: 0 4px 16px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'} !important; }
        .c10-qbtn:hover { border-color: #2563EB !important; color: #2563EB !important; background: ${isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF'} !important; }
      `}</style>
    </div>
  );
}

// ── Sub-components ──

function KPICard({ label, value, accent, trend, subtitle, sparkData, valueColor, isDanger }: {
  label: string;
  value: string | number;
  accent: string;
  trend: { direction: 'up' | 'down' | 'flat'; value: string; color: string };
  subtitle: string;
  sparkData: number[];
  valueColor?: string;
  isDanger?: boolean;
}) {
  const { isDark } = useTheme();
  return (
    <div className="c10-kpi" style={{
      background: isDanger ? (isDark ? 'rgba(248,113,113,0.08)' : 'rgba(254, 242, 242, 0.6)') : (isDark ? '#1A1A1A' : '#FFFFFF'),
      border: isDanger ? `1px solid ${isDark ? 'rgba(248,113,113,0.2)' : '#FECACA'}` : `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`,
      borderRadius: 8,
      borderLeft: `3px solid ${accent}`,
      padding: 16, cursor: 'pointer',
      transition: 'border-color 150ms, box-shadow 150ms',
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: isDark ? '#A1A1A1' : '#334155', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 36, fontWeight: 700, color: valueColor || (isDark ? '#EDEDED' : '#0F172A'), letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {value}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: trend.color }}>
          {trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : ''} {trend.value}
        </span>
      </div>
      <Sparkline data={sparkData} color={accent} />
      <div style={{ fontSize: 12, fontWeight: 400, color: isDark ? '#878787' : '#64748B', marginTop: 4 }}>{subtitle}</div>
    </div>
  );
}

function Card({ title, badge, badgeDanger, badgeColor, onViewAll, children, style }: {
  title: string;
  badge?: string;
  badgeDanger?: boolean;
  badgeColor?: string;
  onViewAll?: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const { isDark } = useTheme();
  const bg = badgeDanger ? (isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2') : (isDark ? '#1A1A1A' : '#F1F5F9');
  const color = badgeDanger ? '#DC2626' : badgeColor || (isDark ? '#878787' : '#64748B');
  return (
    <div style={{ background: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, ...style }}>
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${isDark ? '#292929' : '#F1F5F9'}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A' }}>{title}</span>
          {badge && (
            <span style={{ fontSize: 12, fontWeight: 600, color, background: bg, padding: '2px 8px', borderRadius: 10 }}>
              {badge}
            </span>
          )}
        </div>
        {onViewAll && (
          <button onClick={onViewAll} style={{ fontSize: 13, fontWeight: 500, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
            View all <ChevronRight size={12} />
          </button>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

function EmptyMini({ icon, text }: { icon: React.ReactNode; text: string }) {
  const { isDark } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', gap: 6 }}>
      {icon}
      <span style={{ fontSize: 13, color: isDark ? '#878787' : '#64748B' }}>{text}</span>
    </div>
  );
}

function QuickBtn({ label, onClick }: { label: string; onClick: () => void }) {
  const { isDark } = useTheme();
  return (
    <button className="c10-qbtn" onClick={onClick} style={{
      flex: 1, height: 32, fontSize: 13, fontWeight: 500,
      color: isDark ? '#A1A1A1' : '#334155', background: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`,
      borderRadius: 6, cursor: 'pointer', transition: 'all 150ms',
    }}>
      {label}
    </button>
  );
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
