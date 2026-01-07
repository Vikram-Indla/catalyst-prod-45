/**
 * Test Management Command Center
 * Enterprise-grade dashboard for QA leadership and test managers
 * Catalyst V5 Theme: Neutral authority, no expressive colors
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
// SUB-COMPONENTS - Catalyst V5 Neutral Theme
// ============================================================

interface KPICardProps {
  icon: React.ElementType;
  value: number | string;
  label: string;
}

function KPICard({ icon: Icon, value, label }: KPICardProps) {
  return (
    <div className="bg-surface-0 border border-border-default rounded-xl p-5 hover:border-border-strong transition-colors">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-surface-2">
          <Icon className="h-5 w-5 text-text-tertiary" />
        </div>
        <div className="flex-1">
          <p className="text-3xl font-semibold text-text-primary tracking-tight">{value}</p>
          <p className="text-sm text-text-secondary mt-0.5">{label}</p>
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
  segments?: { width: number }[];
  children?: React.ReactNode;
}

function SecondaryKPI({
  label,
  value,
  suffix = '%',
  sublabel,
  progressValue,
  segments,
  children,
}: SecondaryKPIProps) {
  return (
    <div className="bg-surface-0 border border-border-default rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        {sublabel && <span className="text-xs text-text-tertiary">{sublabel}</span>}
      </div>
      <p className="text-2xl font-semibold text-text-primary mb-3">
        {value}{suffix}
      </p>
      <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
        {segments ? (
          <div className="flex h-full">
            {segments.map((seg, i) => (
              <div
                key={i}
                className="h-full transition-all bg-text-tertiary"
                style={{ width: `${seg.width}%`, opacity: 1 - (i * 0.25) }}
              />
            ))}
          </div>
        ) : (
          <div
            className="h-full rounded-full transition-all bg-text-tertiary"
            style={{ width: `${progressValue ?? value}%` }}
          />
        )}
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
    <div className="bg-surface-0 border border-border-default rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text-secondary">Open Defects</span>
        <span className="text-xs text-text-tertiary font-medium">{criticalDefects} critical</span>
      </div>
      <p className="text-2xl font-semibold text-text-primary mb-3">{openDefects}</p>
      <div className="h-2 bg-surface-2 rounded-full overflow-hidden flex">
        <div className="h-full bg-text-primary transition-all" style={{ width: `${critPct}%` }} />
        <div className="h-full bg-text-secondary transition-all" style={{ width: `${majorPct}%` }} />
        <div className="h-full bg-text-tertiary transition-all" style={{ width: `${minorPct}%` }} />
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-text-secondary">
        <span>Critical: {criticalDefects}</span>
        <span>Major: {majorDefects}</span>
        <span>Minor: {minorDefects}</span>
      </div>
    </div>
  );
}

function BlockerCard({ count }: { count: number }) {
  // Catalyst Gold accent ONLY for critical attention
  const hasBlockers = count > 0;
  
  return (
    <div className={cn(
      "bg-surface-0 border rounded-xl p-5",
      hasBlockers ? "border-gold-bd" : "border-border-default"
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text-secondary">Blockers</span>
        <AlertTriangle className={cn(
          "h-4 w-4",
          hasBlockers ? "text-gold-fg" : "text-text-tertiary"
        )} />
      </div>
      <p className={cn(
        "text-2xl font-semibold",
        hasBlockers ? "text-gold-fg" : "text-text-primary"
      )}>{count}</p>
      {hasBlockers && (
        <p className="text-xs text-gold-fg mt-1">Requires immediate action</p>
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
    <div className="p-4 hover:bg-surface-1 rounded-lg transition-colors border-b border-border-subtle last:border-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-text-primary">{cycle.key}</span>
        {cycle.daysLeft !== null && (
          <span className="text-xs font-medium text-text-secondary">
            {cycle.daysLeft}d left
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-text-primary mb-3">{cycle.name}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden flex">
          {/* Neutral grayscale segments - darker = more progress */}
          <div className="h-full bg-text-primary transition-all" style={{ width: `${passedPct}%` }} />
          <div className="h-full bg-text-secondary transition-all" style={{ width: `${failedPct}%` }} />
          <div className="h-full bg-text-tertiary transition-all" style={{ width: `${blockedPct}%` }} />
        </div>
        <span className="text-xs font-medium text-text-secondary w-10 text-right">{cycle.percentage}%</span>
      </div>
    </div>
  );
}

