/**
 * Test Management Command Center
 * Enterprise-grade dashboard for QA leadership and test managers
 * Catalyst V5 Theme: Blue primary, Teal success, Orange warning, Red danger
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Clock, 
  PlayCircle, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Maximize2,
  Minimize2,
  Circle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { 
  useCommandCenterKPIs, 
  useActiveCycles, 
  useActivityFeed,
  useMyWork 
} from '../hooks/useCommandCenter';
import { cn } from '@/lib/utils';

// ============================================================
// SUB-COMPONENTS - Catalyst V5 Semantic Colors
// ============================================================

interface KPICardProps {
  icon: React.ElementType;
  value: number | string;
  label: string;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info';
}

function KPICard({ icon: Icon, value, label, variant = 'default' }: KPICardProps) {
  const iconStyles = {
    default: 'text-muted-foreground',
    success: 'text-teal-500',
    danger: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-blue-500',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-border/80 transition-colors">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted">
          <Icon className={cn('h-5 w-5', iconStyles[variant])} />
        </div>
        <div className="flex-1">
          <p className="text-3xl font-semibold text-foreground tracking-tight">{value}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
}

interface SecondaryKPIProps {
  label: string;
  value: number;
  suffix?: string;
  sublabel?: string;
  progressValue?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  children?: React.ReactNode;
}

function SecondaryKPI({
  label,
  value,
  suffix = '%',
  sublabel,
  progressValue,
  variant = 'default',
  children,
}: SecondaryKPIProps) {
  const progressStyles = {
    default: 'bg-muted-foreground',
    success: 'bg-teal-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {sublabel && <span className="text-xs text-muted-foreground/70">{sublabel}</span>}
      </div>
      <p className="text-2xl font-semibold text-foreground mb-3">
        {value}{suffix}
      </p>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', progressStyles[variant])}
          style={{ width: `${progressValue ?? value}%` }}
        />
      </div>
      {children}
    </div>
  );
}

function DefectsKPI({ 
  openDefects, 
  criticalDefects, 
  majorDefects, 
  minorDefects 
}: { 
  openDefects: number; 
  criticalDefects: number; 
  majorDefects: number; 
  minorDefects: number;
}) {
  const total = criticalDefects + majorDefects + minorDefects || 1;
  const critPct = (criticalDefects / total) * 100;
  const majorPct = (majorDefects / total) * 100;
  const minorPct = (minorDefects / total) * 100;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">Open Defects</span>
        <span className={cn(
          "text-xs font-medium",
          criticalDefects > 0 ? "text-red-500" : "text-muted-foreground/70"
        )}>
          {criticalDefects} critical
        </span>
      </div>
      <p className="text-2xl font-semibold text-foreground mb-3">{openDefects}</p>
      <div className="h-2 bg-muted rounded-full overflow-hidden flex">
        {/* Critical = Red, Major = Orange, Minor = Gray */}
        <div className="h-full bg-red-500 transition-all" style={{ width: `${critPct}%` }} />
        <div className="h-full bg-amber-500 transition-all" style={{ width: `${majorPct}%` }} />
        <div className="h-full bg-muted-foreground/50 transition-all" style={{ width: `${minorPct}%` }} />
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Critical: {criticalDefects}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Major: {majorDefects}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
          Minor: {minorDefects}
        </span>
      </div>
    </div>
  );
}

