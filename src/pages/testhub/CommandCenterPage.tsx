/**
 * Command Center — TestHub Executive Dashboard (Group 16)
 * Route: /testhub/releases/command-center
 */
import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity, BarChart3, Package, CheckCircle2, XCircle,
  AlertTriangle, Users, TrendingUp, TrendingDown, Minus,
  Calendar, Clock, Pause, Play, Shield, Bug, Target,
  Flag, Zap, ChevronRight,
} from 'lucide-react';
import {
  useCommandCenterKPIs,
  useReleaseHealthGrid,
  useDefectTrends,
  useTeamPerformance,
  useUpcomingMilestones,
  useActivityFeed,
  type DefectTrendPoint,
} from '@/hooks/testhub/useCommandCenter';
import { format, formatDistanceToNow } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const PROJECT_ID = '40000000-0001-0001-0001-000000000001';

export default function CommandCenterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || PROJECT_ID;

  const { data: kpis, isLoading: kpisLoading } = useCommandCenterKPIs(projectId);
  const { releases, isLoading: healthLoading } = useReleaseHealthGrid(projectId);
  const [trendDays, setTrendDays] = useState(7);
  const { data: trends, isLoading: trendsLoading } = useDefectTrends(projectId, trendDays);
  const { data: team, isLoading: teamLoading } = useTeamPerformance(projectId);
  const { data: milestones, isLoading: milestonesLoading } = useUpcomingMilestones(projectId);
  const [feedPaused, setFeedPaused] = useState(false);
  const { items: activityItems, isLoading: activityLoading } = useActivityFeed(projectId, feedPaused);

  const execRate = kpis && kpis.total_test_cases > 0
    ? Math.round((kpis.executed_test_cases / kpis.total_test_cases) * 100)
    : 0;

  const passRate = kpis && kpis.executed_test_cases > 0
    ? Math.round((kpis.passed_test_cases / kpis.executed_test_cases) * 100)
    : 0;

  // Health donut data
  const healthCounts = useMemo(() => {
    const counts = { healthy: 0, at_risk: 0, critical: 0 };
    releases.forEach(r => {
      if (r.health === 'critical') counts.critical++;
      else if (r.health === 'at_risk') counts.at_risk++;
      else counts.healthy++;
    });
    return counts;
  }, [releases]);

  const donutData = [
    { name: 'Healthy', value: healthCounts.healthy, color: 'hsl(var(--chart-2))' },
    { name: 'At Risk', value: healthCounts.at_risk, color: 'hsl(var(--chart-4))' },
    { name: 'Critical', value: healthCounts.critical, color: 'hsl(var(--chart-5))' },
  ].filter(d => d.value > 0);

  return (
    <div className="th-page-content flex-1 overflow-auto p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
            <BarChart3 className="w-[22px] h-[22px] text-primary" />
            Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time quality visibility across all active releases
          </p>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Activity className="w-3 h-3" />
          Live
        </span>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          label="Active Releases"
          value={kpis?.active_releases ?? 0}
          icon={Package}
          loading={kpisLoading}
          color="primary"
        />
        <KPICard
          label="Pass Rate"
          value={`${passRate}%`}
          icon={CheckCircle2}
          loading={kpisLoading}
          color={passRate >= 80 ? 'success' : passRate >= 60 ? 'warning' : 'danger'}
        />
        <KPICard
          label="Execution Rate"
          value={`${execRate}%`}
          icon={Target}
          loading={kpisLoading}
          color={execRate >= 70 ? 'success' : 'warning'}
        />
        <KPICard
          label="Open Defects"
          value={kpis?.open_defects ?? 0}
          icon={Bug}
          loading={kpisLoading}
          color={(kpis?.open_defects ?? 0) > 20 ? 'danger' : 'muted'}
        />
        <KPICard
          label="Critical Blockers"
          value={kpis?.critical_defects ?? 0}
          icon={AlertTriangle}
          loading={kpisLoading}
          color={(kpis?.critical_defects ?? 0) > 0 ? 'danger' : 'success'}
        />
        <KPICard
          label="Active Testers"
          value={kpis?.active_testers ?? 0}
          icon={Users}
          loading={kpisLoading}
          color="primary"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Health Donut */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Release Health</h3>
          {healthLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
          ) : releases.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No active releases</div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="hsl(var(--card))"
                    >
                      {donutData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-3">
                <LegendItem color="hsl(var(--chart-2))" label="Healthy" count={healthCounts.healthy} />
                <LegendItem color="hsl(var(--chart-4))" label="At Risk" count={healthCounts.at_risk} />
                <LegendItem color="hsl(var(--chart-5))" label="Critical" count={healthCounts.critical} />
              </div>
            </div>
          )}
        </div>

        {/* Defect Trends */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Defect Trends</h3>
            <div className="flex border border-border rounded-lg overflow-hidden">
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setTrendDays(d)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                    trendDays === d
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>
          {trendsLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => format(new Date(v), 'MMM d')}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelFormatter={(v) => format(new Date(v), 'MMM d, yyyy')}
                  />
                  <Line
                    type="monotone"
                    dataKey="opened"
                    stroke="hsl(var(--chart-5))"
                    strokeWidth={2}
                    dot={false}
                    name="Opened"
                  />
                  <Line
                    type="monotone"
                    dataKey="closed"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={false}
                    name="Closed"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-0.5 rounded" style={{ background: 'hsl(var(--chart-5))' }} /> Opened
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-0.5 rounded" style={{ background: 'hsl(var(--chart-2))' }} /> Closed
            </span>
          </div>
        </div>
      </div>

      {/* Release Health Grid */}
      {releases.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Active Releases</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {releases.map(r => (
              <ReleaseHealthCard key={r.id} release={r} onClick={() => navigate(`/testhub/releases/${r.id}`)} />
            ))}
          </div>
        </div>
      )}

      {/* Bottom Row: Activity + Team + Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Feed */}
        <div className="bg-card border border-border rounded-xl p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Live Activity
            </h3>
            <button
              onClick={() => setFeedPaused(!feedPaused)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
              title={feedPaused ? 'Resume' : 'Pause'}
            >
              {feedPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          </div>
          {activityLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : activityItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No recent activity
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {activityItems.map(item => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Team Leaderboard */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-primary" />
            Team Performance
          </h3>
          {teamLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : team.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No team data for this period
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {team.map((member, idx) => (
                <div key={member.id} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-muted-foreground text-right">
                    {idx + 1}.
                  </span>
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                      {member.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{member.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {member.tests_executed} tests · {member.pass_rate}% pass rate
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Milestones */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Flag className="w-4 h-4 text-primary" />
            Upcoming Milestones
          </h3>
          {milestonesLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : milestones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Flag className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No upcoming milestones
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {milestones.map(ms => {
                const daysLeft = ms.target_date
                  ? Math.ceil((new Date(ms.target_date).getTime() - Date.now()) / 86400000)
                  : null;
                const isOverdue = daysLeft !== null && daysLeft < 0;
                return (
                  <div key={ms.id} className="flex items-start gap-3 py-1.5">
                    <MilestoneTypeIcon type={ms.milestone_type} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{ms.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {ms.release_version && <span className="font-mono">{ms.release_version}</span>}
                        {ms.target_date && ` · ${format(new Date(ms.target_date), 'MMM d')}`}
                      </div>
                    </div>
                    {daysLeft !== null && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isOverdue
                          ? 'bg-destructive/10 text-destructive'
                          : daysLeft <= 3
                          ? 'bg-chart-4/10 text-chart-4'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  primary: 'text-primary',
  success: 'text-chart-2',
  warning: 'text-chart-4',
  danger: 'text-destructive',
  muted: 'text-foreground',
};

function KPICard({ label, value, icon: Icon, loading, color }: {
  label: string;
  value: number | string;
  icon: any;
  loading: boolean;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${COLOR_MAP[color] || 'text-muted-foreground'}`} />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className={`text-2xl font-bold tabular-nums ${COLOR_MAP[color] || ''}`}>
        {loading ? '—' : value}
      </div>
    </div>
  );
}

function LegendItem({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full" style={{ background: color }} />
      <span className="text-sm text-foreground">{count}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function ReleaseHealthCard({ release, onClick }: { release: any; onClick: () => void }) {
  const execPct = release.test_cases_total > 0
    ? Math.round((release.test_cases_executed / release.test_cases_total) * 100)
    : 0;

  const healthColors: Record<string, string> = {
    healthy: 'border-l-chart-2',
    at_risk: 'border-l-chart-4',
    critical: 'border-l-destructive',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${healthColors[release.health] || 'border-l-muted'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-xs font-mono text-muted-foreground">{release.version}</span>
          <h4 className="text-sm font-semibold text-foreground">{release.name}</h4>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all bg-primary"
          style={{ width: `${execPct}%` }}
        />
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span>{release.test_cases_passed}/{release.test_cases_total} passed</span>
        {release.defects_open > 0 && (
          <span className="text-destructive font-medium">{release.defects_open} defects</span>
        )}
      </div>
    </div>
  );
}

const ACTIVITY_ICONS: Record<string, any> = {
  test_passed: CheckCircle2,
  test_failed: XCircle,
  test_blocked: Shield,
  defect_created: Bug,
  defect_resolved: CheckCircle2,
  cycle_started: Zap,
  cycle_completed: Flag,
  release_updated: Package,
};

const ACTIVITY_COLORS: Record<string, string> = {
  test_passed: 'text-chart-2',
  test_failed: 'text-destructive',
  test_blocked: 'text-chart-4',
  defect_created: 'text-destructive',
  defect_resolved: 'text-chart-2',
  cycle_started: 'text-primary',
  cycle_completed: 'text-chart-2',
  release_updated: 'text-primary',
};

function ActivityRow({ item }: { item: any }) {
  const Icon = ACTIVITY_ICONS[item.type] || Activity;
  const colorClass = ACTIVITY_COLORS[item.type] || 'text-muted-foreground';

  return (
    <div className="flex items-start gap-3 py-1">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${colorClass}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{item.message}</p>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

function MilestoneTypeIcon({ type }: { type: string }) {
  const icons: Record<string, any> = {
    code_freeze: Shield,
    feature_complete: CheckCircle2,
    qa_start: Zap,
    qa_complete: CheckCircle2,
    uat_start: Target,
    uat_complete: CheckCircle2,
    go_live: Zap,
    custom: Flag,
  };
  const Icon = icons[type] || Flag;
  return <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />;
}
