// ═══════════════════════════════════════════════════════════════════════════════
// OKR Risks Cell — Shared Presentational Component
// Uses RiskBadge for severity display with blocked/delayed text below
// ═══════════════════════════════════════════════════════════════════════════════

import { RiskBadge } from '@/components/risks/RiskBadge';
import type { RiskCounts } from '@/config/riskColors';

export interface RiskSummary {
  critical?: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount?: number;
  blockedWorkCount: number;
  delayedWorkCount: number;
}

interface OkrRisksCellProps {
  summary: RiskSummary;
  compact?: boolean;
}

export function OkrRisksCell({ summary, compact = false }: OkrRisksCellProps) {
  const { 
    critical = 0,
    highRiskCount, 
    mediumRiskCount, 
    lowRiskCount = 0,
    blockedWorkCount, 
    delayedWorkCount 
  } = summary;

  const totalRisks = critical + highRiskCount + mediumRiskCount + lowRiskCount;
  const totalIssues = blockedWorkCount + delayedWorkCount;

  // Build risk counts for RiskBadge
  const riskCounts: RiskCounts = {
    critical: critical > 0 ? critical : undefined,
    high: highRiskCount > 0 ? highRiskCount : undefined,
    medium: mediumRiskCount > 0 ? mediumRiskCount : undefined,
    low: lowRiskCount > 0 ? lowRiskCount : undefined,
  };

  // Build issues text (blocked, delayed)
  const issuesParts: string[] = [];
  if (blockedWorkCount > 0) issuesParts.push(`${blockedWorkCount} blocked`);
  if (delayedWorkCount > 0) issuesParts.push(`${delayedWorkCount} delayed`);
  const issuesText = issuesParts.join(', ');

  return (
    <div className="flex flex-col items-center gap-0.5">
      <RiskBadge 
        counts={riskCounts} 
        size={compact ? 'sm' : 'md'}
        hideEmpty
      />
      {issuesText && totalRisks > 0 && (
        <span className="text-[10px] text-muted-foreground">
          {issuesText}
        </span>
      )}
    </div>
  );
}
