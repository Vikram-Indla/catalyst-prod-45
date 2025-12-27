// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Strategy Analytics Modal
// Real data-driven executive analytics dashboard with drill-down capabilities
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from 'react';
import { exportAnalyticsReportToPDF } from '../lib/exportAnalyticsReportToPDF';
import { X, TrendingUp, TrendingDown, Minus, AlertTriangle, Clock, Link, Download, BarChart3, Target, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RISK_COLORS } from '@/config/riskColors';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { 
  PerformanceMetrics, 
  ThemeAnalyticsRow, 
  RiskMetrics, 
  FocusArea,
  OkrAnalyticsResult,
  TrendDirection,
  FocusSeverity,
  DrillDownItem,
} from '../lib/okrAnalytics';

export interface ThemeChip {
  id: string;
  name: string;
  color: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────────

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-4 text-[11px] font-semibold text-[#2563eb] uppercase tracking-wider">
    {children}
  </h3>
);

const TrendBadge = ({ trend, value }: { trend: TrendDirection; value: string }) => {
  const isPositive = trend === 'ahead';
  const isNeutral = trend === 'on-plan';
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
      isNeutral && "bg-[#f5f0e8] text-[#6b5b4f]",
      isPositive && "bg-[#e8f5e9] text-[#4a7c4a]",
      !isPositive && !isNeutral && "bg-[#fef3e2] text-[#b8860b]"
    )}>
      {isPositive && <TrendingUp className="h-3 w-3" />}
      {isNeutral && <Minus className="h-3 w-3" />}
      {!isPositive && !isNeutral && <TrendingDown className="h-3 w-3" />}
      {value}
    </span>
  );
};

const StatusDot = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    ahead: 'bg-[#4a7c4a]',
    'on-plan': 'bg-secondary-green',
    behind: 'bg-[#b8860b]',
    'no-baseline': 'bg-muted-foreground',
  };
  
  return <span className={cn("w-2 h-2 rounded-full flex-shrink-0", colors[status] || colors['on-plan'])} />;
};

const ThemeDot = ({ color }: { color: string }) => (
  <span 
    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
    style={{ backgroundColor: color, boxShadow: `0 0 0 2px ${color}20` }} 
  />
);

