/**
 * AI Progress Card - "Your week" section
 */

import React from 'react';
import type { AIStats } from './CatalystAIPanel';

interface AIProgressCardProps {
  stats: AIStats;
}

export function AIProgressCard({ stats }: AIProgressCardProps) {
  const remaining = stats.personalBest - stats.closed;

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      {/* Narrative Text */}
      <div className="text-sm text-muted-foreground leading-relaxed mb-4">
        You've closed <strong className="text-foreground">{stats.closed} items</strong> this week —{' '}
        <span className="text-[var(--sem-success)] font-semibold">{stats.percentChange}% more</span> than last week.
        Your SLA compliance is at <strong className="text-foreground">{stats.slaRate}%</strong>.
        <br /><br />
        {remaining > 0 ? (
          <span className="text-[var(--sem-success)] font-semibold">
            You're {remaining} away from your personal best of {stats.personalBest}.
          </span>
        ) : (
          <span className="text-[var(--sem-success)] font-semibold">
            You've matched your personal best of {stats.personalBest}!
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="flex gap-3 pt-4 border-t border-border">
        <StatBox value={stats.ops} label="OPS" />
        <StatBox value={stats.del} label="DEL" />
        <StatBox value={stats.pln} label="PLN" />
      </div>
    </div>
  );
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex-1 text-center py-3 px-2 bg-muted rounded-lg">
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
