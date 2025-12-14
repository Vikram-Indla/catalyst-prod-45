// ═══════════════════════════════════════════════════════════════════════════════
// OKR Risks Cell — Shared Presentational Component
// Renders compact risk summary (— or 3H / 1M, 1 blocked, 2 delayed)
// Used by both OKRHubV1 (Objectives Table) and OKRHubV2 (Strategy Tree)
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface RiskSummary {
  highRiskCount: number;
  mediumRiskCount: number;
  blockedWorkCount: number;
  delayedWorkCount: number;
}

interface OkrRisksCellProps {
  summary: RiskSummary;
  compact?: boolean;
}

export function OkrRisksCell({ summary, compact = false }: OkrRisksCellProps) {
  const { highRiskCount, mediumRiskCount, blockedWorkCount, delayedWorkCount } = summary;
  const totalRisks = highRiskCount + mediumRiskCount;
  const totalIssues = blockedWorkCount + delayedWorkCount;

  if (totalRisks === 0 && totalIssues === 0) {
    return (
      <span className="flex items-center justify-end w-full text-xs text-muted-foreground">
        —
      </span>
    );
  }

  // Build risk text
  let riskText = '';
  if (highRiskCount > 0 && mediumRiskCount > 0) {
    riskText = `${highRiskCount}H / ${mediumRiskCount}M`;
  } else if (highRiskCount > 0) {
    riskText = compact ? `${highRiskCount}H` : `${highRiskCount} High`;
  } else if (mediumRiskCount > 0) {
    riskText = compact ? `${mediumRiskCount}M` : `${mediumRiskCount} Medium`;
  }

  // Build issues text
  const issuesParts: string[] = [];
  if (blockedWorkCount > 0) issuesParts.push(`${blockedWorkCount} blocked`);
  if (delayedWorkCount > 0) issuesParts.push(`${delayedWorkCount} delayed`);
  const issuesText = issuesParts.join(', ');

  const hasHighRisk = highRiskCount > 0;
  const tooltipContent = `High: ${highRiskCount}, Medium: ${mediumRiskCount}${totalIssues > 0 ? ` | Blocked: ${blockedWorkCount}, Delayed: ${delayedWorkCount}` : ''}`;

  if (compact) {
    // Compact mode for tree rows
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(
              'text-xs font-medium whitespace-nowrap text-right block',
              hasHighRisk ? 'text-destructive' : 'text-muted-foreground'
            )}>
              {riskText || `${blockedWorkCount + delayedWorkCount} issues`}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipContent}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full mode for table rows
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
