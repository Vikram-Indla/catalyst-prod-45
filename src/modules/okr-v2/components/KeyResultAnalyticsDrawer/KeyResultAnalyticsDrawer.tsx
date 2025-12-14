// ═══════════════════════════════════════════════════════════════════════════════
// CATALYST KEY RESULT ANALYTICS DRAWER
// Executive-ready analytics panel for Key Results
// Shows Performance, Risks with origin breakdown, Linked Work, Insights
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { X, Shield, Link2, Lightbulb, ChevronDown, ChevronUp, AlertTriangle, ArrowRight, TrendingUp, TrendingDown, Clock, Target, Activity } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useKeyResultAnalytics } from '../../hooks/useKeyResultAnalytics';
import type { KeyResultAnalyticsData } from '../../lib/keyResultAnalytics';
import type { TrendDirection, InsightSeverity, BaselineInfo } from '../../lib/sharedAnalyticsTypes';
import type { AnalyticsRiskSummary } from '../../lib/okrRiskTypes';

interface KeyResultAnalyticsDrawerProps {
  keyResultId: string | null;
  open: boolean;
  onClose: () => void;
  snapshotId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// SHARED UI COMPONENTS (same as ObjectiveAnalyticsDrawer)
// ─────────────────────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider bg-secondary-green/10 text-secondary-green border border-secondary-green/20">
      {type}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const getStatusStyle = () => {
    switch (status) {
      case 'On Track':
        return 'bg-secondary-green/10 text-secondary-green border-secondary-green/30';
      case 'In Progress':
        return 'bg-brand-gold/10 text-brand-gold border-brand-gold/30';
      case 'At Risk':
      case 'Off Track':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'Blocked':
        return 'bg-destructive/20 text-destructive border-destructive/40';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border', getStatusStyle())}>
      {status}
    </span>
  );
}

function TrendPill({ trend }: { trend: TrendDirection }) {
  const getConfig = () => {
    switch (trend) {
      case 'ahead':
        return { label: 'Ahead of plan', icon: TrendingUp, className: 'bg-secondary-green/10 text-secondary-green border-secondary-green/30' };
      case 'on-plan':
        return { label: 'On plan', icon: null, className: 'bg-brand-gold/10 text-brand-gold border-brand-gold/30' };
      case 'behind':
        return { label: 'Behind plan', icon: TrendingDown, className: 'bg-destructive/10 text-destructive border-destructive/30' };
      default:
        return { label: 'No baseline', icon: null, className: 'bg-muted text-muted-foreground border-border' };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border', config.className)}>
      {Icon && <Icon className="h-3 w-3" />}
      {config.label}
    </span>
  );
}

function ThemeChip({ name, color }: { name: string; color: string }) {
  return (
    <div 
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border"
      style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
    >
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[13px] font-medium" style={{ color }}>{name}</span>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-3 border-b border-border mb-4">
      <Icon className="h-[18px] w-[18px] text-brand-gold" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
    </div>
  );
}

function MetricCard({ value, label, highlight = false, highlightType = 'risk' }: { 
  value: number | string; label: string; highlight?: boolean; highlightType?: 'risk' | 'warning' | 'success';
}) {
  const getHighlightStyle = () => {
    if (!highlight) return 'bg-muted/50 border-border';
    if (highlightType === 'risk') return 'bg-destructive/10 border-destructive/30';
    if (highlightType === 'success') return 'bg-secondary-green/10 border-secondary-green/30';
    return 'bg-amber-500/10 border-amber-500/30';
  };

  const getValueColor = () => {
    if (!highlight) return 'text-foreground';
    if (highlightType === 'risk') return 'text-destructive';
    if (highlightType === 'success') return 'text-secondary-green';
    return 'text-amber-600';
  };

  return (
    <div className={cn('flex-1 flex flex-col items-center justify-center p-4 rounded-lg border transition-all min-w-0', getHighlightStyle())}>
      <span className={cn('text-2xl font-bold leading-none mb-1', getValueColor())}>{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">{label}</span>
    </div>
  );
}

function InsightBullet({ text, severity }: { text: string; severity: InsightSeverity }) {
  const dotColor = severity === 'high' ? 'bg-destructive' : severity === 'medium' ? 'bg-amber-500' : 'bg-brand-gold';
  return (
    <div className="flex items-start gap-3 py-1">
      <span className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', dotColor)} />
      <p className="text-[13px] text-foreground leading-relaxed m-0">{text}</p>
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="mb-6">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2.5 w-full pb-3 border-b border-border bg-transparent cursor-pointer hover:opacity-80 transition-opacity">
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      </button>
      {isOpen && <div className="pt-4">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// KR-SPECIFIC SECTIONS
// ─────────────────────────────────────────────────────────────────────────────────

function PerformanceCard({ analytics }: { analytics: KeyResultAnalyticsData }) {
  const { baseline, actual, target, baselineValue, unit } = analytics;
  const deltaDisplay = baseline.delta !== null ? `${baseline.delta > 0 ? '+' : ''}${baseline.delta}pp` : '—';
  
  return (
    <div className="p-4 bg-card rounded-xl border border-border space-y-4">
      {/* Progress row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-foreground">{baseline.actual}%</span>
            <span className="text-[10px] uppercase text-muted-foreground font-medium">Overall Progress</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <TrendPill trend={baseline.trend} />
          {baseline.delta !== null && (
            <span className={cn('text-xs font-medium', baseline.delta >= 0 ? 'text-secondary-green' : 'text-destructive')}>
              {deltaDisplay}
            </span>
          )}
        </div>
      </div>

      {/* Current vs Target display */}
      {actual !== undefined && target !== undefined && (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">
            Current: <strong>{actual}</strong> {unit || 'count'} / Target: <strong>{target}</strong> {unit || 'count'}
          </span>
        </div>
      )}

      {/* Timing row */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className={cn('text-sm font-medium', baseline.daysToTarget !== null && baseline.daysToTarget < 0 ? 'text-destructive' : 'text-foreground')}>
          {baseline.timingLabel}
        </span>
      </div>
    </div>
  );
}

function RisksSection({ risks }: { risks: AnalyticsRiskSummary }) {
  const hasNoRisks = risks.totals.high === 0 && risks.blockedItems === 0 && risks.delayedItems === 0;

  if (hasNoRisks) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg border border-border text-center">
        <span className="text-sm text-muted-foreground">No active risks logged</span>
      </div>
    );
  }

  const originLines: string[] = [];
  if (risks.breakdown.workItemLevel.high > 0) {
    const firstItem = risks.breakdown.workItemsWithHighRisk[0];
    originLines.push(`${risks.breakdown.workItemLevel.high} high risk at Work item level${firstItem ? ` (${firstItem.name})` : ''}`);
  }
  if (risks.breakdown.krLevel.high > 0) {
    originLines.push(`${risks.breakdown.krLevel.high} at KR level`);
  }

  return (
    <div className="p-4 bg-card rounded-xl border border-border space-y-4">
      <div className="flex gap-3">
        <MetricCard value={risks.totals.high} label="High Risks" highlight={risks.totals.high > 0} highlightType="risk" />
        <MetricCard value={risks.blockedItems} label="Blocked Items" highlight={risks.blockedItems > 0} highlightType="warning" />
        <MetricCard value={risks.delayedItems} label="Delayed Items" highlight={risks.delayedItems > 0} highlightType="warning" />
      </div>

      {originLines.length > 0 && (
        <div className="pt-3 border-t border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Risk Origin</span>
          <div className="space-y-1">
            {originLines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LinkedWorkSection({ analytics }: { analytics: KeyResultAnalyticsData }) {
  const { linkedWork, workItemStatus } = analytics;

  return (
    <div className="p-4 bg-card rounded-xl border border-border space-y-3">
      <div className="flex gap-3">
        <MetricCard value={linkedWork.totalWork} label="Total Work" />
        <MetricCard value={linkedWork.blocked} label="Blocked" highlight={linkedWork.blocked > 0} highlightType="warning" />
        <MetricCard value={linkedWork.delayed} label="Delayed" highlight={linkedWork.delayed > 0} highlightType="warning" />
      </div>
      
      {linkedWork.totalWork > 0 && (
        <div className="flex items-center gap-3 text-xs pt-2 border-t border-border">
          <Activity className="h-4 w-4 text-muted-foreground" />
          {workItemStatus.completed > 0 && <span className="text-secondary-green">{workItemStatus.completed} done</span>}
          {workItemStatus.inProgress > 0 && <span className="text-brand-gold">{workItemStatus.inProgress} in progress</span>}
          {workItemStatus.blocked > 0 && <span className="text-destructive">{workItemStatus.blocked} blocked</span>}
          {workItemStatus.pending > 0 && <span className="text-muted-foreground">{workItemStatus.pending} pending</span>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// LOADING STATE
// ─────────────────────────────────────────────────────────────────────────────────

function DrawerSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-20" />
      </div>
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-7 w-48" />
      <div className="space-y-4 pt-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN DRAWER CONTENT
// ─────────────────────────────────────────────────────────────────────────────────

function DrawerContent({ analytics }: { analytics: KeyResultAnalyticsData }) {
  const { risks, insights, alignment } = analytics;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-brand-gold bg-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <TypeBadge type={analytics.type} />
            <StatusPill status={analytics.statusLabel} />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-foreground leading-snug mb-4">{analytics.name}</h2>
        <ThemeChip name={alignment.themeName} color={alignment.themeColor} />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Performance */}
        <div className="mb-7">
          <SectionHeader icon={TrendingUp} title="Performance" />
          <PerformanceCard analytics={analytics} />
        </div>

        {/* Risks & Delivery Health */}
        <div className="mb-7">
          <SectionHeader icon={Shield} title="Risks & Delivery Health" />
          <RisksSection risks={risks} />
        </div>

        {/* Linked Work & Coverage */}
        <div className="mb-7">
          <SectionHeader icon={Link2} title="Linked Work & Coverage" />
          <LinkedWorkSection analytics={analytics} />
        </div>

        {/* Executive Insights */}
        {insights.length > 0 && (
          <div className="mb-7">
            <SectionHeader icon={Lightbulb} title="Executive Insights" />
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              {insights.map((insight, idx) => (
                <InsightBullet key={idx} text={insight.text} severity={insight.severity} />
              ))}
            </div>
          </div>
        )}

        {/* Alignment & Context */}
        <CollapsibleSection title="Alignment & Context">
          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-3 text-sm">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: alignment.themeColor }} />
              <span className="font-medium">{alignment.themeName}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground truncate">{alignment.objectiveName}</span>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────────

export function KeyResultAnalyticsDrawer({ keyResultId, open, onClose, snapshotId }: KeyResultAnalyticsDrawerProps) {
  const { analytics, isLoading, error } = useKeyResultAnalytics(keyResultId, snapshotId);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-screen sm:w-[540px] sm:max-w-[540px] p-0 border-l border-border overflow-hidden" aria-describedby={undefined}>
        <SheetHeader className="sr-only">
          <SheetTitle>Key Result Analytics</SheetTitle>
        </SheetHeader>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none z-10"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>

        {isLoading ? (
          <DrawerSkeleton />
        ) : error ? (
          <div className="p-6 text-center text-destructive">Error loading analytics</div>
        ) : analytics ? (
          <DrawerContent analytics={analytics} />
        ) : (
          <div className="p-6 text-center text-muted-foreground">Key Result not found</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
