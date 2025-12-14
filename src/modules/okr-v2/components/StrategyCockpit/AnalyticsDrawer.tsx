// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Analytics Drawer Component
// Contextual analytics panel for Objective/KR/Work Item (no theme level)
// ═══════════════════════════════════════════════════════════════════════════════

import { Target, TrendingUp, Shield, Link2, DollarSign, GitBranch, AlertTriangle, X, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Theme, Objective, KeyResult, WorkItem, TreeItem, StatusCode, RollupMetrics } from '../../lib/okrTypes';
import {
  calculateRiskScore,
  getObjectiveRollupMetrics,
  getStatusLabel,
  getStatusColor,
  formatCurrency,
  formatDate,
  getDaysUntilDue,
  calculateValueRealization,
} from '../../lib/okrMetrics';

interface AnalyticsDrawerProps {
  selectedItem: TreeItem | null;
  themes: Theme[];
}

// ─────────────────────────────────────────────────────────────────────────────────
// DRAWER SECTION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

function DrawerSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <Icon className="h-4 w-4 text-brand-gold" />
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h4>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATUS BREAKDOWN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

function StatusBreakdown({ byStatus, label }: { byStatus: Record<StatusCode, number>; label: string }) {
  const entries = Object.entries(byStatus).filter(([_, count]) => count > 0);
  if (entries.length === 0) return null;

  return (
    <div className="p-3 bg-card rounded-lg border border-border">
      <div className="text-xs text-muted-foreground mb-2.5">{label}</div>
      <div className="flex gap-2 flex-wrap">
        {entries.map(([status, count]) => (
          <div
            key={status}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border"
            style={{
              backgroundColor: `${getStatusColor(status as StatusCode)}10`,
              borderColor: `${getStatusColor(status as StatusCode)}30`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: getStatusColor(status as StatusCode) }}
            />
            <span className="text-xs text-foreground">
              {count} {getStatusLabel(status as StatusCode)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN ANALYTICS DRAWER
// ─────────────────────────────────────────────────────────────────────────────────

export function AnalyticsDrawer({ selectedItem, themes }: AnalyticsDrawerProps) {
  if (!selectedItem) {
    return (
      <div className="flex-[0_0_420px] flex items-center justify-center bg-muted/30 p-10">
        <div className="text-center text-muted-foreground">
          <Target className="h-12 w-12 mb-4 mx-auto opacity-40" />
          <p className="text-sm">Select an objective, KR, or work item to view analytics</p>
        </div>
      </div>
    );
  }

  // Find parent theme for color
  const getTheme = (): Theme | undefined => {
    return themes.find((t) => t.id === (selectedItem as any).themeId);
  };

  const theme = getTheme();
  const themeColor = theme?.color || 'hsl(var(--brand-gold))';

  // Find parent objective
  const getObjective = (): Objective | undefined => {
    if (selectedItem.type === 'objective') return selectedItem as Objective;
    if (selectedItem.type === 'keyResult' || selectedItem.type === 'workItem') {
      return theme?.objectives?.find((o) => o.id === (selectedItem as any).objectiveId);
    }
    return undefined;
  };

  const objective = getObjective();

  // Find parent KR
  const getKeyResult = (): KeyResult | undefined => {
    if (selectedItem.type === 'keyResult') return selectedItem as KeyResult;
    if (selectedItem.type === 'workItem') {
      return objective?.keyResults?.find((kr) => kr.id === (selectedItem as WorkItem).krId);
    }
    return undefined;
  };

  const keyResult = getKeyResult();

  // Get rollup metrics
  const metrics: Partial<RollupMetrics> = (() => {
    if (selectedItem.type === 'objective') {
      return getObjectiveRollupMetrics(selectedItem as Objective);
    }
    if (selectedItem.type === 'keyResult') {
      const kr = selectedItem as KeyResult;
      return {
        workItemCount: kr.workItems?.length || 0,
        krsWithoutWork: !kr.workItems || kr.workItems.length === 0 ? 1 : 0,
      };
    }
    return {};
  })();

  // Build alignment path
  const alignmentPath: { type: string; name: string }[] = [];
  if (theme) alignmentPath.push({ type: 'Theme', name: theme.name });
  if (objective) {
    alignmentPath.push({ type: 'Objective', name: objective.name });
  }
  if (keyResult && (selectedItem.type === 'keyResult' || selectedItem.type === 'workItem')) {
    alignmentPath.push({ type: 'Key Result', name: keyResult.name });
  }
  if (selectedItem.type === 'workItem') {
    alignmentPath.push({ type: 'Work Item', name: selectedItem.name });
  }

  const riskScore = calculateRiskScore(selectedItem.risks);
  const daysToDue = selectedItem.type === 'keyResult' ? getDaysUntilDue((selectedItem as KeyResult).dueDate) : null;
  const valueRealization = calculateValueRealization(
    selectedItem.value?.estimated || 0,
    selectedItem.value?.realized || 0
  );

  // Get header label based on type
  const getHeaderLabel = () => {
    if (selectedItem.type === 'objective') return 'OBJECTIVE';
    if (selectedItem.type === 'keyResult') return 'KEY RESULT';
    if (selectedItem.type === 'workItem') return 'DELIVERY ITEM';
    return 'ITEM';
  };

  return (
    <div className="flex-[0_0_420px] flex flex-col bg-muted/30 border-l border-border overflow-y-auto">
      {/* Header */}
      <div className="p-5 bg-card border-b border-border">
        <div className="flex items-center gap-2.5 mb-3">
          <span
            className="px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: `${themeColor}15`,
              color: themeColor,
            }}
          >
            {getHeaderLabel()}
          </span>
          <Badge variant={selectedItem.status === 'on-track' || selectedItem.status === 'completed' ? 'secondary' : 'destructive'}>
            {getStatusLabel(selectedItem.status)}
          </Badge>
        </div>

        <h3 className="text-lg font-semibold text-foreground leading-snug mb-3">
          {selectedItem.name}
        </h3>

        {/* Theme chip */}
        {theme && (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border"
            style={{
              backgroundColor: `${themeColor}10`,
              borderColor: `${themeColor}30`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: themeColor }}
            />
            <span className="text-xs font-medium" style={{ color: themeColor }}>
              {theme.name}
            </span>
          </div>
        )}
      </div>

      {/* Analytics Content */}
      <div className="p-5">
        {/* Performance Section */}
        <DrawerSection title="Performance" icon={TrendingUp}>
          <div className="space-y-3">
            {/* Progress Bar */}
            <div className="p-4 bg-card rounded-lg border border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">Overall Progress</span>
                <span
                  className={cn(
                    "text-xl font-bold",
                    selectedItem.progress >= 70 ? "text-secondary-green" : selectedItem.progress >= 40 ? "text-brand-gold" : "text-destructive"
                  )}
                >
                  {selectedItem.progress}%
                </span>
              </div>
              <Progress value={Math.min(selectedItem.progress, 100)} className="h-2" />
            </div>

            {/* Actual vs Target for KRs */}
            {selectedItem.type === 'keyResult' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-card rounded-lg border border-border text-center">
                  <div className="text-xs text-muted-foreground mb-1">Actual</div>
                  <div className="text-lg font-bold text-secondary-green">
                    {(selectedItem as KeyResult).actual ?? '—'}
                    {(selectedItem as KeyResult).unit === '%' ? '%' : ` ${(selectedItem as KeyResult).unit || ''}`}
                  </div>
                </div>
                <div className="p-3 bg-card rounded-lg border border-border text-center">
                  <div className="text-xs text-muted-foreground mb-1">Target</div>
                  <div className="text-lg font-bold text-foreground">
                    {(selectedItem as KeyResult).target ?? '—'}
                    {(selectedItem as KeyResult).unit === '%' ? '%' : ` ${(selectedItem as KeyResult).unit || ''}`}
                  </div>
                </div>
              </div>
            )}

            {/* Status breakdown for Objective */}
            {selectedItem.type === 'objective' && metrics.krsByStatus && (
              <StatusBreakdown
                byStatus={metrics.krsByStatus}
                label="Key Results by Status"
              />
            )}

            {/* Weight & Due Date for KRs */}
            {selectedItem.type === 'keyResult' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-card rounded-lg border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Weight</div>
                  <div className="text-base font-semibold text-foreground">
                    {(((selectedItem as KeyResult).weight || 1) * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="p-3 bg-card rounded-lg border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Due Date</div>
                  <div className={cn("text-sm font-semibold flex items-center gap-1.5", daysToDue !== null && daysToDue < 60 && "text-destructive")}>
                    {daysToDue !== null && daysToDue < 60 && <AlertTriangle className="h-3.5 w-3.5" />}
                    {(selectedItem as KeyResult).dueDate
                      ? formatDate((selectedItem as KeyResult).dueDate!)
                      : '—'}
                  </div>
                </div>
              </div>
            )}

            {/* Work Item Schedule */}
            {selectedItem.type === 'workItem' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-card rounded-lg border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Release Date</div>
                  <div className="text-sm font-semibold text-foreground">
                    {(selectedItem as WorkItem).releaseDate
                      ? formatDate((selectedItem as WorkItem).releaseDate!)
                      : '—'}
                  </div>
                </div>
                <div className={cn(
                  "p-3 bg-card rounded-lg border",
                  (selectedItem as WorkItem).daysVariance && (selectedItem as WorkItem).daysVariance! > 0
                    ? "border-destructive/30"
                    : "border-border"
                )}>
                  <div className="text-xs text-muted-foreground mb-1">Schedule Variance</div>
                  <div className={cn(
                    "text-sm font-semibold",
                    (selectedItem as WorkItem).daysVariance === 0 && "text-foreground",
                    (selectedItem as WorkItem).daysVariance && (selectedItem as WorkItem).daysVariance! > 0 && "text-destructive",
                    (selectedItem as WorkItem).daysVariance && (selectedItem as WorkItem).daysVariance! < 0 && "text-secondary-green"
                  )}>
                    {(selectedItem as WorkItem).daysVariance === 0
                      ? 'On Schedule'
                      : (selectedItem as WorkItem).daysVariance && (selectedItem as WorkItem).daysVariance! > 0
                      ? `${(selectedItem as WorkItem).daysVariance} days late`
                      : `${Math.abs((selectedItem as WorkItem).daysVariance || 0)} days ahead`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DrawerSection>

        {/* Risks & Blockers Section */}
        <DrawerSection title="Risks & Blockers" icon={Shield}>
          <div className="p-4 bg-card rounded-lg border border-border">
            {/* Risk Score */}
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-border">
              <span className="text-xs text-muted-foreground">Risk Score</span>
              <span
                className={cn(
                  "text-2xl font-bold",
                  riskScore > 5 ? "text-destructive" : riskScore > 2 ? "text-brand-gold" : "text-secondary-green"
                )}
              >
                {riskScore}
              </span>
            </div>

            {/* Risk Breakdown */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1 p-2.5 rounded-md bg-destructive/10 text-center">
                <div className="text-lg font-bold text-destructive">{selectedItem.risks.high || 0}</div>
                <div className="text-[10px] text-destructive uppercase">High</div>
              </div>
              <div className="flex-1 p-2.5 rounded-md bg-brand-gold/10 text-center">
                <div className="text-lg font-bold text-brand-gold">{selectedItem.risks.medium || 0}</div>
                <div className="text-[10px] text-brand-gold uppercase">Medium</div>
              </div>
              <div className="flex-1 p-2.5 rounded-md bg-secondary-green/10 text-center">
                <div className="text-lg font-bold text-secondary-green">{selectedItem.risks.low || 0}</div>
                <div className="text-[10px] text-secondary-green uppercase">Low</div>
              </div>
            </div>

            {/* Warnings */}
            {selectedItem.type === 'keyResult' && daysToDue !== null && daysToDue < 60 && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-brand-gold/10 border border-brand-gold/30">
                <AlertTriangle className="h-4 w-4 text-brand-gold" />
                <span className="text-xs text-brand-gold">
                  Due in {daysToDue} days — risk exposure elevated
                </span>
              </div>
            )}

            {selectedItem.status === 'blocked' && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/30 mt-3">
                <X className="h-4 w-4 text-destructive" />
                <span className="text-xs text-destructive">
                  This item is currently blocked — escalation may be required
                </span>
              </div>
            )}
          </div>
        </DrawerSection>

        {/* Linked Work & Coverage Section */}
        <DrawerSection title="Linked Work & Coverage" icon={Link2}>
          <div className="p-4 bg-card rounded-lg border border-border">
            <div className="flex gap-3 mb-4">
              {selectedItem.type === 'objective' && (
                <>
                  <div className="flex-1 p-2.5 rounded-md bg-muted text-center">
                    <div className="text-xl font-bold text-foreground">{metrics.krCount || 0}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Key Results</div>
                  </div>
                  <div className="flex-1 p-2.5 rounded-md bg-muted text-center">
                    <div className="text-xl font-bold text-foreground">{metrics.workItemCount || 0}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Work Items</div>
                  </div>
                </>
              )}

              {selectedItem.type === 'keyResult' && (
                <div className="flex-1 p-2.5 rounded-md bg-muted text-center">
                  <div className="text-xl font-bold text-foreground">{metrics.workItemCount || 0}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Work Items</div>
                </div>
              )}

              {selectedItem.type === 'workItem' && (
                <div className="flex-1 p-2.5 rounded-md bg-muted text-center">
                  <div className="text-xl font-bold text-foreground">
                    {(selectedItem as WorkItem).dependencies?.length || 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase">Dependencies</div>
                </div>
              )}
            </div>

            {/* Coverage Gaps */}
            {selectedItem.type === 'objective' && (metrics.krsWithoutWork || 0) > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-brand-gold/10 border border-brand-gold/30">
                <AlertTriangle className="h-4 w-4 text-brand-gold" />
                <span className="text-xs text-brand-gold">
                  {metrics.krsWithoutWork} Key Result(s) have no linked delivery work
                </span>
              </div>
            )}

            {selectedItem.type === 'keyResult' && (metrics.krsWithoutWork || 0) > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-xs text-destructive">
                  KR may be unimplemented — no delivery work linked
                </span>
              </div>
            )}
          </div>
        </DrawerSection>

        {/* Value & Outcomes Section */}
        <DrawerSection title="Value & Outcomes" icon={DollarSign}>
          <div className="p-4 bg-card rounded-lg border border-border">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-md bg-muted text-center">
                <div className="text-xs text-muted-foreground mb-1">Estimated Value</div>
                <div className="text-base font-bold text-foreground">
                  {formatCurrency(selectedItem.value?.estimated || 0)}
                </div>
              </div>
              <div className="p-3 rounded-md bg-secondary-green/10 text-center">
                <div className="text-xs text-secondary-green mb-1">Realized Value</div>
                <div className="text-base font-bold text-secondary-green">
                  {formatCurrency(selectedItem.value?.realized || 0)}
                </div>
              </div>
            </div>

            {/* Value Realization */}
            <div className="mb-3">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Value Realization</span>
                <span className="text-xs font-semibold text-foreground">{valueRealization}%</span>
              </div>
              <Progress value={valueRealization} className="h-1.5" />
            </div>

            {/* Value at Risk */}
            {selectedItem.value?.valueAtRisk !== undefined ? (
              <div className={cn(
                "p-2.5 rounded-md border",
                riskScore > 3 ? "bg-brand-gold/10 border-brand-gold/30" : "bg-muted border-border"
              )}>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Value at Risk</span>
                  <span className={cn("text-sm font-semibold", riskScore > 3 ? "text-brand-gold" : "text-foreground")}>
                    {formatCurrency(selectedItem.value.valueAtRisk)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-md bg-muted border border-border">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Value at Risk</span>
                  <span className="text-xs text-muted-foreground italic">Not yet calculated</span>
                </div>
              </div>
            )}
          </div>
        </DrawerSection>

        {/* Alignment & Context Section */}
        <DrawerSection title="Alignment & Context" icon={GitBranch}>
          <div className="p-4 bg-card rounded-lg border border-border">
            {/* Alignment Path */}
            <div>
              <div className="text-xs text-muted-foreground mb-2.5">Alignment Path</div>
              <div className="flex flex-col gap-1.5">
                {alignmentPath.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2"
                    style={{ paddingLeft: `${index * 16}px` }}
                  >
                    {index > 0 && <span className="text-muted-foreground text-sm">↳</span>}
                    <span className="text-[10px] text-muted-foreground uppercase min-w-[70px]">
                      {item.type}
                    </span>
                    <span className="text-xs text-foreground truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DrawerSection>
      </div>
    </div>
  );
}
