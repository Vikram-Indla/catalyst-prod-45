// ═══════════════════════════════════════════════════════════════════════════════
// OKR Risks Cell — Shared Presentational Component
// Risk chip with severity + blocked/delayed text below
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';

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
      <span className="flex items-center justify-end w-full text-sm text-muted-foreground">
        —
      </span>
    );
  }

  // Build risk chip text and color
  let chipText = '';
  let chipBg = '';
  let chipText_color = '';

  if (highRiskCount > 0 && mediumRiskCount > 0) {
    // Mixed: "XH / XM" - more compact
    chipText = `${highRiskCount}H/${mediumRiskCount}M`;
    chipBg = 'bg-[#c44536]';
    chipText_color = 'text-white';
  } else if (highRiskCount > 0) {
    // High only - compact "XH" format
    chipText = `${highRiskCount}H`;
    chipBg = 'bg-[#c44536]';
    chipText_color = 'text-white';
  } else if (mediumRiskCount > 0) {
    // Medium only - compact "XM" format
    chipText = `${mediumRiskCount}M`;
    chipBg = 'bg-[#e07830]';
    chipText_color = 'text-white';
  }

  // Build issues text (blocked, delayed)
  const issuesParts: string[] = [];
  if (blockedWorkCount > 0) issuesParts.push(`${blockedWorkCount} blocked`);
  if (delayedWorkCount > 0) issuesParts.push(`${delayedWorkCount} delayed`);
  const issuesText = issuesParts.join(', ');

  return (
    <div className="flex flex-col items-end gap-0.5">
      {chipText && (
        <span
          className={cn(
            'inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            chipBg,
            chipText_color
          )}
        >
          {chipText}
        </span>
      )}
      {issuesText && (
        <span className="text-[10px] text-muted-foreground">
          {issuesText}
        </span>
      )}
    </div>
  );
}
