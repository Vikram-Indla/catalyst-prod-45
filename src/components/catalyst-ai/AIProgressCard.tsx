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
    <div className="bg-surface-0 rounded-xl border border-border-subtle p-4 shadow-sm">
      {/* Narrative Text */}
      <div className="text-[14px] text-text-secondary leading-relaxed mb-4">
        You've closed <strong className="text-text-primary">{stats.closed} items</strong> this week —{' '}
        <span className="text-status-success font-semibold">{stats.percentChange}% more</span> than last week.
        Your SLA compliance is at <strong className="text-text-primary">{stats.slaRate}%</strong>.
        <br /><br />
        {remaining > 0 ? (
          <span className="text-status-success font-semibold">
            You're {remaining} away from your personal best of {stats.personalBest}.
          </span>
        ) : (
          <span className="text-status-success font-semibold">
            You've matched your personal best of {stats.personalBest}!
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="flex gap-3 pt-4 border-t border-border-subtle">
        <StatBox value={stats.ops} label="OPS" />
        <StatBox value={stats.del} label="DEL" />
        <StatBox value={stats.pln} label="PLN" />
      </div>
    </div>
  );
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex-1 text-center py-3 px-2 bg-surface-1 rounded-lg">
      <div className="text-[18px] font-bold text-text-primary">{value}</div>
      <div className="text-[11px] text-text-muted mt-0.5">{label}</div>
    </div>
  );
}
