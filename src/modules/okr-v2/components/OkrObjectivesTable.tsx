// ═══════════════════════════════════════════════════════════════════════════════
// CATALYST OKR OBJECTIVES TABLE — Presentational Component
// Enterprise-grade table with brand tokens, baseline progress, and risk indicators
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendIcon } from './TrendIcon';
import type { TrendCode } from '../lib/okrTypes';

// ─────────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface OkrObjectiveRow {
  id: string;
  name: string;
  themeName: string;
  themeColor: string;
  status: string;
  progressActual: number | null;
  progressTrend: TrendCode;
  progressVariance: number | null;
  hasBaseline: boolean;
  highRiskCount: number;
  mediumRiskCount: number;
  blockedWorkCount: number;
  delayedWorkCount: number;
  linkedKrCount: number;
  linkedWorkItemCount: number;
}

interface OkrObjectivesTableProps {
  rows: OkrObjectiveRow[];
  onRowClick: (row: OkrObjectiveRow) => void;
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATUS PILL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'pending': { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
  'in-progress': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'on-track': { bg: 'bg-secondary-green/10', text: 'text-secondary-green', border: 'border-secondary-green/30' },
  'at-risk': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  'off-track': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  'blocked': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  'completed': { bg: 'bg-secondary-green/10', text: 'text-secondary-green', border: 'border-secondary-green/30' },
};

function StatusPill({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '-');
  const styles = STATUS_STYLES[normalizedStatus] || STATUS_STYLES['pending'];
  
  // Convert status to display format
  const displayStatus = status
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap',
        styles.bg,
        styles.text,
        styles.border
      )}
    >
      {displayStatus}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// PROGRESS BAR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

function ProgressBar({ 
  progress, 
  trend, 
  variance 
}: { 
  progress: number; 
  trend: TrendCode;
  variance: number | null;
}) {
  return (
    <div className="flex items-center justify-end gap-2.5 w-full">
      {/* Progress bar */}
      <Progress 
        value={Math.min(progress, 100)} 
        className="h-1.5 flex-1 max-w-24"
      />
      
      {/* Percentage */}
      <span className="text-sm font-semibold text-foreground min-w-[36px] text-right">
        {Math.round(progress)}%
      </span>
      
      {/* Trend icon */}
      {trend !== 'none' && <TrendIcon trend={trend} variance={variance} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// RISKS DISPLAY COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

function RisksDisplay({ 
  highRiskCount, 
  mediumRiskCount, 
  blockedWorkCount, 
  delayedWorkCount 
}: { 
  highRiskCount: number;
  mediumRiskCount: number;
  blockedWorkCount: number;
  delayedWorkCount: number;
}) {
  const totalRisks = highRiskCount + mediumRiskCount;
  const totalIssues = blockedWorkCount + delayedWorkCount;

  if (totalRisks === 0 && totalIssues === 0) {
    return (
      <span className="flex items-center justify-end w-full text-sm text-muted-foreground">
        —
      </span>
    );
  }

  // Build risk text
  let riskText = '';
  if (highRiskCount > 0 && mediumRiskCount > 0) {
    riskText = `${highRiskCount}H / ${mediumRiskCount}M`;
  } else if (highRiskCount > 0) {
    riskText = `${highRiskCount} High`;
  } else if (mediumRiskCount > 0) {
    riskText = `${mediumRiskCount} Medium`;
  }

  // Build issues text
  const issuesParts: string[] = [];
  if (blockedWorkCount > 0) issuesParts.push(`${blockedWorkCount} blocked`);
  if (delayedWorkCount > 0) issuesParts.push(`${delayedWorkCount} delayed`);
  const issuesText = issuesParts.join(', ');

  const hasHighRisk = highRiskCount > 0;

  return (
    <div className="flex flex-col items-end gap-0.5">
      {riskText && (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
            hasHighRisk
              ? 'bg-red-50 text-red-600'
              : 'bg-orange-50 text-orange-600'
          )}
        >
          {riskText}
        </span>
      )}
      {issuesText && (
        <span className="text-[10px] text-muted-foreground tracking-wide">
          {issuesText}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// LINKED CHIP COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

function LinkedChip({ 
  linkedKrCount, 
  linkedWorkItemCount 
}: { 
  linkedKrCount: number;
  linkedWorkItemCount: number;
}) {
  const text =
    linkedWorkItemCount > 0
      ? `${linkedKrCount} KRs · ${linkedWorkItemCount} Work`
      : `${linkedKrCount} KRs`;

  return (
    <Badge 
      variant="outline" 
      className="text-[11px] font-medium bg-muted/50 border-border whitespace-nowrap"
    >
      {text}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN TABLE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

const GRID_COLUMNS = 'minmax(0, 1.7fr) 0.9fr 1.1fr 0.9fr 0.9fr';

export function OkrObjectivesTable({ rows, onRowClick }: OkrObjectivesTableProps) {
  return (
    <div className="w-full bg-card rounded-xl border border-border overflow-hidden">
      {/* Header Row */}
      <div
        className="grid items-center px-4 py-3 bg-muted/50 border-b-2 border-border"
        style={{ gridTemplateColumns: GRID_COLUMNS }}
      >
        <span className="text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider">
          OKRs
        </span>
        <span className="text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider text-center">
          Status
        </span>
        <span className="text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider text-right">
          Progress vs Plan
        </span>
        <span className="text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider text-right">
          Risks
        </span>
        <span className="text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider text-right">
          Linked
        </span>
      </div>

      {/* Data Rows */}
      <div>
        {rows.map((row, index) => (
          <div
            key={row.id}
            onClick={() => onRowClick(row)}
            className={cn(
              'grid items-center px-4 py-3 min-h-[48px] bg-card cursor-pointer transition-colors hover:bg-muted/30',
              index !== rows.length - 1 && 'border-b border-border/50'
            )}
            style={{ gridTemplateColumns: GRID_COLUMNS }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRowClick(row);
              }
            }}
          >
            {/* OKRs Column */}
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Theme color dot */}
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ 
                  backgroundColor: row.themeColor,
                  boxShadow: `0 0 0 2px ${row.themeColor}25`
                }}
                title={row.themeName}
              />

              {/* Chevron */}
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

              {/* Text content */}
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm font-medium text-foreground truncate leading-tight">
                        {row.name}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-md">
                      <p>{row.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="text-[11px] text-muted-foreground truncate">
                  ({row.themeName})
                </span>
              </div>
            </div>

            {/* Status Column */}
            <div className="flex items-center justify-center">
              <StatusPill status={row.status} />
            </div>

            {/* Progress vs Plan Column */}
            <div className="flex items-center justify-end">
              {row.progressActual === null || !row.hasBaseline ? (
                <span className="text-sm text-muted-foreground">—</span>
              ) : (
                <ProgressBar 
                  progress={row.progressActual} 
                  trend={row.progressTrend}
                  variance={row.progressVariance}
                />
              )}
            </div>

            {/* Risks Column */}
            <div className="flex items-center justify-end">
              <RisksDisplay
                highRiskCount={row.highRiskCount}
                mediumRiskCount={row.mediumRiskCount}
                blockedWorkCount={row.blockedWorkCount}
                delayedWorkCount={row.delayedWorkCount}
              />
            </div>

            {/* Linked Column */}
            <div className="flex items-center justify-end">
              <LinkedChip
                linkedKrCount={row.linkedKrCount}
                linkedWorkItemCount={row.linkedWorkItemCount}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {rows.length === 0 && (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          No objectives found
        </div>
      )}
    </div>
  );
}
