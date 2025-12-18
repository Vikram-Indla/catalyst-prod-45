/**
 * ExposureGapsSection — CIO Cockpit exposure surface
 * Clean 3-column executive block with equal weight cards
 * Compact rows, thin bars, improved scannability
 * 
 * TYPOGRAPHY LOCK (CIO COCKPIT UX — NON-NEGOTIABLE):
 * ─────────────────────────────────────────────────
 * - Section title: 12px, semibold, uppercase, tracking 0.08em
 * - Card label: 14px, medium weight, secondary color
 * - Data row label: 12px, muted color
 * - Data row value: 14px, medium weight, primary color
 * 
 * LOADING BEHAVIOR:
 * - Skeleton allowed ONCE on initial load only
 * - After first success: NEVER show skeleton again
 * - During refresh: show "Refreshing…" in header, keep content visible
 * - NO greying, NO opacity reduction, NO layout shift
 * 
 * FORBIDDEN:
 * - NO opacity-*, NO text-white/* on content text
 * - NO undefined/NaN values passed to bars/charts
 */

import { useNavigate } from 'react-router-dom';
import { useStrategyRoomSummary, EMPTY_SUMMARY } from '@/hooks/useStrategyRoomSummary';
import { 
  AlertTriangle, 
  Shield, 
  Target, 
  Clock, 
  ChevronRight,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { TYPOGRAPHY, TEXT_COLORS } from './strategyRoomTypography';

interface ExposureGapsSectionProps {
  snapshotId?: string;
}

interface AttentionItem {
  id: string;
  type: 'objective' | 'risk' | 'gap';
  title: string;
  reason: string;
  severity: 'critical' | 'high' | 'medium';
  link: string;
}

export function ExposureGapsSection({ snapshotId }: ExposureGapsSectionProps) {
  const navigate = useNavigate();
  
  const { data, isLoading, isFetching, hasData, isStale, error } = useStrategyRoomSummary(snapshotId);
  
  const displayData = data ?? EMPTY_SUMMARY;
  
  // Show stale indicator if we're showing cached data after an error
  const showStaleIndicator = isStale && !isFetching && !!error;

  const attentionItems = useMemo((): AttentionItem[] => {
    const items: AttentionItem[] = [];
    
    (displayData.atRiskObjectives || []).slice(0, 2).forEach(obj => {
      items.push({
        id: `obj-${obj.id}`,
        type: 'objective',
        title: obj.name || 'Unnamed Objective',
        reason: 'At risk',
        severity: 'high',
        link: '/enterprise/okr-hub',
      });
    });

    (displayData.topRisks || []).slice(0, 2).forEach(risk => {
      items.push({
        id: `risk-${risk.id}`,
        type: 'risk',
        title: risk.title || 'Unnamed Risk',
        reason: 'High severity',
        severity: 'critical',
        link: '/enterprise/risks',
      });
    });

    if (displayData.alignmentGaps > 0) {
      items.push({
        id: 'alignment-gaps',
        type: 'gap',
        title: `${displayData.alignmentGaps} Alignment Gap${displayData.alignmentGaps !== 1 ? 's' : ''}`,
        reason: `${displayData.misalignedEpics} epics, ${displayData.misalignedFeatures} features`,
        severity: displayData.alignmentGaps > 5 ? 'high' : 'medium',
        link: '/enterprise/backlog',
      });
    }

    return items;
  }, [displayData.atRiskObjectives, displayData.topRisks, displayData.alignmentGaps, displayData.misalignedEpics, displayData.misalignedFeatures]);

  // Skeleton only on first load
  if (isLoading && !hasData) {
    return (
      <section 
        className="rounded-lg overflow-hidden bg-card border border-border"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <div className="px-4 py-2.5 border-b border-border/50">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {['c1', 'c2', 'c3'].map((key) => (
              <div key={key} className="rounded-md p-3 bg-muted border border-border/50 min-h-[150px]">
                <Skeleton className="h-4 w-28 mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const isUpdating = isFetching && hasData;

  return (
    <section 
      className="rounded-lg overflow-hidden bg-card border border-border"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {/* Section Header */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-destructive" />
          <h2 className={cn(TYPOGRAPHY.sectionTitle, TEXT_COLORS.primary)}>
            Exposure & Gaps
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Stale data indicator - CATALYST STANDARD */}
          {showStaleIndicator && (
            <span className="text-[11px] text-foreground/70 italic">
              Data may be stale
            </span>
          )}
          {/* Refreshing indicator - CATALYST STANDARD */}
          {isUpdating && (
            <div className="text-[11px] text-foreground/70 flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" />
              <span>Refreshing…</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Risk Exposure Column */}
          <CockpitCard
            title="Risk Exposure"
            icon={<Shield size={14} />}
            iconColor="text-destructive"
            cta={{ label: 'View all', onClick: () => navigate('/enterprise/risks') }}
          >
            <div className="space-y-1.5">
              <DataRow 
                label="Critical/High" 
                value={displayData.highRisks} 
                total={displayData.totalRisks}
                variant={displayData.highRisks > 0 ? 'danger' : 'neutral'} 
                showBar
              />
              <DataRow 
                label="Medium" 
                value={displayData.mediumRisks} 
                total={displayData.totalRisks}
                variant={displayData.mediumRisks > 0 ? 'warning' : 'neutral'} 
                showBar
              />
              <DataRow 
                label="Low" 
                value={displayData.lowRisks} 
                total={displayData.totalRisks}
                variant="neutral" 
                showBar
              />
            </div>

            {displayData.overdueRisks > 0 && (
              <div className="pt-2 mt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-destructive" />
                    <span className={cn(TYPOGRAPHY.dataRowLabel, 'text-foreground/80')}>Overdue</span>
                  </div>
                  <span className={cn(TYPOGRAPHY.secondaryMetric, 'text-destructive')}>
                    {displayData.overdueRisks}
                  </span>
                </div>
              </div>
            )}
          </CockpitCard>

          {/* Alignment Gaps Column */}
          <CockpitCard
            title="Alignment Gaps"
            icon={<Target size={14} />}
            iconColor="text-secondary-bronze"
            cta={{ label: 'View backlog', onClick: () => navigate('/enterprise/backlog') }}
          >
            <div className="space-y-1.5">
              <DataRow label="Orphan Themes" value={0} variant="neutral" />
              <DataRow 
                label="Unlinked Epics" 
                value={displayData.misalignedEpics} 
                variant={displayData.misalignedEpics > 0 ? 'bronze' : 'neutral'} 
              />
              <DataRow 
                label="Unlinked Features" 
                value={displayData.misalignedFeatures} 
                variant={displayData.misalignedFeatures > 0 ? 'bronze' : 'neutral'} 
              />
            </div>

            <div className="pt-2 mt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className={cn(TYPOGRAPHY.cardLabel, 'text-foreground/80')}>Total gaps</span>
                <span className={cn(
                  TYPOGRAPHY.secondaryMetric,
                  displayData.alignmentGaps > 0 ? 'text-secondary-bronze' : TEXT_COLORS.primary
                )}>
                  {displayData.alignmentGaps}
                </span>
              </div>
            </div>
          </CockpitCard>

          {/* Needs Attention Column */}
          <CockpitCard
            title="Needs Attention"
            icon={<AlertTriangle size={14} />}
            iconColor="text-status-warning"
          >
            {attentionItems.length === 0 ? (
              <div className="py-4 text-center">
                <CheckCircle2 size={20} className="mx-auto mb-1.5 text-primary" />
                <span className={cn(TYPOGRAPHY.subtext, 'text-foreground/80')}>No items need attention</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {attentionItems.slice(0, 4).map((item, index) => (
                  <AttentionRow key={item.id} item={item} onClick={() => navigate(item.link)} index={index} />
                ))}
                {attentionItems.length > 4 && (
                  <div className="text-center pt-1.5">
                    <span className={cn(TYPOGRAPHY.microcopy, 'text-foreground/70')}>
                      +{attentionItems.length - 4} more
                    </span>
                  </div>
                )}
              </div>
            )}
          </CockpitCard>
        </div>
      </div>
    </section>
  );
}

interface CockpitCardProps {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  children: React.ReactNode;
  cta?: { label: string; onClick: () => void };
}

function CockpitCard({ title, icon, iconColor, children, cta }: CockpitCardProps) {
  return (
    <div className="rounded-md overflow-hidden flex flex-col bg-muted/50 border border-border/50 min-h-[150px]">
      {/* Card header */}
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-border/50 bg-muted/70">
        <span className={iconColor}>{icon}</span>
        <span className={cn(TYPOGRAPHY.sectionTitle, TEXT_COLORS.primary)}>
          {title}
        </span>
      </div>
      
      <div className="p-3 flex-1">{children}</div>

      {/* CTA - secondary but discoverable */}
      {cta && (
        <div className="px-3 pb-2.5">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              TYPOGRAPHY.ctaButton, 
              "w-full h-8 text-foreground/70",
              "transition-[background-color,color] duration-150",
              "hover:bg-accent/50 hover:text-foreground/80",
              "focus-visible:ring-1"
            )}
            onClick={cta.onClick}
          >
            {cta.label}
            <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface DataRowProps {
  label: string;
  value: number;
  total?: number;
  variant?: 'neutral' | 'danger' | 'warning' | 'bronze';
  showBar?: boolean;
}

function DataRow({ label, value, total = 0, variant = 'neutral', showBar }: DataRowProps) {
  const valueColors: Record<string, string> = {
    neutral: TEXT_COLORS.primary,
    danger: 'text-destructive',
    warning: 'text-status-warning',
    bronze: 'text-secondary-bronze',
  };

  const barColors: Record<string, string> = {
    neutral: 'bg-foreground/40',
    danger: 'bg-destructive',
    warning: 'bg-status-warning',
    bronze: 'bg-secondary-bronze',
  };

  const barWidth = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2 py-1.5 rounded px-2 -mx-2 transition-[background-color] duration-100 hover:bg-accent/40">
      {/* Label - readable secondary text */}
      <span className={cn(TYPOGRAPHY.dataRowLabel, 'text-foreground/80 flex-1')}>{label}</span>
      
      {/* Bar - visually aligned with value, never overpowers */}
      {showBar && total > 0 && (
        <div className="w-14 h-1.5 rounded-full overflow-hidden bg-border/60">
          <div 
            className={cn("h-full rounded-full", barColors[variant], variant !== 'neutral' ? 'opacity-80' : '')}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      )}
      
      {/* Value - primary anchor for the eye */}
      <span className={cn(TYPOGRAPHY.dataRowValue, 'w-7 text-right font-medium', valueColors[variant])}>
        {value}
      </span>
    </div>
  );
}

function AttentionRow({ item, onClick, index }: { item: AttentionItem; onClick: () => void; index: number }) {
  const severityColors: Record<string, string> = {
    critical: 'bg-destructive',
    high: 'bg-status-warning',
    medium: 'bg-secondary-bronze',
  };

  // First two items visually prioritized, remaining de-emphasized
  const isPriority = index < 2;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-2 py-2 rounded text-left flex items-center gap-2.5",
        "transition-[background-color] duration-100",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "group hover:bg-accent/40"
      )}
    >
      {/* Severity dot - calm, not alarming */}
      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", severityColors[item.severity])} />
      <div className="flex-1 min-w-0">
        {/* Title - priority items have stronger weight */}
        <div className={cn(
          TYPOGRAPHY.cardLabel, 
          'truncate',
          isPriority ? TEXT_COLORS.primary : 'text-foreground/80'
        )}>
          {item.title}
        </div>
        {/* Reason - secondary */}
        <div className={cn(
          TYPOGRAPHY.microcopy, 
          'leading-tight text-foreground/70'
        )}>
          {item.reason}
        </div>
      </div>
      <ChevronRight 
        size={14} 
        className="opacity-0 group-hover:opacity-60 transition-opacity duration-100 flex-shrink-0 text-foreground/70" 
      />
    </button>
  );
}
