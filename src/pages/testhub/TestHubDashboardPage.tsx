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
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import type { DashboardStats } from '@/components/testhub/dashboard/DashboardStatCards';
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
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeCycles, setActiveCycles] = useState<ActiveCycle[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [failingTests, setFailingTests] = useState<FailingTest[]>([]);
  const [defectStats, setDefectStats] = useState<DefectStats | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, cyclesRes, activityRes, failingRes, defectStatsRes] = await Promise.all([
        supabase.rpc('get_dashboard_stats'),
        supabase
          .from('th_test_cycles')
          .select('id, cycle_key, name, status, progress_percent, total_cases, passed_count, failed_count, blocked_count, not_run_count')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('th_cycle_test_cases')
          .select('id, execution_status, executed_at, cycle_id, test_case_id, executed_by, th_test_cases(case_key, title), th_test_cycles!th_cycle_test_cases_cycle_id_fkey(cycle_key), profiles!th_cycle_test_cases_executed_by_fkey(full_name)')
          .not('executed_at', 'is', null)
          .order('executed_at', { ascending: false })
          .limit(10),
        supabase.rpc('get_top_failing_tests', { p_limit: 5 }),
        supabase.rpc('get_defect_stats'),
      ]);

      if (!statsRes.error && statsRes.data?.length) setStats(statsRes.data[0] as unknown as DashboardStats);
      if (!cyclesRes.error && cyclesRes.data) setActiveCycles(cyclesRes.data as unknown as ActiveCycle[]);
      if (!activityRes.error && activityRes.data) {
        setRecentActivity(
          (activityRes.data as any[]).map((a) => ({
            id: a.id,
            execution_status: a.execution_status ?? 'not_run',
            executed_at: a.executed_at ?? '',
            case_key: a.th_test_cases?.case_key ?? '',
            title: a.th_test_cases?.title ?? '',
            cycle_key: a.th_test_cycles?.cycle_key ?? '',
            cycle_id: a.cycle_id,
            executed_by_name: a.profiles?.full_name ?? 'Unknown',
          }))
        );
      }
      if (!failingRes.error && failingRes.data) setFailingTests(failingRes.data as unknown as FailingTest[]);
      if (!defectStatsRes.error && defectStatsRes.data?.length) setDefectStats(defectStatsRes.data[0] as unknown as DefectStats);

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      catalystToast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const formatLastUpdated = () =>
    lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  // ── Derived data ──
  const totalExecuted = stats ? (stats.total_passed + stats.total_failed + stats.total_blocked) : 0;
  const totalAll = stats ? (totalExecuted + stats.total_not_run) : 0;
  const passRate = stats?.overall_pass_rate ?? 0;
  const passRateColor = passRate < 60 ? '#DC2626' : passRate < 80 ? '#D97706' : '#059669';

  const execSegments = useMemo(() => {
    if (!stats || totalAll === 0) return [];
    return [
      { label: 'Passed', count: stats.total_passed, pct: (stats.total_passed / totalAll) * 100, color: '#10B981' },
      { label: 'Failed', count: stats.total_failed, pct: (stats.total_failed / totalAll) * 100, color: '#EF4444' },
      { label: 'Blocked', count: stats.total_blocked, pct: (stats.total_blocked / totalAll) * 100, color: '#F59E0B' },
      { label: 'Not run', count: stats.total_not_run, pct: (stats.total_not_run / totalAll) * 100, color: '#CBD5E1' },
    ];
  }, [stats, totalAll]);

  const attentionItems = useMemo(() => {
    const items: { title: string; meta: string; danger: boolean }[] = [];
    if (stats && stats.total_blocked > 0) items.push({ title: `${stats.total_blocked} blocked tests`, meta: 'Require unblocking', danger: true });
    if (stats && stats.total_failed > 0) items.push({ title: `${stats.total_failed} failed tests`, meta: 'Need investigation', danger: true });
    if (failingTests.length > 0) items.push({ title: `${failingTests.length} recurring failures`, meta: 'Review test stability', danger: false });
    if (defectStats && defectStats.open_defects > 0) items.push({ title: `${defectStats.open_defects} open defects`, meta: 'Pending resolution', danger: false });
    return items.slice(0, 4);
  }, [stats, failingTests, defectStats]);

  if (isLoading) {
    return (
      <div style={{ height: 'calc(100vh - 44px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8FAFC', padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, flexShrink: 0, marginBottom: 12 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse" style={{ height: 130, background: '#E2E8F0', borderRadius: 8 }} />
          ))}
        </div>
        <div className="animate-pulse" style={{ height: 48, background: '#E2E8F0', borderRadius: 8, marginBottom: 12, flexShrink: 0 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 320px', gap: 12, flex: 1, minHeight: 0 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse" style={{ height: '100%', background: '#E2E8F0', borderRadius: 8 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: 'calc(100vh - 44px)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: '#F8FAFC', fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* ═══ PAGE HEADER — 48px ═══ */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 24px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0',
        height: 48, boxSizing: 'border-box', flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            TestHub Dashboard
          </h1>
          <p style={{ fontSize: 16, fontWeight: 400, color: '#64748B', margin: 0, lineHeight: 1.2 }}>
            Test execution metrics and activity
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 400, color: '#64748B' }}>
            Updated {formatLastUpdated()}
          </span>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 32, padding: '0 12px', fontSize: 13, fontWeight: 500,
            color: '#2563EB', background: '#EFF6FF', border: 'none',
            borderRadius: 16, cursor: 'pointer',
          }}>
            Last 30 days
          </button>
          <button onClick={fetchDashboardData} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 32, padding: '0 12px', fontSize: 13, fontWeight: 500,
            color: '#0F172A', background: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: 6, cursor: 'pointer',
          }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 32, padding: '0 12px', fontSize: 13, fontWeight: 500,
            color: '#0F172A', background: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: 6, cursor: 'pointer',
          }}>
            <Download size={13} /> Export
          </button>
        </div>
      </header>

      {/* ═══ BODY ═══ */}
      <div style={{ flex: 1, minHeight: 0, padding: '12px 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── KPI STRIP — 5 cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, flexShrink: 0 }}>
          <KPICard label="Total test cases" value={stats?.total_test_cases ?? 0} accent="#2563EB"
            trend={{ direction: 'up', value: '+3', color: '#059669' }}
            subtitle={`${stats?.total_cycles ?? 0} cycles total`} sparkData={[4, 6, 5, 8, 10, 9, 12, 14]} />
          <KPICard label="Overall pass rate" value={`${passRate}%`} accent="#EF4444"
            trend={{ direction: 'down', value: '−12%', color: '#DC2626' }}
            subtitle={`${totalExecuted} of ${totalAll} executed`} sparkData={[80, 72, 65, 58, 52, 48, 46, 47]}
            valueColor={passRateColor} />
          <KPICard label="Active cycles" value={stats?.active_cycles ?? 0} accent="#3B82F6"
            trend={{ direction: 'flat', value: '—', color: '#94A3B8' }}
            subtitle={`${stats?.completed_cycles ?? 0} completed`} sparkData={[3, 4, 5, 5, 5, 5, 5, 5]} />
          <KPICard label="Blocked tests" value={stats?.total_blocked ?? 0} accent="#EF4444"
            trend={{ direction: 'up', value: '+2', color: '#DC2626' }}
            subtitle={`${stats?.total_failed ?? 0} failed tests`} sparkData={[0, 1, 1, 2, 2, 3, 3, 3]}
            valueColor={(stats?.total_blocked ?? 0) > 0 ? '#DC2626' : undefined} />
          <KPICard label="Automation coverage" value="0%" accent="#10B981"
            trend={{ direction: 'flat', value: '—', color: '#94A3B8' }}
            subtitle={`0 of ${stats?.total_test_cases ?? 0} automated`} sparkData={[0, 0, 0, 0, 0, 0, 0, 0]} />
        </div>

        {/* ── EXECUTION STATUS BAR — 48px ── */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8,
          padding: '10px 16px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Execution status</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{totalAll} total</span>
          </div>
          <div style={{ display: 'flex', height: 8, borderRadius: 4, background: '#F1F5F9', gap: 1, overflow: 'hidden' }}>
            {execSegments.map(seg => (
              seg.pct > 0 && (
                <div key={seg.label} style={{
                  width: `${seg.pct}%`, background: seg.color, borderRadius: 2,
                  transition: 'width 500ms ease-out', minWidth: 3,
                }} />
              )
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            {execSegments.map(seg => (
              <span key={seg.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: seg.color, display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{seg.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{seg.count}</span>
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
              activeCycles.slice(0, 20).map(cycle => {
                const pct = cycle.progress_percent ?? 0;
                const barColor = pct === 0 ? '#CBD5E1' : pct <= 30 ? '#EF4444' : pct <= 70 ? '#F59E0B' : '#10B981';
                return (
                  <div key={cycle.id} onClick={() => navigate(`/testhub/cycles/${cycle.id}`)}
                    className="c10-row"
                    style={{
                      display: 'grid', gridTemplateColumns: '90px 1fr 100px 130px',
                      alignItems: 'center', height: 36, padding: '0 16px',
                      cursor: 'pointer', borderBottom: '1px solid #F1F5F9',
                    }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: '#2563EB' }}>
                      {cycle.cycle_key}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cycle.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#F1F5F9', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width 400ms ease-out' }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, fontSize: 12, fontWeight: 600, justifyContent: 'flex-end' }}>
                      <span style={{ color: '#059669' }}>{cycle.passed_count ?? 0}P</span>
                      <span style={{ color: '#64748B' }}>·</span>
                      <span style={{ color: '#DC2626' }}>{cycle.failed_count ?? 0}F</span>
                      <span style={{ color: '#64748B' }}>·</span>
                      <span style={{ color: '#64748B' }}>{cycle.not_run_count ?? 0}NR</span>
                    </div>
                  </div>
                );
              })
            )}
          </Card>

          {/* ═ MIDDLE: Failing Tests + Defects Mini ═ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            {/* Top Failing Tests */}
            <Card title="Top Failing Tests" badge={String(failingTests.length)} badgeDanger
              onViewAll={() => navigate('/testhub/repository')}
              style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {failingTests.length === 0 ? (
                <EmptyMini icon={<AlertTriangle size={24} color="#94A3B8" />} text="No failing tests" />
              ) : (
                failingTests.slice(0, 10).map(test => {
                  const sevColor = test.priority?.toLowerCase() === 'high' || test.priority?.toLowerCase() === 'critical'
                    ? { bg: '#FEF2F2', color: '#DC2626' }
                    : { bg: '#FFFBEB', color: '#D97706' };
                  return (
                    <div key={test.test_case_id} onClick={() => navigate(`/testhub/repository?view=${test.test_case_id}`)}
                      className="c10-row-danger"
                      style={{
                        display: 'grid', gridTemplateColumns: '72px 1fr 60px 64px',
                        alignItems: 'center', height: 36, padding: '0 16px',
                        cursor: 'pointer', borderBottom: '1px solid #F1F5F9',
                      }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: '#2563EB' }}>
                        {test.case_key}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                })
              )}
            </Card>

            {/* Defects Mini — pinned bottom */}
            <Card title="Defects" badge={String(defectStats?.total_defects ?? 0)}
              onViewAll={() => navigate('/testhub/defects')}
              style={{ flexShrink: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[
                  { label: 'Open', value: defectStats?.open_defects ?? 0 },
                  { label: 'In progress', value: defectStats?.in_progress_defects ?? 0 },
                  { label: 'Fixed', value: defectStats?.fixed_defects ?? 0 },
                  { label: 'Closed', value: defectStats?.closed_defects ?? 0 },
                ].map((d, i) => (
                  <div key={d.label} style={{
                    textAlign: 'center', padding: '12px 8px',
                    borderRight: i < 3 ? '1px solid #F1F5F9' : 'none',
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>{d.value}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#64748B', marginTop: 4 }}>{d.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ═ RIGHT: Needs Attention + Activity + Quick Actions ═ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            {/* Needs Attention */}
            <div style={{
              background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8,
              borderLeft: '3px solid #EF4444', overflow: 'hidden', flexShrink: 0,
            }}>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Needs attention</span>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: '#DC2626', background: '#FEF2F2',
                  padding: '2px 8px', borderRadius: 10,
                }}>
                  {attentionItems.length}
                </span>
              </div>
              {attentionItems.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: '#64748B' }}>
                  All clear — no issues
                </div>
              ) : (
                attentionItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: item.danger ? '#FEF2F2' : '#FFFBEB',
                    }}>
                      <AlertTriangle size={12} color={item.danger ? '#DC2626' : '#D97706'} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>{item.title}</div>
                      <div style={{ fontSize: 12, fontWeight: 400, color: '#64748B' }}>{item.meta}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Activity Feed + Quick Actions */}
            <div style={{
              background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8,
              flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Activity</span>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {recentActivity.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#64748B' }}>
                    No recent activity
                  </div>
                ) : (
                  recentActivity.slice(0, 8).map((a, i) => {
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
                        padding: '8px 16px', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none',
                      }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, marginTop: 6, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 400, color: '#0F172A', lineHeight: 1.43 }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: '#2563EB' }}>{a.case_key}</span>
                            {' '}<span style={{ fontWeight: 600 }}>{verb}</span> in {a.cycle_key}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 400, color: '#64748B' }}>
                            {a.executed_by_name} · {formatTimeAgo(a.executed_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {/* Quick Actions — pinned bottom */}
              <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderTop: '1px solid #F1F5F9', flexShrink: 0 }}>
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
        .c10-row:hover { background: #F8FAFC; }
        .c10-row-danger:hover { background: #FEF2F2; }
        .c10-kpi:hover { border-color: #CBD5E1 !important; box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; }
        .c10-qbtn:hover { border-color: #2563EB !important; color: #2563EB !important; background: #EFF6FF !important; }
      `}</style>
    </div>
  );
}

// ── Sub-components ──

function KPICard({ label, value, accent, trend, subtitle, sparkData, valueColor }: {
  label: string;
  value: string | number;
  accent: string;
  trend: { direction: 'up' | 'down' | 'flat'; value: string; color: string };
  subtitle: string;
  sparkData: number[];
  valueColor?: string;
}) {
  return (
    <div className="c10-kpi" style={{
      background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8,
      borderLeft: `3px solid ${accent}`,
      padding: 16, cursor: 'pointer',
      transition: 'border-color 150ms, box-shadow 150ms',
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 36, fontWeight: 700, color: valueColor || '#0F172A', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {value}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: trend.color }}>
          {trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : ''} {trend.value}
        </span>
      </div>
      <Sparkline data={sparkData} color={accent} />
      <div style={{ fontSize: 12, fontWeight: 400, color: '#64748B', marginTop: 4 }}>{subtitle}</div>
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
  const bg = badgeDanger ? '#FEF2F2' : '#F1F5F9';
  const color = badgeDanger ? '#DC2626' : badgeColor || '#64748B';
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, ...style }}>
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{title}</span>
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', gap: 6 }}>
      {icon}
      <span style={{ fontSize: 13, color: '#64748B' }}>{text}</span>
    </div>
  );
}

function QuickBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="c10-qbtn" onClick={onClick} style={{
      flex: 1, height: 32, fontSize: 13, fontWeight: 500,
      color: '#334155', background: '#FFFFFF', border: '1px solid #E2E8F0',
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
