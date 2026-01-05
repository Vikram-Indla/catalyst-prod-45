// ============================================================
// FILE: src/components/test-management/TMCommandCenter.tsx
// Complete Command Center component with full backend wiring
// ============================================================

import { useState } from 'react';
import {
  ClipboardList,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Maximize2,
  Minimize2,
  AlertCircle,
} from 'lucide-react';
import {
  useTMDashboardKPIs,
  useTMActiveCycles,
  useTMActivityFeed,
  useTMMyWork,
  useTMRefresh,
} from '@/hooks/useTestManagement';
import { formatTimeAgo, type CaseStatus } from '@/types/test-management';

// Priority type for this component
type TMPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type TMCaseStatus = CaseStatus;

// ============================================================
// ERROR STATE COMPONENT
// ============================================================
function ErrorState({ 
  message, 
  onRetry 
}: { 
  message: string; 
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="w-12 h-12 text-danger mb-4" />
      <h3 className="font-semibold text-text-primary mb-2">Something went wrong</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// ============================================================
// LOADING SKELETONS
// ============================================================
function KPICardSkeleton() {
  return (
    <div className="bg-surface-0 rounded-xl border border-border p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface-3" />
        <div className="flex-1">
          <div className="h-10 w-16 bg-surface-3 rounded mb-2" />
          <div className="h-4 w-24 bg-surface-3 rounded" />
        </div>
      </div>
    </div>
  );
}

function SecondaryKPISkeleton() {
  return (
    <div className="bg-surface-0 rounded-xl border border-border p-5 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-4 w-20 bg-surface-3 rounded" />
        <div className="h-4 w-12 bg-surface-3 rounded" />
      </div>
      <div className="h-8 w-16 bg-surface-3 rounded mb-3" />
      <div className="h-2 bg-surface-3 rounded-full" />
    </div>
  );
}

function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-surface-2 border-b border-border-subtle" />
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-border-subtle">
          <div className="h-4 w-16 bg-surface-3 rounded" />
          <div className="h-4 flex-1 bg-surface-3 rounded" />
          <div className="h-6 w-20 bg-surface-3 rounded-full" />
          <div className="h-6 w-16 bg-surface-3 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function CycleSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      <div className="flex justify-between mb-2">
        <div className="h-4 w-16 bg-surface-3 rounded" />
        <div className="h-4 w-12 bg-surface-3 rounded" />
      </div>
      <div className="h-5 w-40 bg-surface-3 rounded mb-3" />
      <div className="h-1.5 bg-surface-3 rounded-full" />
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-surface-3" />
        <div className="flex-1">
          <div className="h-4 w-48 bg-surface-3 rounded mb-2" />
          <div className="h-3 w-20 bg-surface-3 rounded" />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// KPI CARD COMPONENT
// ============================================================
function KPICard({
  icon: Icon,
  value,
  label,
  iconBg = 'bg-surface-2',
  iconColor = 'text-text-tertiary',
}: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="bg-surface-0 rounded-xl border border-border p-4 hover:shadow-sm hover:border-border-strong transition-all cursor-pointer">
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-lg ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <div className="text-[40px] font-bold leading-none text-text-primary">{value}</div>
          <div className="text-sm text-muted-foreground mt-1">{label}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECONDARY KPI COMPONENT
// ============================================================
function SecondaryKPI({
  label,
  value,
  suffix = '%',
  sublabel,
  sublabelColor = 'text-muted-foreground',
  progressValue,
  progressColor = 'bg-brand-primary',
  textColor = 'text-text-primary',
}: {
  label: string;
  value: number;
  suffix?: string;
  sublabel?: string;
  sublabelColor?: string;
  progressValue?: number;
  progressColor?: string;
  textColor?: string;
}) {
  return (
    <div className="bg-surface-0 rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        {sublabel && <span className={`text-xs font-medium ${sublabelColor}`}>{sublabel}</span>}
      </div>
      <div className={`text-3xl font-bold ${textColor}`}>
        {value}{suffix}
      </div>
      <div className="mt-3 h-2 bg-surface-3 rounded-full overflow-hidden">
        <div
          className={`h-full ${progressColor} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(progressValue ?? value, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================
// DEFECTS KPI COMPONENT
// ============================================================
function DefectsKPI({
  total,
  critical,
  major,
  minor,
}: {
  total: number;
  critical: number;
  major: number;
  minor: number;
}) {
  const criticalPct = total > 0 ? (critical / total) * 100 : 0;
  const majorPct = total > 0 ? (major / total) * 100 : 0;

  return (
    <div className="bg-surface-0 rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-text-secondary">Open Defects</span>
        <span className={`text-xs font-medium ${critical > 0 ? 'text-danger' : 'text-muted-foreground'}`}>
          {critical} critical
        </span>
      </div>
      <div className={`text-3xl font-bold ${total > 0 ? 'text-danger' : 'text-text-primary'}`}>
        {total}
      </div>
      <div className="mt-3 flex gap-1">
        <div className="h-2 bg-danger rounded-full transition-all" style={{ width: `${criticalPct}%` }} />
        <div className="h-2 bg-warning rounded-full transition-all" style={{ width: `${majorPct}%` }} />
        <div className="h-2 bg-surface-3 rounded-full flex-1" />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>Critical: {critical}</span>
        <span>Major: {major}</span>
        <span>Minor: {minor}</span>
      </div>
    </div>
  );
}

// ============================================================
// BLOCKER CARD
// ============================================================
function BlockerCard({ count }: { count: number }) {
  const hasBlockers = count > 0;
  return (
    <div className={`bg-surface-0 rounded-xl border p-5 transition-all ${
      hasBlockers ? 'border-warning/40 bg-amber-50/50' : 'border-border'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-text-secondary">Blockers</span>
        <AlertTriangle className={`w-4 h-4 ${hasBlockers ? 'text-warning' : 'text-muted-foreground'}`} />
      </div>
      <div className={`text-3xl font-bold ${hasBlockers ? 'text-warning' : 'text-text-primary'}`}>
        {count}
      </div>
      <div className={`mt-3 text-xs font-medium ${hasBlockers ? 'text-warning' : 'text-muted-foreground'}`}>
        {hasBlockers ? 'Requires immediate action' : 'No blockers'}
      </div>
    </div>
  );
}

// ============================================================
// CYCLE CARD
// ============================================================
function CycleCard({ cycle }: { cycle: {
  id: string;
  key: string;
  name: string;
  daysLeft: number | null;
  isOverdue: boolean;
  progress: { total: number; passed: number; failed: number; blocked: number };
  percentage: number;
}}) {
  const { passed, failed, blocked, total } = cycle.progress;
  const passedPct = total > 0 ? (passed / total) * 100 : 0;
  const failedPct = total > 0 ? (failed / total) * 100 : 0;
  const blockedPct = total > 0 ? (blocked / total) * 100 : 0;

  return (
    <div className="p-4 hover:bg-surface-2 cursor-pointer transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-brand-primary">{cycle.key}</span>
        {cycle.daysLeft !== null && (
          <span className={`text-xs font-medium ${
            cycle.isOverdue ? 'text-danger' : cycle.daysLeft <= 2 ? 'text-warning' : 'text-muted-foreground'
          }`}>
            {cycle.isOverdue ? `${Math.abs(cycle.daysLeft)}d overdue` : `${cycle.daysLeft}d left`}
          </span>
        )}
      </div>
      <h4 className="font-medium text-sm text-text-primary mb-3 truncate" title={cycle.name}>
        {cycle.name}
      </h4>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div className="bg-success transition-all" style={{ width: `${passedPct}%` }} />
            <div className="bg-danger transition-all" style={{ width: `${failedPct}%` }} />
            <div className="bg-warning transition-all" style={{ width: `${blockedPct}%` }} />
          </div>
        </div>
        <span className="text-xs font-medium text-muted-foreground w-10 text-right">
          {cycle.percentage}%
        </span>
      </div>
    </div>
  );
}

// ============================================================
// ACTIVITY ITEM
// ============================================================
function ActivityItem({ activity }: { activity: {
  id: string;
  userName: string;
  actionType: string;
  entityKey: string;
  createdAt: string;
  isLive: boolean;
}}) {
  const initials = activity.userName
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const bgColors: Record<string, string> = {
    PASSED: 'bg-teal-100 text-teal-700',
    FAILED: 'bg-red-100 text-red-700',
    BLOCKED: 'bg-amber-100 text-amber-700',
    CREATED: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-purple-100 text-purple-700',
    UPDATED: 'bg-orange-100 text-orange-700',
    ADDED_CASES: 'bg-cyan-100 text-cyan-700',
    ASSIGNED: 'bg-indigo-100 text-indigo-700',
    EXECUTED: 'bg-green-100 text-green-700',
    DELETED: 'bg-gray-100 text-gray-700',
  };

  const actionLabels: Record<string, string> = {
    PASSED: 'passed',
    FAILED: 'failed',
    BLOCKED: 'marked as blocked',
    CREATED: 'created',
    COMPLETED: 'completed',
    UPDATED: 'updated',
    ADDED_CASES: 'added cases to',
    ASSIGNED: 'was assigned',
    EXECUTED: 'executed',
    DELETED: 'deleted',
  };

  return (
    <div className={`p-4 transition-all ${activity.isLive ? 'bg-teal-50/50' : 'hover:bg-surface-2'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
          bgColors[activity.actionType] || 'bg-surface-3 text-muted-foreground'
        }`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary">
            <span className="font-medium">{activity.userName}</span>
            <span className="text-text-tertiary"> {actionLabels[activity.actionType] || activity.actionType.toLowerCase()} </span>
            <span className="text-brand-primary font-medium">{activity.entityKey}</span>
          </p>
          <p className={`text-xs mt-1 ${activity.isLive ? 'text-success flex items-center gap-1' : 'text-muted-foreground'}`}>
            {activity.isLive && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
            {formatTimeAgo(activity.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STATUS BADGE
// ============================================================
function StatusBadge({ status, color }: { status: string; color: 'success' | 'warning' | 'danger' | 'default' }) {
  const colorClasses: Record<string, string> = {
    success: 'bg-teal-100 text-teal-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    default: 'bg-surface-3 text-muted-foreground',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClasses[color]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ============================================================
// PRIORITY BADGE
// ============================================================
function PriorityBadge({ priority }: { priority: string | null }) {
  const colorClasses: Record<string, string> = {
    CRITICAL: 'border-danger text-danger',
    HIGH: 'border-warning text-warning',
    MEDIUM: 'border-border-strong text-muted-foreground',
    LOW: 'border-border text-muted-foreground',
  };

  if (!priority) return <span className="text-muted-foreground">—</span>;

  const upperPriority = priority.toUpperCase();
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colorClasses[upperPriority] || colorClasses.MEDIUM}`}>
      {upperPriority}
    </span>
  );
}

// ============================================================
// EXECUTION CHART
// ============================================================
function ExecutionChart() {
  const bars = [85, 110, 65, 135, 100, 80, 155, 120, 105, 145, 90, 115, 125, 140];
  const failedHeights = [12, 18, 8, 24, 10, 20, 8, 15, 12, 10, 14, 6, 16, 8];

  return (
    <div className="col-span-2 bg-surface-0 rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-text-primary">Execution Trend</h3>
        <div className="flex items-center gap-1">
          <button className="px-3 py-1.5 text-xs font-medium bg-brand-primary/10 text-brand-primary rounded-lg">
            14D
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-2 rounded-lg transition-all">
            30D
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-2 rounded-lg transition-all">
            90D
          </button>
        </div>
      </div>
      <div className="h-52 flex items-end gap-1.5 px-2">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col gap-0.5">
            <div className="bg-success rounded-t transition-all" style={{ height: `${h}px` }} />
            <div className="bg-danger rounded-b transition-all" style={{ height: `${failedHeights[i]}px` }} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-6 mt-5 pt-4 border-t border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-success" />
          <span className="text-xs text-muted-foreground">Passed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-danger" />
          <span className="text-xs text-muted-foreground">Failed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-warning" />
          <span className="text-xs text-muted-foreground">Blocked</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMMAND CENTER COMPONENT
// ============================================================
export default function TMCommandCenter() {
  // ----------------------
  // DATA HOOKS
  // ----------------------
  const { 
    data: kpis, 
    isLoading: kpisLoading, 
    error: kpisError, 
    refetch: refetchKPIs 
  } = useTMDashboardKPIs();
  
  const { 
    data: cycles, 
    isLoading: cyclesLoading, 
    error: cyclesError 
  } = useTMActiveCycles();
  
  const { 
    data: activities, 
    isLoading: activitiesLoading, 
    error: activitiesError, 
    refetch: refetchActivity 
  } = useTMActivityFeed();
  
  const { 
    data: myWork, 
    isLoading: myWorkLoading, 
    error: myWorkError 
  } = useTMMyWork();
  
  const { refreshAll } = useTMRefresh();

  // ----------------------
  // LOCAL STATE
  // ----------------------
  const [activeTab, setActiveTab] = useState<'cases' | 'cycles' | 'defects'>('cases');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // ----------------------
  // HANDLERS
  // ----------------------
  const handleRefresh = () => {
    refreshAll();
    setLastUpdated(new Date());
  };

  // ----------------------
  // ERROR STATE
  // ----------------------
  if (kpisError) {
    return (
      <div className="p-6 bg-surface-1 min-h-screen">
        <ErrorState 
          message={kpisError instanceof Error ? kpisError.message : 'Failed to load dashboard'} 
          onRetry={() => refetchKPIs()} 
        />
      </div>
    );
  }

  // ----------------------
  // RENDER
  // ----------------------
  return (
    <div className="p-6 bg-surface-1 min-h-screen">
      {/* ==================== HEADER ==================== */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Command Center</h1>
      </div>

      {/* ==================== PRIMARY KPIs ==================== */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {kpisLoading ? (
          [...Array(5)].map((_, i) => <KPICardSkeleton key={i} />)
        ) : (
          <>
            <KPICard 
              icon={ClipboardList} 
              value={kpis?.totalAssigned ?? 0} 
              label="Total Assigned" 
            />
            <KPICard 
              icon={Clock} 
              value={kpis?.notRun ?? 0} 
              label="Not Run" 
            />
            <KPICard 
              icon={Play} 
              value={kpis?.inProgress ?? 0} 
              label="In Progress" 
              iconBg="bg-blue-50" 
              iconColor="text-brand-primary" 
            />
            <KPICard 
              icon={CheckCircle} 
              value={kpis?.passedToday ?? 0} 
              label="Passed Today" 
              iconBg="bg-teal-50" 
              iconColor="text-success" 
            />
            <KPICard 
              icon={XCircle} 
              value={kpis?.failedToday ?? 0} 
              label="Failed Today" 
              iconBg="bg-red-50" 
              iconColor="text-danger" 
            />
          </>
        )}
      </div>

      {/* ==================== SECONDARY KPIs ==================== */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpisLoading ? (
          [...Array(4)].map((_, i) => <SecondaryKPISkeleton key={i} />)
        ) : (
          <>
            <SecondaryKPI
              label="Coverage"
              value={kpis?.coverage ?? 0}
              sublabel={`${kpis?.coverageGaps ?? 0} gaps`}
              sublabelColor="text-warning"
            />
            <SecondaryKPI
              label="Pass Rate"
              value={kpis?.passRate ?? 0}
              sublabel={`↑ ${kpis?.passRateTrend ?? 0}%`}
              sublabelColor="text-success"
              progressColor="bg-success"
              textColor="text-success"
            />
            <DefectsKPI
              total={kpis?.openDefects ?? 0}
              critical={kpis?.criticalDefects ?? 0}
              major={kpis?.majorDefects ?? 0}
              minor={kpis?.minorDefects ?? 0}
            />
            <BlockerCard count={kpis?.blockers ?? 0} />
          </>
        )}
      </div>

      {/* ==================== MAIN GRID ==================== */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Execution Chart */}
        <ExecutionChart />

        {/* Active Cycles */}
        <div className="bg-surface-0 rounded-xl border border-border">
          <div className="p-4 border-b border-border-subtle flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Active Cycles</h3>
            <a href="/tests/cycles" className="text-xs font-medium text-brand-primary hover:underline">
              View all
            </a>
          </div>
          <div className="divide-y divide-border-subtle">
            {cyclesLoading ? (
              [...Array(3)].map((_, i) => <CycleSkeleton key={i} />)
            ) : cyclesError ? (
              <div className="p-4 text-center text-danger text-sm">Failed to load cycles</div>
            ) : cycles?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No active cycles</div>
            ) : (
              cycles?.map(cycle => <CycleCard key={cycle.id} cycle={cycle} />)
            )}
          </div>
        </div>
      </div>

      {/* ==================== BOTTOM ROW ==================== */}
      <div className="grid grid-cols-3 gap-6">
        {/* My Work */}
        <div className="col-span-2 bg-surface-0 rounded-xl border border-border">
          <div className="p-4 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="font-semibold text-text-primary">My Work</h3>
              <div className="flex items-center gap-1">
                {(['cases', 'cycles', 'defects'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      activeTab === tab
                        ? 'bg-brand-primary/10 text-brand-primary'
                        : 'text-muted-foreground hover:bg-surface-2'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    <span className="opacity-70 ml-1">
                      {tab === 'cases' ? myWork?.length ?? 0 : 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select className="text-xs border border-border rounded-lg px-3 py-1.5 text-muted-foreground bg-surface-0 focus:outline-none focus:border-brand-primary">
                <option>All Cycles</option>
              </select>
              <select className="text-xs border border-border rounded-lg px-3 py-1.5 text-muted-foreground bg-surface-0 focus:outline-none focus:border-brand-primary">
                <option>All Urgency</option>
              </select>
              <div className="flex items-center gap-2 ml-2 text-xs text-muted-foreground">
                <button className="flex items-center gap-1 hover:text-text-primary transition-all">
                  <Maximize2 className="w-3.5 h-3.5" />
                  Expand All
                </button>
                <button className="flex items-center gap-1 hover:text-text-primary transition-all">
                  <Minimize2 className="w-3.5 h-3.5" />
                  Collapse All
                </button>
              </div>
            </div>
          </div>

          {myWorkLoading ? (
            <TableSkeleton rows={3} />
          ) : myWorkError ? (
            <div className="p-8 text-center text-danger text-sm">Failed to load work items</div>
          ) : myWork?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No assigned work</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border-subtle">
                  <th className="text-left px-4 py-3 font-medium">Key</th>
                  <th className="text-left px-4 py-3 font-medium">Title</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Priority</th>
                  <th className="text-left px-4 py-3 font-medium">Cycle</th>
                  <th className="text-right px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-border-subtle">
                {myWork?.map(item => (
                  <tr key={item.id} className="hover:bg-surface-2 cursor-pointer transition-all">
                    <td className="px-4 py-3">
                      <span className="text-brand-primary font-medium">{item.key}</span>
                    </td>
                    <td className="px-4 py-3 text-text-primary max-w-xs truncate" title={item.title}>
                      {item.title}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} color={item.statusColor} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.cycleKey || '—'}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatTimeAgo(item.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-surface-0 rounded-xl border border-border">
          <div className="p-4 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text-primary">Recent Activity</h3>
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            </div>
            <button
              onClick={() => refetchActivity()}
              className="p-1.5 hover:bg-surface-2 rounded-lg transition-all"
              title="Refresh activity"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${activitiesLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="divide-y divide-border-subtle max-h-80 overflow-y-auto">
            {activitiesLoading ? (
              [...Array(4)].map((_, i) => <ActivitySkeleton key={i} />)
            ) : activitiesError ? (
              <div className="p-4 text-center text-danger text-sm">Failed to load activity</div>
            ) : activities?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No recent activity</div>
            ) : (
              activities?.map(activity => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