function BlockerCard({ count }: { count: number }) {
  const hasBlockers = count > 0;
  
  return (
    <div className={cn(
      "bg-card border rounded-xl p-5",
      hasBlockers ? "border-red-500/50" : "border-border"
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">Blockers</span>
        <AlertTriangle className={cn(
          "h-4 w-4",
          hasBlockers ? "text-red-500" : "text-muted-foreground/50"
        )} />
      </div>
      <p className={cn(
        "text-2xl font-semibold",
        hasBlockers ? "text-red-500" : "text-foreground"
      )}>{count}</p>
      {hasBlockers && (
        <p className="text-xs text-red-500 mt-1">Requires immediate action</p>
      )}
    </div>
  );
}

function CycleCard({ cycle }: { cycle: any }) {
  const { passed, failed, blocked, total } = cycle.progress;
  const passedPct = total > 0 ? (passed / total) * 100 : 0;
  const failedPct = total > 0 ? (failed / total) * 100 : 0;
  const blockedPct = total > 0 ? (blocked / total) * 100 : 0;

  return (
    <div className="p-4 hover:bg-muted/50 rounded-lg transition-colors border-b border-border/50 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-foreground">{cycle.key}</span>
        {cycle.daysLeft !== null && (
          <span className={cn(
            "text-xs font-medium",
            cycle.daysLeft <= 3 ? "text-amber-500" : "text-muted-foreground"
          )}>
            {cycle.daysLeft}d left
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-foreground mb-3">{cycle.name}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden flex">
          {/* Passed = Teal, Failed = Red, Blocked = Orange */}
          <div className="h-full bg-teal-500 transition-all" style={{ width: `${passedPct}%` }} />
          <div className="h-full bg-red-500 transition-all" style={{ width: `${failedPct}%` }} />
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${blockedPct}%` }} />
        </div>
        <span className="text-xs font-medium text-muted-foreground w-10 text-right">{cycle.percentage}%</span>
      </div>
    </div>
  );
}

function ActivityItem({ activity, isFirst }: { activity: any; isFirst?: boolean }) {
  const initials = activity.user_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '??';
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true });

  // Action colors based on type
  const getActionColor = (type: string) => {
    if (type.includes('PASSED') || type.includes('COMPLETE')) return 'text-teal-500';
    if (type.includes('FAILED') || type.includes('REJECT')) return 'text-red-500';
    if (type.includes('BLOCK')) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 bg-muted text-muted-foreground">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            <span className="font-medium">{activity.user_name}</span>
            <span className={cn("mx-1", getActionColor(activity.action_type))}>
              {activity.action_type.toLowerCase().replace('_', ' ')}
            </span>
            <span className="font-medium text-foreground">{activity.entity_key}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            {isFirst && <Circle className="h-2 w-2 fill-teal-500 text-teal-500" />}
            {isFirst ? 'Just now' : timeAgo}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getStatusStyles = (s: string) => {
    const normalized = s.toUpperCase();
    if (normalized.includes('PASS')) return 'bg-teal-500/10 text-teal-500 border-teal-500/30';
    if (normalized.includes('FAIL')) return 'bg-red-500/10 text-red-500 border-red-500/30';
    if (normalized.includes('BLOCK')) return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    if (normalized.includes('PROGRESS') || normalized.includes('RUN')) return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
      getStatusStyles(status)
    )}>
      {status.replace('_', ' ')}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const getPriorityStyles = (p: string) => {
    switch (p.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'HIGH': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      case 'MEDIUM': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
      getPriorityStyles(priority)
    )}>
      {priority}
    </span>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function CommandCenterPage() {
  const navigate = useNavigate();
  const { data: kpis, isLoading: kpisLoading, refetch: refetchKPIs } = useCommandCenterKPIs();
  const { data: cycles, isLoading: cyclesLoading } = useActiveCycles();
  const { data: activities, isLoading: activitiesLoading, refetch: refetchActivity } = useActivityFeed();
  const { data: myWork, isLoading: myWorkLoading } = useMyWork();

  const [activeTab, setActiveTab] = useState<'cases' | 'cycles' | 'defects'>('cases');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const handleRefresh = () => {
    refetchKPIs();
    refetchActivity();
  };

  const handleExpandAll = () => {
    if (myWork && myWork.length > 0) {
      setExpandedRows(new Set(myWork.map(item => item.id)));
    }
  };

  const handleCollapseAll = () => {
    setExpandedRows(new Set());
  };

  const handleViewAllCycles = () => {
    navigate('/tests/cycles');
  };

  const handleViewAllActivity = () => {
    navigate('/tests/my-work');
  };

  if (kpisLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-10 bg-muted rounded w-48" />
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">

      {/* Primary KPIs - V5 semantic icons */}
      <div className="grid grid-cols-5 gap-4">
        <KPICard icon={ClipboardList} value={kpis?.totalAssigned || 0} label="Total Assigned" variant="info" />
        <KPICard icon={Clock} value={kpis?.notRun || 0} label="Not Run" />
        <KPICard icon={PlayCircle} value={kpis?.inProgress || 0} label="In Progress" variant="info" />
        <KPICard icon={CheckCircle} value={kpis?.passedToday || 0} label="Passed Today" variant="success" />
        <KPICard icon={XCircle} value={kpis?.failedToday || 0} label="Failed Today" variant="danger" />
      </div>

      {/* Secondary KPIs - V5 semantic progress bars */}
      <div className="grid grid-cols-4 gap-4">
        <SecondaryKPI 
          label="Coverage" 
          value={kpis?.coverage || 0} 
          sublabel={`${kpis?.coverageGaps || 0} gaps`}
          variant="success"
        />
        <SecondaryKPI 
          label="Pass Rate" 
          value={kpis?.passRate || 0} 
          sublabel={`↑${kpis?.passRateTrend || 0}%`}
          variant="success"
        />
        <DefectsKPI 
          openDefects={kpis?.openDefects || 0}
          criticalDefects={kpis?.criticalDefects || 0}
          majorDefects={kpis?.majorDefects || 0}
          minorDefects={kpis?.minorDefects || 0}
        />
        <BlockerCard count={kpis?.blockers || 0} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Chart - V5 semantic colors for states */}
        <div className="col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Execution Trend</h2>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button className="px-3 py-1 text-xs font-medium rounded-md bg-card text-foreground shadow-sm">14D</button>
              <button className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground">30D</button>
              <button className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground">90D</button>
            </div>
          </div>
          <div className="flex items-end gap-2 h-48">
            {[85, 110, 65, 135, 100, 80, 155, 120, 105, 145, 90, 115, 125, 140].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col gap-0.5">
                {/* Passed = Teal */}
                <div 
                  className="bg-teal-500 rounded-t transition-all" 
                  style={{ height: `${h * 0.7}px` }} 
                />
                {/* Failed = Red */}
                <div 
                  className="bg-red-500 rounded-b transition-all" 
                  style={{ height: `${Math.random() * 20 + 10}px` }} 
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-teal-500" />
              <span className="text-xs text-muted-foreground">Passed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">Failed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs text-muted-foreground">Blocked</span>
            </div>
          </div>
        </div>

        {/* Active Cycles */}
        <div className="bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between p-5 pb-3 border-b border-border/50">
            <h2 className="text-lg font-semibold text-foreground">Active Cycles</h2>
            <button 
              onClick={handleViewAllCycles}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="p-2">
            {cyclesLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading...</p>
            ) : cycles?.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No active cycles</p>
            ) : (
              cycles?.map(cycle => <CycleCard key={cycle.id} cycle={cycle} />)
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* My Work */}
        <div className="col-span-2 bg-card border border-border rounded-xl">
          <div className="p-5 pb-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">My Work</h2>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <button 
                  onClick={() => setActiveTab('cases')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    activeTab === 'cases' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  Cases {myWork?.length || 0}
                </button>
                <button 
                  onClick={() => setActiveTab('cycles')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    activeTab === 'cycles' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  Cycles 0
                </button>
                <button 
                  onClick={() => setActiveTab('defects')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    activeTab === 'defects' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  Defects 0
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select className="text-xs bg-muted border-0 rounded-lg px-3 py-1.5 text-muted-foreground">
                <option>All Cycles</option>
              </select>
              <select className="text-xs bg-muted border-0 rounded-lg px-3 py-1.5 text-muted-foreground">
                <option>All Urgency</option>
              </select>
              <div className="flex items-center gap-2 ml-auto">
                <button 
                  onClick={handleExpandAll}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Maximize2 className="h-3 w-3" />
                  Expand All
                </button>
                <button 
                  onClick={handleCollapseAll}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Minimize2 className="h-3 w-3" />
                  Collapse All
                </button>
              </div>
            </div>
          </div>
          <div className="p-4">
            {myWorkLoading ? (
              <p className="py-4 text-sm text-muted-foreground">Loading...</p>
            ) : myWork?.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No items assigned</p>
            ) : (
              <div className="space-y-2">
                {myWork?.slice(0, 5).map((item: any) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground">{item.key}</span>
                      <span className="text-sm text-muted-foreground truncate max-w-md">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.status} />
                      <PriorityBadge priority={item.priority} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between p-5 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
              <Circle className="h-2 w-2 fill-teal-500 text-teal-500" />
            </div>
            <button 
              onClick={handleRefresh}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            {activitiesLoading ? (
              <p className="py-4 text-sm text-muted-foreground">Loading...</p>
            ) : activities?.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No recent activity</p>
            ) : (
              activities?.map((activity, i) => (
                <ActivityItem key={activity.id} activity={activity} isFirst={i === 0} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommandCenterPage;
