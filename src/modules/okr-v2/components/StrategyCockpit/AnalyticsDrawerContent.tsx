// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Analytics Drawer Content (Executive View)
// Concise, executive-ready view with quantitative and qualitative insights
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { TrendingUp, Shield, Link2, Lightbulb, ChevronDown, ChevronRight, AlertTriangle, Clock, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { Theme, Objective, KeyResult, WorkItem, TreeItem, StatusCode, RollupMetrics } from '../../lib/okrTypes';
import {
  getObjectiveRollupMetrics,
  getStatusLabel,
  getStatusColor,
  getDaysUntilDue,
} from '../../lib/okrMetrics';

interface AnalyticsDrawerContentProps {
  selectedItem: TreeItem;
  themes: Theme[];
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS FOR EXECUTIVE METRICS
// ─────────────────────────────────────────────────────────────────────────────────

function getHighRiskCount(item: TreeItem): number {
  return item.risks?.high || 0;
}

function getBlockedWorkCount(item: TreeItem, objective?: Objective): number {
  if (item.type === 'objective' && objective) {
    return objective.keyResults?.reduce((count, kr) => 
      count + (kr.workItems?.filter(wi => wi.status === 'blocked').length || 0), 0) || 0;
  }
  if (item.type === 'keyResult') {
    const kr = item as KeyResult;
    return kr.workItems?.filter(wi => wi.status === 'blocked').length || 0;
  }
  return 0;
}

function getDelayedWorkCount(item: TreeItem, objective?: Objective): number {
  if (item.type === 'objective' && objective) {
    return objective.keyResults?.reduce((count, kr) => 
      count + (kr.workItems?.filter(wi => (wi.daysVariance ?? 0) > 0).length || 0), 0) || 0;
  }
  if (item.type === 'keyResult') {
    const kr = item as KeyResult;
    return kr.workItems?.filter(wi => (wi.daysVariance ?? 0) > 0).length || 0;
  }
  return 0;
}

function buildExecutiveInsights(
  item: TreeItem,
  metrics: Partial<RollupMetrics>,
  highRisks: number,
  blockedWork: number,
  delayedWork: number,
  daysToDue: number | null
): string[] {
  const insights: string[] = [];
  const progress = item.progress || 0;

  // Priority 1: Progress vs time concerns
  if (daysToDue !== null && daysToDue > 0 && daysToDue <= 30) {
    const expectedProgress = Math.max(0, 100 - (daysToDue / 30) * 100);
    if (progress < expectedProgress * 0.5) {
      insights.push('Progress is significantly behind schedule relative to time remaining; consider scope cut or fast-tracking delivery.');
    }
  }

  if (daysToDue !== null && daysToDue < 0) {
    insights.push(`${Math.abs(daysToDue)} days past target date.`);
  }

  // Priority 2: High risks
  if (highRisks > 0) {
    insights.push(`There ${highRisks === 1 ? 'is' : 'are'} ${highRisks} open high-severity risk${highRisks > 1 ? 's' : ''} requiring active mitigation and periodic review.`);
  }

  // Priority 3: Blocked/delayed items
  if (blockedWork > 0 || delayedWork > 0) {
    const parts: string[] = [];
    if (blockedWork > 0) parts.push(`${blockedWork} blocked`);
    if (delayedWork > 0) parts.push(`${delayedWork} trending late`);
    insights.push(`${parts.join(' and ')} delivery item${blockedWork + delayedWork > 1 ? 's' : ''}; risk of delay.`);
  }

  // Priority 4: KRs without work (for objectives only)
  if (item.type === 'objective' && metrics.krsWithoutWork && metrics.krsWithoutWork > 0) {
    insights.push(`${metrics.krsWithoutWork} KR${metrics.krsWithoutWork > 1 ? 's have' : ' has'} no linked delivery work; risk of 'paper OKR' with no execution plan.`);
  }

  // Priority 5: Positive outlook
  if (insights.length === 0 && progress >= 50 && highRisks === 0 && blockedWork === 0) {
    insights.push(item.type === 'objective' 
      ? 'Objective is broadly on track with low delivery risk at this stage.'
      : 'Key Result is on track with low delivery risk.');
  }

  return insights.slice(0, 4);
}

// ─────────────────────────────────────────────────────────────────────────────────
// SECTION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

function DrawerSection({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <Icon className="h-4 w-4 text-brand-gold" />
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

export function AnalyticsDrawerContent({ selectedItem, themes }: AnalyticsDrawerContentProps) {
  const [alignmentOpen, setAlignmentOpen] = useState(false);

  const theme = themes.find((t) => t.id === (selectedItem as any).themeId);
  const themeColor = theme?.color || 'hsl(var(--brand-gold))';
  
  const objective = selectedItem.type === 'objective' 
    ? selectedItem as Objective 
    : theme?.objectives?.find((o) => o.id === (selectedItem as any).objectiveId);

  const keyResult = selectedItem.type === 'keyResult' ? selectedItem as KeyResult : undefined;

  const metrics: Partial<RollupMetrics> = selectedItem.type === 'objective' 
    ? getObjectiveRollupMetrics(selectedItem as Objective)
    : selectedItem.type === 'keyResult'
      ? { workItemCount: (selectedItem as KeyResult).workItems?.length || 0, krsWithoutWork: 0 }
      : {};

  const daysToDue = getDaysUntilDue((selectedItem as any).dueDate);
  const highRisks = getHighRiskCount(selectedItem);
  const blockedWork = getBlockedWorkCount(selectedItem, objective);
  const delayedWork = getDelayedWorkCount(selectedItem, objective);
  const insights = buildExecutiveInsights(selectedItem, metrics, highRisks, blockedWork, delayedWork, daysToDue);

  const headerLabel = selectedItem.type === 'objective' ? 'OBJECTIVE' : selectedItem.type === 'keyResult' ? 'KEY RESULT' : 'DELIVERY ITEM';

  // Status chips for KRs (only show counts > 0)
  const statusChips = selectedItem.type === 'objective' && metrics.krsByStatus
    ? Object.entries(metrics.krsByStatus).filter(([_, count]) => count > 0)
    : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 bg-card border-b border-brand-gold">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider" style={{ backgroundColor: `${themeColor}15`, color: themeColor }}>
            {headerLabel}
          </span>
          <Badge variant={selectedItem.status === 'on-track' || selectedItem.status === 'completed' ? 'secondary' : 'destructive'}>
            {getStatusLabel(selectedItem.status)}
          </Badge>
        </div>

        <h3 className="text-lg font-semibold text-foreground leading-snug mb-3">{selectedItem.name}</h3>

        {theme && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border" style={{ backgroundColor: `${themeColor}10`, borderColor: `${themeColor}30` }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor }} />
            <span className="text-xs font-medium" style={{ color: themeColor }}>{theme.name}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* Performance */}
        <DrawerSection title="Performance" icon={TrendingUp}>
          <div className="space-y-3">
            <div className="p-4 bg-card rounded-lg border border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">Overall Progress</span>
                <span className={cn("text-xl font-bold", selectedItem.progress >= 70 ? "text-secondary-green" : selectedItem.progress >= 40 ? "text-brand-gold" : "text-destructive")}>
                  {selectedItem.progress}%
                </span>
              </div>
              <Progress value={Math.min(selectedItem.progress, 100)} className="h-2" />
            </div>

            {/* KR Actual vs Target */}
            {selectedItem.type === 'keyResult' && keyResult && (
              <div className="p-4 bg-card rounded-lg border border-border flex items-center gap-3">
                <Target className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">
                  Current: <span className="font-semibold">{keyResult.actual ?? '—'}{keyResult.unit === '%' ? '%' : ` ${keyResult.unit || ''}`}</span>
                  {' / '}
                  Target: <span className="font-semibold">{keyResult.target ?? '—'}{keyResult.unit === '%' ? '%' : ` ${keyResult.unit || ''}`}</span>
                </span>
              </div>
            )}

            {/* Status chips for Objective */}
            {statusChips.length > 0 && (
              <div className="p-4 bg-card rounded-lg border border-border">
                <span className="text-xs text-muted-foreground block mb-2">Key Results by Status</span>
                <div className="flex gap-2 flex-wrap">
                  {statusChips.map(([status, count]) => (
                    <div key={status} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border" style={{ backgroundColor: `${getStatusColor(status as StatusCode)}10`, borderColor: `${getStatusColor(status as StatusCode)}30` }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStatusColor(status as StatusCode) }} />
                      <span className="text-xs">{count} {getStatusLabel(status as StatusCode)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time to Target */}
            {daysToDue !== null && (
              <div className="p-4 bg-card rounded-lg border border-border flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className={cn("text-sm", daysToDue < 0 && "text-destructive")}>
                  {daysToDue >= 0 ? `${daysToDue} days to target` : `${Math.abs(daysToDue)} days past target`}
                </span>
              </div>
            )}
          </div>
        </DrawerSection>

        {/* Risks & Delivery Health */}
        <DrawerSection title="Risks & Delivery Health" icon={Shield}>
          <div className="p-4 bg-card rounded-lg border border-border">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className={cn("p-3 rounded-lg", highRisks > 0 ? "bg-destructive/10" : "bg-muted/50")}>
                <div className={cn("text-2xl font-bold", highRisks > 0 ? "text-destructive" : "text-foreground")}>{highRisks}</div>
                <div className="text-xs text-muted-foreground uppercase">High risks</div>
              </div>
              <div className={cn("p-3 rounded-lg", blockedWork > 0 ? "bg-amber-500/10" : "bg-muted/50")}>
                <div className={cn("text-2xl font-bold", blockedWork > 0 ? "text-amber-600" : "text-foreground")}>{blockedWork}</div>
                <div className="text-xs text-muted-foreground uppercase">Blocked items</div>
              </div>
              <div className={cn("p-3 rounded-lg", delayedWork > 0 ? "bg-amber-500/10" : "bg-muted/50")}>
                <div className={cn("text-2xl font-bold", delayedWork > 0 ? "text-amber-600" : "text-foreground")}>{delayedWork}</div>
                <div className="text-xs text-muted-foreground uppercase">Delayed items</div>
              </div>
            </div>
          </div>
        </DrawerSection>

        {/* Linked Work & Coverage */}
        <DrawerSection title="Linked Work & Coverage" icon={Link2}>
          <div className="p-4 bg-card rounded-lg border border-border">
            {selectedItem.type === 'objective' && (
              <>
                <div className="grid grid-cols-3 gap-3 text-center mb-3">
                  <div><div className="text-2xl font-bold text-foreground">{metrics.krCount || 0}</div><div className="text-xs text-muted-foreground uppercase">Total KRs</div></div>
                  <div><div className="text-2xl font-bold text-secondary-green">{(metrics.krCount || 0) - (metrics.krsWithoutWork || 0)}</div><div className="text-xs text-muted-foreground uppercase">KRs with work</div></div>
                  <div><div className="text-2xl font-bold text-amber-600">{metrics.krsWithoutWork || 0}</div><div className="text-xs text-muted-foreground uppercase">KRs without work</div></div>
                </div>
                {(metrics.krsWithoutWork || 0) > 0 && (
                  <div className="pt-3 border-t border-border flex items-center gap-2 text-sm text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{metrics.krsWithoutWork} Key Result{(metrics.krsWithoutWork || 0) > 1 ? 's have' : ' has'} no linked delivery work.</span>
                  </div>
                )}
              </>
            )}
            {selectedItem.type === 'keyResult' && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><div className="text-2xl font-bold text-foreground">{metrics.workItemCount || 0}</div><div className="text-xs text-muted-foreground uppercase">Total work</div></div>
                <div><div className="text-2xl font-bold text-amber-600">{blockedWork}</div><div className="text-xs text-muted-foreground uppercase">Blocked</div></div>
                <div><div className="text-2xl font-bold text-amber-600">{delayedWork}</div><div className="text-xs text-muted-foreground uppercase">Delayed</div></div>
              </div>
            )}
          </div>
        </DrawerSection>

        {/* Executive Insights */}
        {insights.length > 0 && (
          <DrawerSection title="Executive Insights" icon={Lightbulb}>
            <div className="p-4 bg-card rounded-lg border border-border">
              <ul className="space-y-2">
                {insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-brand-gold mt-0.5">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </DrawerSection>
        )}

        {/* Alignment & Context (Collapsible) */}
        <Collapsible open={alignmentOpen} onOpenChange={setAlignmentOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded px-2 -mx-2">
            {alignmentOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Alignment & Context</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 bg-card rounded-lg border border-border mt-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {theme && (
                  <>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor }} />
                      <span>{theme.name}</span>
                    </div>
                    <span className="text-muted-foreground">→</span>
                  </>
                )}
                {objective && (
                  <>
                    <div className="px-2 py-1 bg-muted rounded truncate max-w-48">{objective.name}</div>
                    {keyResult && <span className="text-muted-foreground">→</span>}
                  </>
                )}
                {keyResult && <div className="px-2 py-1 bg-muted rounded truncate max-w-48">{keyResult.name}</div>}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