const KPICard = ({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) => (
  <div className={cn(
    "p-5 rounded-xl",
    "bg-white dark:bg-[#161B22]",
    "border border-[#E1E4E8] dark:border-[#30363D]",
    wide && "col-span-2"
  )}>
    <div className="text-[11px] font-semibold text-[#2563eb] uppercase tracking-wider mb-3">
      {title}
    </div>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────────
// DRILL-DOWN DIALOG
// ─────────────────────────────────────────────────────────────────────────────────

interface DrillDownDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: DrillDownItem[];
}

const DrillDownDialog = ({ isOpen, onClose, title, items }: DrillDownDialogProps) => {
  const getTypeIcon = (type: DrillDownItem['type']) => {
    switch (type) {
      case 'objective': return <Target className="h-4 w-4 text-secondary-green" />;
      case 'keyResult': return <BarChart3 className="h-4 w-4 text-brand-primary" />;
      case 'workItem': return <div className="w-4 h-4 rounded bg-secondary-bronze/20 flex items-center justify-center text-[10px] font-bold text-secondary-bronze">W</div>;
      default: return null;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-secondary-green';
      case 'on-track': return 'bg-secondary-green';
      case 'in-progress': return 'bg-brand-primary';
      case 'at-risk': return 'bg-[#b8860b]';
      case 'off-track': return 'bg-[#b85c38]';
      case 'blocked': return 'bg-[#b85c38]';
      default: return 'bg-muted-foreground';
    }
  };

  if (!isOpen) return null;

  // Custom inline dialog with higher z-index to appear above parent modal (z-[1000])
  return (
    <div 
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 dark:bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[95%] max-w-[600px] bg-white dark:bg-[#161B22] rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200 border border-[#E1E4E8] dark:border-[#30363D]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E1E4E8] dark:border-[#30363D]">
          <h3 className="text-lg font-semibold text-[#24292F] dark:text-[#E6EDF3]">{title}</h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#F6F8FA] dark:hover:bg-[#21262D] text-[#8B949E] hover:text-[#24292F] dark:hover:text-[#E6EDF3] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Content */}
        <ScrollArea className="max-h-[400px]">
          {items.length === 0 ? (
            <div className="p-6 text-center text-[#8B949E] dark:text-[#6E7681]">
              No items found
            </div>
          ) : (
            <div className="divide-y divide-[#E1E4E8] dark:divide-[#21262D]">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-[#F6F8FA] dark:hover:bg-[#21262D] transition-colors cursor-pointer"
                >
                  {getTypeIcon(item.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3] truncate">
                        {item.name}
                      </span>
                      {item.progress !== undefined && (
                        <span className="text-xs text-[#8B949E] dark:text-[#6E7681]">
                          {item.progress}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#8B949E] dark:text-[#6E7681]">
                      {item.themeName && <span>{item.themeName}</span>}
                      {item.parentName && (
                        <>
                          <ChevronRight className="h-3 w-3" />
                          <span className="truncate">{item.parentName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {item.status && (
                    <span className={cn("w-2 h-2 rounded-full", getStatusColor(item.status))} />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E1E4E8] dark:border-[#30363D] flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-[#161B22] border border-[#E1E4E8] dark:border-[#30363D] text-[#24292F] dark:text-[#E6EDF3] hover:bg-[#F6F8FA] dark:hover:bg-[#21262D]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────
// CLICKABLE METRIC ROW
// ─────────────────────────────────────────────────────────────────────────────────

interface ClickableMetricRowProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  accentColor?: string;
  onClick?: () => void;
  disabled?: boolean;
}

const ClickableMetricRow = ({ label, value, highlight, accentColor, onClick, disabled }: ClickableMetricRowProps) => {
  const isClickable = onClick && !disabled && typeof value === 'number' && value > 0;
  
  return (
    <div
      className={cn(
        "flex justify-between items-center py-0.5",
        isClickable && "cursor-pointer hover:bg-[#F6F8FA] dark:hover:bg-[#21262D] -mx-2 px-2 rounded transition-colors"
      )}
      onClick={isClickable ? onClick : undefined}
    >
      <span className={cn(
        "text-xs text-[#8B949E] dark:text-[#6E7681]",
        isClickable && "hover:text-[#24292F] dark:hover:text-[#E6EDF3]"
      )}>
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-semibold",
          highlight ? "" : "text-[#24292F] dark:text-[#E6EDF3]",
          isClickable && "underline decoration-dotted underline-offset-2"
        )}
        style={highlight && accentColor ? { color: accentColor } : {}}
      >
        {value}
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────
// SECTION A: STRATEGY PERFORMANCE OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────────

const StrategyPerformanceOverview = ({ metrics }: { metrics: PerformanceMetrics }) => {
  return (
    <div className="mb-8">
      <SectionTitle>Strategy Performance Overview</SectionTitle>
      
      <div className="grid grid-cols-3 gap-4">
        {/* KPI 1: Overall Progress vs Plan */}
        <KPICard title="Overall Progress vs Plan">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-foreground leading-none">
              {metrics.actualProgress}%
            </span>
            <span className="text-sm text-muted-foreground">actual</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Expected: {metrics.expectedProgress ?? '—'}%
            </span>
            <TrendBadge trend={metrics.progressTrend} value={metrics.progressDelta} />
          </div>
        </KPICard>

        {/* KPI 2: Objective Health */}
        <KPICard title="Objective Health">
          <div className="flex flex-col gap-2">
            {[
              { label: 'Ahead of plan', count: metrics.objectivesAhead, status: 'ahead' },
              { label: 'On plan', count: metrics.objectivesOnPlan, status: 'on-plan' },
              { label: 'Behind', count: metrics.objectivesBehind, status: 'behind' },
              { label: 'No baseline', count: metrics.objectivesNoBaseline, status: 'no-baseline' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot status={item.status} />
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
                <span className="text-sm font-semibold text-foreground">{item.count}</span>
              </div>
            ))}
          </div>
        </KPICard>

        {/* KPI 3: KR Progress Distribution */}
        <KPICard title="KR Progress Distribution">
          <div className="flex h-6 rounded-md overflow-hidden mb-3">
            <div className="bg-[#d4874d]" style={{ width: `${metrics.krDistribution.low}%` }} />
            <div className="bg-brand-primary" style={{ width: `${metrics.krDistribution.mid}%` }} />
            <div className="bg-secondary-green" style={{ width: `${metrics.krDistribution.high}%` }} />
          </div>
          <div className="flex justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[#d4874d]" />
              <span className="text-muted-foreground">&lt;30% ({metrics.krDistribution.low}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-brand-primary" />
              <span className="text-muted-foreground">30–70% ({metrics.krDistribution.mid}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-secondary-green" />
              <span className="text-muted-foreground">&gt;70% ({metrics.krDistribution.high}%)</span>
            </div>
          </div>
        </KPICard>

        {/* KPI 4: Coverage Health */}
        <div className="col-span-3">
          <KPICard title="Coverage Health — Gaps Detected">
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: 'Objectives with 0 KRs', count: metrics.coverageGaps.objectivesNoKRs, sublabel: 'No measurable outcomes defined' },
                { label: 'KRs with no work items', count: metrics.coverageGaps.krsNoWork, sublabel: 'Paper OKRs — no delivery linked' },
                { label: 'Orphan work items', count: metrics.coverageGaps.orphanWork, sublabel: 'Work not tied to any KR' },
              ].map((item, i) => (
                <div key={i} className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border",
                  item.count > 0 
                    ? "bg-[rgba(198,156,109,0.08)] dark:bg-[rgba(198,156,109,0.15)] border-[rgba(198,156,109,0.3)]" 
                    : "bg-[#F6F8FA] dark:bg-[#21262D] border-[#E1E4E8] dark:border-[#30363D]"
                )}>
                  <span className={cn(
                    "text-3xl font-bold leading-none",
                    item.count > 0 ? "text-[#C69C6D]" : "text-[#24292F] dark:text-[#E6EDF3]"
                  )}>
                    {item.count}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3] mb-0.5">{item.label}</div>
                    <div className="text-[11px] text-[#8B949E] dark:text-[#6E7681]">{item.sublabel}</div>
                  </div>
                </div>
              ))}
            </div>
          </KPICard>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────
// SECTION B: THEME-LEVEL SNAPSHOT
// ─────────────────────────────────────────────────────────────────────────────────

const ThemeLevelSnapshot = ({ themes }: { themes: ThemeAnalyticsRow[] }) => {
  return (
    <div className="mb-8">
      <SectionTitle>Theme-Level Snapshot</SectionTitle>
      
      <div className="bg-white dark:bg-[#161B22] rounded-xl border border-[#E1E4E8] dark:border-[#30363D] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_0.9fr_1fr] gap-3 px-5 py-3 bg-[#FAFBFC] dark:bg-[#0D1117] border-b border-[#E1E4E8] dark:border-[#30363D]">
          {['Theme', 'Progress', 'Baseline', 'Trend', 'Risk Density', 'Coverage'].map((col, i) => (
            <span key={i} className={cn(
              "text-[10px] font-semibold text-[#8B949E] dark:text-[#6E7681] uppercase tracking-wider",
              i > 0 && "text-right"
            )}>
              {col}
            </span>
          ))}
        </div>

        {/* Rows */}
        {themes.map((theme, index) => (
          <div
            key={theme.id}
            className={cn(
              "grid grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_0.9fr_1fr] gap-3 px-5 py-3.5",
              index < themes.length - 1 && "border-b border-[#E1E4E8] dark:border-[#21262D]",
              theme.isBehind && "bg-[rgba(198,156,109,0.08)] dark:bg-[rgba(198,156,109,0.1)]"
            )}
          >
            {/* Theme Name */}
            <div className="flex items-center gap-2.5">
              <ThemeDot color={theme.color} />
              <span className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3]">{theme.name}</span>
            </div>

            {/* Progress */}
            <div className="flex items-center justify-end gap-2">
              <div className="w-12 h-1.5 bg-border/50 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full",
                    theme.progress >= 70 ? "bg-secondary-green" : theme.progress >= 40 ? "bg-brand-primary" : "bg-[#d4874d]"
                  )}
                  style={{ width: `${theme.progress}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-foreground min-w-[32px] text-right">
                {theme.progress}%
              </span>
            </div>

            {/* Baseline */}
            <span className="text-sm text-muted-foreground text-right">
              {theme.baseline !== null ? `${theme.baseline}%` : '—'}
            </span>

            {/* Trend */}
            <div className="flex justify-end">
              {theme.trend === 'up' && <TrendingUp className="h-4 w-4 text-secondary-green" />}
              {theme.trend === 'down' && <TrendingDown className="h-4 w-4 text-[#b8860b]" />}
              {theme.trend === 'flat' && <Minus className="h-4 w-4 text-muted-foreground" />}
            </div>

            {/* Risk Density */}
            <span className={cn(
              "text-xs text-right",
              theme.highRisks > 0 ? "text-[#b85c38] font-medium" : "text-muted-foreground"
            )}>
              {theme.highRisks > 0 ? `${theme.highRisks} High` : '—'} / {theme.totalKRs} KRs
            </span>

            {/* Coverage */}
            <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
              <span>{theme.krCount} KRs</span>
              <span>·</span>
              <span>{theme.workCount} Work</span>
              {theme.gaps > 0 && (
                <>
                  <span>·</span>
                  <span className="text-[#b8860b] font-medium">{theme.gaps} gaps</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────
// SECTION C: RISKS & BLOCKERS SUMMARY (with clickable items)
// ─────────────────────────────────────────────────────────────────────────────────

interface RiskCardProps {
  icon: React.ReactNode;
  title: string;
  items: Array<{
    label: string;
    value: string | number;
    highlight?: boolean;
    onClick?: () => void;
  }>;
  accentColor: string;
}

const RiskCard = ({ icon, title, items, accentColor }: RiskCardProps) => (
  <div 
    className="p-5 rounded-xl bg-white dark:bg-[#161B22] border border-[#E1E4E8] dark:border-[#30363D]"
    style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}
  >
    <div className="flex items-center gap-2.5 mb-4">
      <span style={{ color: accentColor }}>{icon}</span>
      <span className="text-sm font-semibold text-[#24292F] dark:text-[#E6EDF3]">{title}</span>
    </div>
    <div className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <ClickableMetricRow
          key={i}
          label={item.label}
          value={item.value}
          highlight={item.highlight}
          accentColor={accentColor}
          onClick={item.onClick}
        />
      ))}
    </div>
  </div>
);

interface RisksBlockersSummaryProps {
  riskMetrics: RiskMetrics;
  onDrillDown: (title: string, items: DrillDownItem[]) => void;
}

const RisksBlockersSummary = ({ riskMetrics, onDrillDown }: RisksBlockersSummaryProps) => {
  return (
    <div className="mb-8">
      <SectionTitle>Risks & Blockers Summary</SectionTitle>
      
      <div className="grid grid-cols-3 gap-4">
        <RiskCard
          icon={<AlertTriangle className="h-[18px] w-[18px]" />}
          title="High-Risk Items"
          accentColor={RISK_COLORS.high}
          items={[
            {
              label: 'Objectives with high risks',
              value: riskMetrics.highRiskObjectives,
              highlight: riskMetrics.highRiskObjectives > 0,
              onClick: () => onDrillDown('Objectives with High Risks', riskMetrics.highRiskObjectivesList),
            },
            {
              label: 'KRs with high risks',
              value: riskMetrics.highRiskKRs,
              highlight: riskMetrics.highRiskKRs > 0,
              onClick: () => onDrillDown('Key Results with High Risks', riskMetrics.highRiskKRsList),
            },
            {
              label: 'Work items with high risks',
              value: riskMetrics.highRiskWork,
              onClick: () => onDrillDown('Work Items with High Risks', riskMetrics.highRiskWorkList),
            },
          ]}
        />

        <RiskCard
          icon={<Clock className="h-[18px] w-[18px]" />}
          title="Schedule Slippage"
          accentColor={RISK_COLORS.medium}
          items={[
            {
              label: 'Delayed work items',
              value: riskMetrics.delayedWork,
              highlight: riskMetrics.delayedWork > 0,
              onClick: () => onDrillDown('Delayed Work Items', riskMetrics.delayedWorkList),
            },
            {
              label: 'Average days late',
              value: `${riskMetrics.avgDaysLate} days`,
              highlight: riskMetrics.avgDaysLate > 7,
            },
            {
              label: 'Objectives behind baseline',
              value: riskMetrics.objectivesBehind,
              onClick: () => onDrillDown('Objectives Behind Baseline', riskMetrics.objectivesBehindList),
            },
          ]}
        />

        <RiskCard
          icon={<Link className="h-[18px] w-[18px]" />}
          title="Coverage & Dependencies"
          accentColor={RISK_COLORS.low}
          items={[
            {
              label: 'KRs with no delivery work',
              value: riskMetrics.krsNoWork,
              highlight: riskMetrics.krsNoWork > 0,
              onClick: () => onDrillDown('KRs with No Delivery Work', riskMetrics.krsNoWorkList),
            },
            {
              label: 'Blocked work items',
              value: riskMetrics.blockedWork,
              highlight: riskMetrics.blockedWork > 0,
              onClick: () => onDrillDown('Blocked Work Items', riskMetrics.blockedWorkList),
            },
            {
              label: 'Themes with critical deps',
              value: riskMetrics.criticalDeps,
            },
          ]}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────
// SECTION D: TOP 5 FOCUS AREAS
// ─────────────────────────────────────────────────────────────────────────────────

const FocusAreaItem = ({ number, text, severity }: { number: number; text: string; severity: FocusSeverity }) => {
  const severityColors: Record<FocusSeverity, string> = {
    high: '#b85c38',
    medium: '#b8860b',
    low: '#8b7355',
  };
  
  return (
    <div 
      className="flex gap-3.5 p-3.5 rounded-lg bg-[#F6F8FA] dark:bg-[#21262D]"
      style={{ borderLeft: `3px solid ${severityColors[severity]}` }}
    >
      <span 
        className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold text-white flex-shrink-0"
        style={{ backgroundColor: severityColors[severity] }}
      >
        {number}
      </span>
      <p className="m-0 text-sm text-[#24292F] dark:text-[#E6EDF3] leading-relaxed">{text}</p>
    </div>
  );
};

const TopFocusAreas = ({ focusAreas }: { focusAreas: FocusArea[] }) => {
  if (focusAreas.length === 0) {
    return (
      <div className="mb-6">
        <SectionTitle>Top 5 Focus Areas</SectionTitle>
        <div className="p-5 rounded-xl text-center bg-white dark:bg-[#161B22] border border-[#E1E4E8] dark:border-[#30363D] text-[#8B949E] dark:text-[#6E7681]">
          No critical focus areas detected. Keep up the good work!
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <SectionTitle>Top 5 Focus Areas</SectionTitle>
      
      <div className="p-5 rounded-xl bg-white dark:bg-[#161B22] border border-[#E1E4E8] dark:border-[#30363D]">
        <div className="flex flex-col gap-3">
          {focusAreas.map((area, i) => (
            <FocusAreaItem
              key={i}
              number={i + 1}
              text={area.text}
              severity={area.severity}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// PDF export utility removed - now using html2canvas + jsPDF inline

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN ANALYTICS MODAL
// ─────────────────────────────────────────────────────────────────────────────────

interface StrategyAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: OkrAnalyticsResult | null;
  isLoading?: boolean;
  themes?: ThemeChip[];
  selectedThemeIds: string[];
  onThemeChange: (themeIds: string[]) => void;
}

export function StrategyAnalyticsModal({
  isOpen,
  onClose,
  analytics,
  isLoading = false,
  themes = [],
  selectedThemeIds,
  onThemeChange,
}: StrategyAnalyticsModalProps) {
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [drillDownItems, setDrillDownItems] = useState<DrillDownItem[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleDrillDown = useCallback((title: string, items: DrillDownItem[]) => {
    setDrillDownTitle(title);
    setDrillDownItems(items);
    setDrillDownOpen(true);
  }, []);

  // Compute filter label for display
  const filterLabel = selectedThemeIds.length === 0 
    ? 'All Themes' 
    : selectedThemeIds.length === 1 
      ? themes.find(t => t.id === selectedThemeIds[0])?.name || '1 Theme'
      : `${selectedThemeIds.length} Themes`;

  const handleThemeToggle = useCallback((themeId: string | null) => {
    if (themeId === null) {
      onThemeChange([]);
    } else {
      const newIds = selectedThemeIds.includes(themeId)
        ? selectedThemeIds.filter(id => id !== themeId)
        : [...selectedThemeIds, themeId];
      onThemeChange(newIds);
    }
  }, [selectedThemeIds, onThemeChange]);

  const handleExportPDF = useCallback(async () => {
    if (!contentRef.current || !analytics) return;
    
    setIsExporting(true);
    try {
      await exportAnalyticsReportToPDF(contentRef.current, {
        title: 'Strategy Analytics Overview',
        subtitle: 'Executive Strategy Report',
        filterLabel,
      });
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setIsExporting(false);
    }
  }, [analytics, filterLabel]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 dark:bg-black/70">
        {/* Modal Container */}
        <div className={cn(
          "w-[95%] max-w-[1100px] max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden",
          "bg-white dark:bg-[#0D1117]",
          "border border-[#E1E4E8] dark:border-[#30363D]"
        )}>
          
          {/* Header */}
          <div className="flex justify-between items-start px-7 py-6 border-b border-[#E1E4E8] dark:border-[#21262D] bg-white dark:bg-[#161B22]">
            <div>
              <h2 className="text-xl font-semibold text-[#24292F] dark:text-[#E6EDF3] tracking-tight mb-1">
                Strategy Analytics Overview
              </h2>
              <p className="text-sm text-[#8B949E] dark:text-[#6E7681]">
                Based on all active themes in current strategy
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Interactive Theme Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors",
                    "bg-white dark:bg-[#161B22]",
                    "border border-[#E1E4E8] dark:border-[#30363D]",
                    "text-[#57606A] dark:text-[#8B949E]",
                    "hover:bg-[#F6F8FA] dark:hover:bg-[#21262D]"
                  )}>
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span>{filterLabel}</span>
                    {selectedThemeIds.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-[#2563eb] rounded-full text-[10px] font-semibold text-white">
                        {selectedThemeIds.length}/{themes.length}
                      </span>
                    )}
                    <ChevronDown className="h-3 w-3 ml-0.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 z-[1100] bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D]">
                  <DropdownMenuItem 
                    onClick={() => handleThemeToggle(null)}
                    className="flex items-center justify-between"
                  >
                    <span className="font-medium">All Themes</span>
                    {selectedThemeIds.length === 0 && <Check className="h-4 w-4 text-[#C69C6D]" />}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {themes.map(theme => (
                    <DropdownMenuItem
                      key={theme.id}
                      onClick={() => handleThemeToggle(theme.id)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: theme.color }}
                        />
                        <span className="truncate">{theme.name}</span>
                      </div>
                      {selectedThemeIds.includes(theme.id) && <Check className="h-4 w-4 text-[#C69C6D]" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <button
                onClick={onClose}
                className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[#F6F8FA] dark:hover:bg-[#21262D] text-[#8B949E] hover:text-[#24292F] dark:hover:text-[#E6EDF3] transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content - ref for PDF export */}
          <div 
            ref={contentRef} 
            id="analytics-report-content"
            className="flex-1 overflow-y-auto p-7 bg-[#FAFBFC] dark:bg-[#0D1117]"
          >
            {isLoading ? (
              <div className="space-y-8">
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
                <Skeleton className="h-48 rounded-xl" />
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
              </div>
            ) : analytics ? (
              <>
                <StrategyPerformanceOverview metrics={analytics.performance} />
                <ThemeLevelSnapshot themes={analytics.themes} />
                <RisksBlockersSummary riskMetrics={analytics.risks} onDrillDown={handleDrillDown} />
                <TopFocusAreas focusAreas={analytics.focusAreas} />
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No analytics data available. Add objectives and key results to see insights.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center px-7 py-4 border-t border-[#E1E4E8] dark:border-[#21262D] bg-[#FAFBFC] dark:bg-[#161B22]">
            <p className="text-xs text-[#8B949E] dark:text-[#6E7681]">
              Analytics are read-only; metrics update automatically as OKRs change.
            </p>
            
            <div className="flex items-center gap-3">
              <button 
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium",
                  "bg-white dark:bg-[#161B22]",
                  "border border-[#E1E4E8] dark:border-[#30363D]",
                  "text-[#24292F] dark:text-[#E6EDF3]",
                  "hover:border-[#C69C6D]",
                  "disabled:opacity-50"
                )}
                onClick={handleExportPDF}
                disabled={!analytics || isExporting}
              >
                <Download className="h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </button>
              <button 
                onClick={onClose} 
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Drill-down Dialog */}
      <DrillDownDialog
        isOpen={drillDownOpen}
        onClose={() => setDrillDownOpen(false)}
        title={drillDownTitle}
        items={drillDownItems}
      />
    </>
  );
}
