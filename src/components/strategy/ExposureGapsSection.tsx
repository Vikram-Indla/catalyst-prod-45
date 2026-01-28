/**
 * ExposureGapsSection — CIO Cockpit exposure surface
 * Uses global Catalyst design tokens
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
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

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
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-muted/20">
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="p-3 space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const isUpdating = isFetching && hasData;

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Section Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-red-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Exposure & Gaps</span>
        </div>
        <div className="flex items-center gap-2">
          {showStaleIndicator && (
            <span className="text-[10px] text-muted-foreground italic">
              Data may be stale
            </span>
          )}
          {isUpdating && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" />
              <span>Refreshing…</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Risk Exposure Panel */}
        <div className="rounded-lg border border-border overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-red-500" />
              <span className="text-sm font-semibold text-foreground">Risk Exposure</span>
            </div>
            <button 
              className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5"
              onClick={() => navigate('/enterprise/risks')}
            >
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="p-3 flex-1">
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

            {displayData.overdueRisks > 0 && (
              <div className="flex items-center justify-between py-2 border-t border-border mt-2 pt-2">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-red-500" />
                  <span className="text-sm text-muted-foreground">Overdue</span>
                </div>
                <span className="text-sm font-semibold text-red-500">
                  {displayData.overdueRisks}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Alignment Gaps Panel */}
        <div className="rounded-lg border border-border overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-amber-500" />
              <span className="text-sm font-semibold text-foreground">Alignment Gaps</span>
            </div>
            <button 
              className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5"
              onClick={() => navigate('/enterprise/backlog')}
            >
              View backlog <ChevronRight size={12} />
            </button>
          </div>
          <div className="p-3 flex-1">
            <DataRow label="Orphan Themes" value={0} variant="neutral" />
            <DataRow 
              label="Unlinked Epics" 
              value={displayData.misalignedEpics} 
              variant={displayData.misalignedEpics > 0 ? 'warning' : 'neutral'} 
            />
            <DataRow 
              label="Unlinked Features" 
              value={displayData.misalignedFeatures} 
              variant={displayData.misalignedFeatures > 0 ? 'warning' : 'neutral'} 
            />

            <div className="flex items-center justify-between py-2 border-t border-border mt-2 pt-2">
              <span className="text-sm font-semibold text-muted-foreground">Total gaps</span>
              <span className={cn(
                "text-sm font-semibold",
                displayData.alignmentGaps > 0 ? "text-amber-500" : "text-foreground"
              )}>
                {displayData.alignmentGaps}
              </span>
            </div>
          </div>
        </div>

        {/* Needs Attention Panel */}
        <div className="rounded-lg border border-border overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              <span className="text-sm font-semibold text-foreground">Needs Attention</span>
            </div>
          </div>
          <div className="p-3 flex-1">
            {attentionItems.length === 0 ? (
              <div className="py-4 text-center">
                <CheckCircle2 size={20} className="mx-auto mb-2 text-emerald-500" />
                <span className="text-sm text-muted-foreground">No items need attention</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {attentionItems.slice(0, 4).map((item) => (
                  <AttentionRow key={item.id} item={item} onClick={() => navigate(item.link)} />
                ))}
                {attentionItems.length > 4 && (
                  <div className="text-center pt-2">
                    <span className="text-xs text-primary font-medium">
                      +{attentionItems.length - 4} more
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

interface DataRowProps {
  label: string;
  value: number;
  total?: number;
  variant?: 'neutral' | 'danger' | 'warning';
  showBar?: boolean;
}

function DataRow({ label, value, total = 0, variant = 'neutral', showBar }: DataRowProps) {
  const barWidth = total > 0 ? Math.round((value / total) * 100) : 0;

  const getValueClass = () => {
    switch (variant) {
      case 'danger': return 'text-red-500';
      case 'warning': return 'text-amber-500';
      default: return 'text-foreground';
    }
  };

  const getBarClass = () => {
    switch (variant) {
      case 'danger': return 'bg-red-500';
      case 'warning': return 'bg-amber-500';
      default: return 'bg-muted-foreground';
    }
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      
      <div className="flex items-center gap-2">
        {showBar && total > 0 && (
          <div className="w-14 h-1.5 rounded-sm overflow-hidden bg-muted">
            <div 
              className={cn("h-full rounded-sm", getBarClass(), variant !== 'neutral' ? 'opacity-80' : 'opacity-50')}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        )}
        
        <span className={cn("text-sm font-semibold min-w-[28px] text-right", getValueClass())}>
          {value}
        </span>
      </div>
    </div>
  );
}

function AttentionRow({ item, onClick }: { item: AttentionItem; onClick: () => void }) {
  const getSeverityDotClass = () => {
    switch (item.severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-amber-500';
      default: return 'bg-amber-500';
    }
  };

  const getReasonClass = () => {
    switch (item.severity) {
      case 'critical': return 'text-red-600 dark:text-red-400';
      case 'high': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-amber-600 dark:text-amber-400';
    }
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors w-full text-left"
    >
      {/* Severity dot */}
      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", getSeverityDotClass())} />
      
      {/* Title */}
      <span className="flex-1 text-sm text-foreground truncate">
        {item.title}
      </span>
      
      {/* Reason badge */}
      <span className={cn("text-xs font-medium whitespace-nowrap flex-shrink-0", getReasonClass())}>
        {item.reason}
      </span>
    </button>
  );
}
