// ═══════════════════════════════════════════════════════════════════════════════
// CATALYST OBJECTIVE ANALYTICS DRAWER
// Executive-ready analytics panel for strategic objectives
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { X, Shield, Link2, Lightbulb, ChevronDown, ChevronUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useObjectiveAnalytics } from '../../hooks/useObjectiveAnalytics';
import type { ObjectiveAnalyticsData, InsightSeverity } from '../../lib/objectiveAnalytics';

interface ObjectiveAnalyticsDrawerProps {
  objectiveId: string | null;
  open: boolean;
  onClose: () => void;
  snapshotId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground">
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

function ThemeChip({ name, color }: { name: string; color: string }) {
  return (
    <div 
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border"
      style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
    >
      <span 
        className="w-2.5 h-2.5 rounded-full" 
        style={{ backgroundColor: color }} 
      />
      <span className="text-[13px] font-medium" style={{ color }}>
        {name}
      </span>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-3 border-b border-border mb-4">
      <Icon className="h-[18px] w-[18px] text-brand-gold" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </span>
    </div>
  );
}

function MetricCard({ 
  value, 
  label, 
  highlight = false, 
  highlightType = 'risk' 
}: { 
  value: number; 
  label: string; 
  highlight?: boolean; 
  highlightType?: 'risk' | 'warning';
}) {
  const getHighlightStyle = () => {
    if (!highlight) return 'bg-muted/50 border-border';
    if (highlightType === 'risk') return 'bg-destructive/10 border-destructive/30';
    return 'bg-amber-500/10 border-amber-500/30';
  };

  const getValueColor = () => {
    if (!highlight) return 'text-foreground';
    if (highlightType === 'risk') return 'text-destructive';
    return 'text-amber-600';
  };

  return (
    <div className={cn(
      'flex-1 flex flex-col items-center justify-center p-5 rounded-lg border transition-all',
      getHighlightStyle()
    )}>
      <span className={cn('text-3xl font-bold leading-none mb-1.5', getValueColor())}>
        {value}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
        {label}
      </span>
    </div>
  );
}

function AlertBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2.5 p-3 bg-amber-500/10 rounded-lg mt-3">
      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
      <span className="text-[13px] text-amber-600 font-medium leading-snug">
        {message}
      </span>
    </div>
  );
}

function InsightBullet({ text, severity }: { text: string; severity: InsightSeverity }) {
  const dotColor = severity === 'high' ? 'bg-destructive' : severity === 'medium' ? 'bg-amber-500' : 'bg-brand-gold';
  
  return (
    <div className="flex items-start gap-3 py-1">
      <span className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', dotColor)} />
      <p className="text-[13px] text-foreground leading-relaxed m-0">
        {text}
      </p>
    </div>
  );
}

function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false 
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 w-full pb-3 border-b border-border bg-transparent cursor-pointer hover:opacity-80 transition-opacity"
      >
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </button>
      {isOpen && <div className="pt-4">{children}</div>}
    </div>
  );
}

function AlignmentBreadcrumb({ themeName, themeColor, objectiveName }: { themeName: string; themeColor: string; objectiveName: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border">
      <div className="flex items-center gap-2">
        <span 
          className="w-2.5 h-2.5 rounded-full" 
          style={{ backgroundColor: themeColor }} 
        />
        <span className="text-[13px] font-medium text-foreground">
          {themeName}
        </span>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
      <span className="text-[13px] text-muted-foreground truncate flex-1">
        {objectiveName}
      </span>
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

function DrawerContent({ analytics }: { analytics: ObjectiveAnalyticsData }) {
  const { baseline, risks, coverage, insights, alignment } = analytics;

  const hasNoRisks = risks.high === 0 && risks.blockedItems === 0 && risks.delayedItems === 0;

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

        <h2 className="text-lg font-semibold text-foreground leading-snug mb-4">
          {analytics.name}
        </h2>

        <ThemeChip name={alignment.themeName} color={alignment.themeColor} />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Risks & Delivery Health */}
        <div className="mb-7">
          <SectionHeader icon={Shield} title="Risks & Delivery Health" />
          
          {hasNoRisks ? (
            <div className="p-4 bg-muted/50 rounded-lg border border-border text-center">
              <span className="text-sm text-muted-foreground">No active risks logged</span>
            </div>
          ) : (
            <div className="p-4 bg-card rounded-xl border border-border">
              <div className="flex gap-3">
                <MetricCard 
                  value={risks.high} 
                  label="High Risks" 
                  highlight={risks.high > 0}
                  highlightType="risk"
                />
                <MetricCard 
                  value={risks.blockedItems} 
                  label="Blocked Items" 
                  highlight={risks.blockedItems > 0}
                  highlightType="warning"
                />
                <MetricCard 
                  value={risks.delayedItems} 
                  label="Delayed Items" 
                  highlight={risks.delayedItems > 0}
                  highlightType="warning"
                />
              </div>
            </div>
          )}
        </div>

        {/* Linked Work & Coverage */}
        <div className="mb-7">
          <SectionHeader icon={Link2} title="Linked Work & Coverage" />
          
          <div className="p-4 bg-card rounded-xl border border-border">
            <div className="flex gap-3">
              <MetricCard value={coverage.totalKRs} label="Total KRs" />
              <MetricCard value={coverage.krsWithWork} label="KRs with Work" />
              <MetricCard 
                value={coverage.krsWithoutWork} 
                label="KRs without Work" 
                highlight={coverage.krsWithoutWork > 0}
                highlightType="warning"
              />
            </div>
            
            {coverage.krsWithoutWork > 0 && (
              <AlertBanner 
                message={`${coverage.krsWithoutWork} Key Result${coverage.krsWithoutWork > 1 ? 's have' : ' has'} no linked delivery work.`}
              />
            )}
          </div>
        </div>

        {/* Executive Insights */}
        {insights.length > 0 && (
          <div className="mb-7">
            <SectionHeader icon={Lightbulb} title="Executive Insights" />
            
            <div className="p-4 bg-card rounded-xl border border-border">
              <div className="flex flex-col gap-3">
                {insights.map((insight, index) => (
                  <InsightBullet 
                    key={index} 
                    text={insight.text} 
                    severity={insight.severity}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Alignment & Context (Collapsible) */}
        <CollapsibleSection title="Alignment & Context" defaultOpen>
          <AlignmentBreadcrumb 
            themeName={alignment.themeName}
            themeColor={alignment.themeColor}
            objectiveName={alignment.objectiveName}
          />
        </CollapsibleSection>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────────

export function ObjectiveAnalyticsDrawer({ 
  objectiveId, 
  open, 
  onClose,
  snapshotId 
}: ObjectiveAnalyticsDrawerProps) {
  const { analytics, isLoading, error } = useObjectiveAnalytics(objectiveId, snapshotId);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent 
        side="right" 
        className="w-screen sm:w-[440px] sm:max-w-[440px] p-0 flex flex-col border-l-4 border-l-brand-gold"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Objective Analytics</SheetTitle>
        </SheetHeader>

        {isLoading && <DrawerSkeleton />}
        
        {error && (
          <div className="p-6 text-center text-destructive">
            <p>Failed to load objective analytics</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        )}

        {!isLoading && !error && analytics && (
          <DrawerContent analytics={analytics} />
        )}

        {!isLoading && !error && !analytics && objectiveId && (
          <div className="p-6 text-center text-muted-foreground">
            <p>Objective not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