function ActivityItem({ activity, isFirst }: { activity: any; isFirst?: boolean }) {
  const initials = activity.user_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '??';
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true });

  return (
    <div className="py-3 border-b border-border-subtle last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 bg-surface-2 text-text-secondary">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary">
            <span className="font-medium">{activity.user_name}</span>
            <span className="text-text-secondary"> {activity.action_type.toLowerCase().replace('_', ' ')} </span>
            <span className="font-medium text-text-primary">{activity.entity_key}</span>
          </p>
          <p className="text-xs text-text-tertiary mt-0.5 flex items-center gap-1.5">
            {isFirst && <Circle className="h-2 w-2 fill-text-secondary text-text-secondary" />}
            {isFirst ? 'Just now' : timeAgo}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-surface-2 text-text-secondary border-border-default">
      {status.replace('_', ' ')}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  // Only CRITICAL uses Catalyst Gold accent
  const isCritical = priority === 'CRITICAL';
  
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-transparent',
      isCritical ? 'border-gold-bd text-gold-fg' : 'border-border-default text-text-secondary'
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
        <div className="h-10 bg-surface-2 rounded w-48" />
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-surface-2 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">

      {/* Primary KPIs - All neutral icons */}
      <div className="grid grid-cols-5 gap-4">
        <KPICard icon={ClipboardList} value={kpis?.totalAssigned || 0} label="Total Assigned" />
        <KPICard icon={Clock} value={kpis?.notRun || 0} label="Not Run" />
        <KPICard icon={PlayCircle} value={kpis?.inProgress || 0} label="In Progress" />
        <KPICard icon={CheckCircle} value={kpis?.passedToday || 0} label="Passed Today" />
        <KPICard icon={XCircle} value={kpis?.failedToday || 0} label="Failed Today" />
      </div>

      {/* Secondary KPIs - Neutral progress bars */}
      <div className="grid grid-cols-4 gap-4">
        <SecondaryKPI 
          label="Coverage" 
          value={kpis?.coverage || 0} 
          sublabel={`${kpis?.coverageGaps || 0} gaps`}
        />
        <SecondaryKPI 
          label="Pass Rate" 
          value={kpis?.passRate || 0} 
          sublabel={`↑${kpis?.passRateTrend || 0}%`}
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
        {/* Chart - Neutral grayscale bars */}
        <div className="col-span-2 bg-surface-0 border border-border-default rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">Execution Trend</h2>
            <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1">
              <button className="px-3 py-1 text-xs font-medium rounded-md bg-surface-0 text-text-primary shadow-sm">14D</button>
              <button className="px-3 py-1 text-xs font-medium rounded-md text-text-secondary hover:text-text-primary">30D</button>
              <button className="px-3 py-1 text-xs font-medium rounded-md text-text-secondary hover:text-text-primary">90D</button>
            </div>
          </div>
          <div className="flex items-end gap-2 h-48">
            {[85, 110, 65, 135, 100, 80, 155, 120, 105, 145, 90, 115, 125, 140].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col gap-0.5">
                {/* Primary bar - neutral dark */}
                <div 
                  className="bg-text-secondary rounded-t transition-all" 
                  style={{ height: `${h * 0.7}px` }} 
                />
                {/* Secondary bar - neutral light */}
                <div 
                  className="bg-text-disabled rounded-b transition-all" 
                  style={{ height: `${Math.random() * 20 + 10}px` }} 
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-text-secondary" />
              <span className="text-xs text-text-secondary">Passed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-text-disabled" />
              <span className="text-xs text-text-secondary">Failed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-text-tertiary" />
              <span className="text-xs text-text-secondary">Blocked</span>
            </div>
          </div>
        </div>

        {/* Active Cycles */}
        <div className="bg-surface-0 border border-border-default rounded-xl">
          <div className="flex items-center justify-between p-5 pb-3 border-b border-border-subtle">
            <h2 className="text-lg font-semibold text-text-primary">Active Cycles</h2>
            <button 
              onClick={handleViewAllCycles}
              className="text-sm text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="p-2">
            {cyclesLoading ? (
              <p className="p-4 text-sm text-text-secondary">Loading...</p>
            ) : cycles?.length === 0 ? (
              <p className="p-4 text-sm text-text-secondary">No active cycles</p>
            ) : (
              cycles?.map(cycle => <CycleCard key={cycle.id} cycle={cycle} />)
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* My Work */}
        <div className="col-span-2 bg-surface-0 border border-border-default rounded-xl">
          <div className="p-5 pb-4 border-b border-border-subtle">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">My Work</h2>
              <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1">
                <button 
                  onClick={() => setActiveTab('cases')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    activeTab === 'cases' ? 'bg-surface-0 text-text-primary shadow-sm' : 'text-text-secondary hover:bg-surface-1'
                  )}
                >
                  Cases {myWork?.length || 0}
                </button>
                <button 
                  onClick={() => setActiveTab('cycles')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    activeTab === 'cycles' ? 'bg-surface-0 text-text-primary shadow-sm' : 'text-text-secondary hover:bg-surface-1'
                  )}
                >
                  Cycles 0
                </button>
                <button 
                  onClick={() => setActiveTab('defects')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    activeTab === 'defects' ? 'bg-surface-0 text-text-primary shadow-sm' : 'text-text-secondary hover:bg-surface-1'
                  )}
                >
                  Defects 0
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select className="text-xs bg-surface-2 border-0 rounded-lg px-3 py-1.5 text-text-secondary">
                <option>All Cycles</option>
              </select>
              <select className="text-xs bg-surface-2 border-0 rounded-lg px-3 py-1.5 text-text-secondary">
                <option>All Urgency</option>
              </select>
              <div className="flex items-center gap-2 ml-auto">
                <button 
                  onClick={handleExpandAll}
                  className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1"
                >
                  <Maximize2 className="h-3 w-3" />
                  Expand All
                </button>
                <button 
                  onClick={handleCollapseAll}
                  className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1"
                >
                  <Minimize2 className="h-3 w-3" />
                  Collapse All
                </button>
              </div>
            </div>
          </div>
          
          {myWorkLoading ? (
            <p className="p-4 text-sm text-text-secondary">Loading...</p>
          ) : myWork?.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">No assigned work</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Key</th>
                  <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Title</th>
                  <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Priority</th>
                  <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Cycle</th>
                  <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {myWork?.map(item => (
                  <tr key={item.id} className="border-b border-border-subtle hover:bg-surface-1 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-text-primary">{item.key}</td>
                    <td className="px-5 py-3 text-sm text-text-primary max-w-xs truncate">{item.title}</td>
                    <td className="px-5 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-5 py-3"><PriorityBadge priority={item.priority} /></td>
                    <td className="px-5 py-3 text-sm text-text-secondary">{item.cycleKey || '—'}</td>
                    <td className="px-5 py-3 text-sm text-text-secondary">
                      {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-surface-0 border border-border-default rounded-xl">
          <div className="flex items-center justify-between p-5 pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-text-primary">Recent Activity</h2>
              <Circle className="h-2 w-2 fill-text-tertiary text-text-tertiary" />
            </div>
            <button onClick={() => refetchActivity()} className="p-1.5 hover:bg-surface-2 rounded-lg transition-all">
              <RefreshCw className="h-4 w-4 text-text-secondary" />
            </button>
          </div>
          <div className="px-5 py-2 max-h-80 overflow-y-auto">
            {activitiesLoading ? (
              <p className="py-4 text-sm text-text-secondary">Loading...</p>
            ) : activities?.length === 0 ? (
              <p className="py-4 text-sm text-text-secondary">No recent activity</p>
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
