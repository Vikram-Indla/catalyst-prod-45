/**
 * Cycle Report Page — G5-07
 * Route: /testhub/cycles/:cycleId/report
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, CheckCircle2, XCircle, AlertTriangle,
  Clock, User, Calendar, BarChart3, Users, Flag, RefreshCw, SkipForward
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface TestCycle {
  id: string;
  cycle_key: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  progress_percent: number;
  total_cases: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  not_run_count: number;
  owner?: { full_name: string };
}

interface TesterStats {
  tester_id: string | null;
  tester_name: string;
  total_assigned: number;
  passed: number;
  failed: number;
  blocked: number;
  not_run: number;
  executed: number;
  pass_rate: number;
}

interface PriorityStats {
  priority: string;
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  not_run: number;
  executed: number;
  pass_rate: number;
}

interface FailureReasonStats {
  failure_reason: string;
  count: number;
}

interface DailyExecution {
  execution_date: string;
  passed: number;
  failed: number;
  blocked: number;
  total: number;
}

const STATUS_COLORS: Record<string, string> = {
  passed: '#10B981',
  failed: '#EF4444',
  blocked: '#F59E0B',
  skipped: '#64748B',
  not_run: '#CBD5E1',
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
  critical: { color: '#DC2626', bg: '#FEF2F2' },
  high: { color: '#EA580C', bg: '#FFF7ED' },
  medium: { color: '#D97706', bg: '#FFFBEB' },
  low: { color: '#059669', bg: '#ECFDF5' },
};

const FAILURE_REASON_LABELS: Record<string, string> = {
  bug: 'Bug / Defect',
  environment: 'Environment Issue',
  test_data: 'Test Data Issue',
  test_script: 'Test Script Error',
  timeout: 'Timeout',
  other: 'Other',
  unspecified: 'Unspecified',
};

export default function CycleReportPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();

  const [cycle, setCycle] = useState<TestCycle | null>(null);
  const [testerStats, setTesterStats] = useState<TesterStats[]>([]);
  const [priorityStats, setPriorityStats] = useState<PriorityStats[]>([]);
  const [failureReasons, setFailureReasons] = useState<FailureReasonStats[]>([]);
  const [dailyExecutions, setDailyExecutions] = useState<DailyExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReportData = async () => {
    if (!cycleId) return;
    setIsLoading(true);
    try {
      const [cycleRes, testerRes, priorityRes, failureRes, dailyRes] = await Promise.all([
        supabase
          .from('th_test_cycles')
          .select('*, owner:profiles!th_test_cycles_owner_id_fkey(full_name)')
          .eq('id', cycleId)
          .single(),
        supabase.rpc('get_cycle_stats_by_tester', { p_cycle_id: cycleId }),
        supabase.rpc('get_cycle_stats_by_priority', { p_cycle_id: cycleId }),
        supabase.rpc('get_cycle_failure_reasons', { p_cycle_id: cycleId }),
        supabase.rpc('get_cycle_daily_executions', { p_cycle_id: cycleId }),
      ]);

      if (cycleRes.data) setCycle(cycleRes.data as unknown as TestCycle);
      if (testerRes.data) setTesterStats(testerRes.data as unknown as TesterStats[]);
      if (priorityRes.data) setPriorityStats(priorityRes.data as unknown as PriorityStats[]);
      if (failureRes.data) setFailureReasons(failureRes.data as unknown as FailureReasonStats[]);
      if (dailyRes.data) setDailyExecutions(dailyRes.data as unknown as DailyExecution[]);
    } catch (err) {
      console.error('Fetch report error:', err);
      catalystToast.error('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchReportData(); }, [cycleId]);

  const statusData = cycle
    ? [
        { name: 'Passed', value: cycle.passed_count, color: STATUS_COLORS.passed },
        { name: 'Failed', value: cycle.failed_count, color: STATUS_COLORS.failed },
        { name: 'Blocked', value: cycle.blocked_count, color: STATUS_COLORS.blocked },
        { name: 'Skipped', value: cycle.skipped_count || 0, color: STATUS_COLORS.skipped },
        { name: 'Not Run', value: cycle.not_run_count, color: STATUS_COLORS.not_run },
      ].filter(d => d.value > 0)
    : [];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const executed = cycle ? cycle.total_cases - cycle.not_run_count : 0;
  const passRate = cycle && executed > 0
    ? Math.round((cycle.passed_count / executed) * 100)
    : 0;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: 'hsl(var(--background))' }}>
        <div style={{ width: 32, height: 32, border: '3px solid hsl(var(--border))', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!cycle) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'hsl(var(--muted-foreground))' }}>
        Cycle not found
      </div>
    );
  }

  const summaryCards = [
    { icon: FileText, label: 'Total Tests', value: cycle.total_cases, color: '#2563EB' },
    { icon: CheckCircle2, label: 'Pass Rate', value: `${passRate}%`, color: '#10B981' },
    { icon: BarChart3, label: 'Executed', value: executed, color: '#3B82F6' },
    { icon: XCircle, label: 'Failed', value: cycle.failed_count, color: '#EF4444' },
    { icon: AlertTriangle, label: 'Blocked', value: cycle.blocked_count, color: '#F59E0B' },
  ];

  const passRateColor = (rate: number) => rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : '#EF4444';

  const tableHeaderStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'hsl(var(--muted-foreground))',
    textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid hsl(var(--border))',
  };
  const tableCellStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: 13, color: 'hsl(var(--foreground))', borderBottom: '1px solid hsl(var(--border))',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'hsl(var(--background))', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '20px 32px', backgroundColor: 'hsl(var(--card))', borderBottom: '1px solid hsl(var(--border))' }}>
        <button
          onClick={() => navigate(`/testhub/cycles/${cycleId}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid hsl(var(--border))', borderRadius: 8, backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', fontSize: 13, cursor: 'pointer', marginBottom: 16 }}
        >
          <ArrowLeft size={16} /> Back to Cycle
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '4px 10px', borderRadius: 6 }}>{cycle.cycle_key}</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#64748B', backgroundColor: '#F1F5F9', padding: '4px 10px', borderRadius: 6, textTransform: 'capitalize' }}>{cycle.status}</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(var(--foreground))', margin: '0 0 8px' }}>{cycle.name} — Report</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} />{formatDate(cycle.start_date)} — {formatDate(cycle.end_date)}</span>
          {cycle.owner && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User size={14} />{cycle.owner.full_name}</span>}
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
          {summaryCards.map((card) => (
            <div key={card.label} style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: 20, textAlign: 'center' }}>
              <card.icon size={22} color={card.color} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--foreground))', margin: '0 0 4px' }}>{card.value}</p>
              <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: 0 }}>{card.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Status Distribution */}
          <div style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: 24 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))', margin: '0 0 16px' }}>Status Distribution</p>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
              {statusData.map((s) => (
                <span key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: s.color }} />
                  {s.name}: {s.value}
                </span>
              ))}
            </div>
          </div>

          {/* Execution Timeline */}
          <div style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: 24 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))', margin: '0 0 16px' }}>Execution Timeline</p>
            {dailyExecutions.length > 0 ? (
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyExecutions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="execution_date" tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="passed" stackId="a" fill="#10B981" />
                    <Bar dataKey="failed" stackId="a" fill="#EF4444" />
                    <Bar dataKey="blocked" stackId="a" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
                No execution data yet
              </div>
            )}
          </div>
        </div>

        {/* Breakdown Tables */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* By Tester */}
          <div style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Users size={16} color="hsl(var(--muted-foreground))" />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>By Tester</p>
            </div>
            {testerStats.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Tester</th>
                    <th style={tableHeaderStyle}>Assigned</th>
                    <th style={tableHeaderStyle}>Executed</th>
                    <th style={tableHeaderStyle}>Pass Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {testerStats.map((t, i) => (
                    <tr key={i}>
                      <td style={tableCellStyle}>{t.tester_name}</td>
                      <td style={tableCellStyle}>{t.total_assigned}</td>
                      <td style={tableCellStyle}>{t.executed}</td>
                      <td style={tableCellStyle}>
                        <span style={{ fontWeight: 600, color: passRateColor(t.pass_rate) }}>{t.pass_rate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', margin: 0 }}>No tester data</p>
            )}
          </div>

          {/* By Priority */}
          <div style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Flag size={16} color="hsl(var(--muted-foreground))" />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>By Priority</p>
            </div>
            {priorityStats.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Priority</th>
                    <th style={tableHeaderStyle}>Total</th>
                    <th style={tableHeaderStyle}>Executed</th>
                    <th style={tableHeaderStyle}>Pass Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {priorityStats.map((p, i) => {
                    const cfg = PRIORITY_CONFIG[p.priority] || PRIORITY_CONFIG.medium;
                    return (
                      <tr key={i}>
                        <td style={tableCellStyle}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, backgroundColor: cfg.bg, padding: '2px 10px', borderRadius: 6, textTransform: 'capitalize' }}>
                            {p.priority}
                          </span>
                        </td>
                        <td style={tableCellStyle}>{p.total}</td>
                        <td style={tableCellStyle}>{p.executed}</td>
                        <td style={tableCellStyle}>
                          <span style={{ fontWeight: 600, color: passRateColor(p.pass_rate) }}>{p.pass_rate}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', margin: 0 }}>No priority data</p>
            )}
          </div>
        </div>

        {/* Failure Reasons */}
        {failureReasons.length > 0 && (
          <div style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <XCircle size={16} color="#EF4444" />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>Failure Reasons</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {failureReasons.map((f, i) => (
                <div key={i} style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#DC2626', margin: '0 0 4px' }}>{f.count}</p>
                  <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>{FAILURE_REASON_LABELS[f.failure_reason] || f.failure_reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
