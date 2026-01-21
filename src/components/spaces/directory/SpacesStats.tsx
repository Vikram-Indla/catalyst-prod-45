// ════════════════════════════════════════════════════════════════════════════
// SPACES STATS CARDS
// ════════════════════════════════════════════════════════════════════════════

import { useSpaces, useStarredSpaces } from '@/hooks/spaces';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function SpacesStats() {
  const { data } = useSpaces({ limit: 1 }); // Just to get count
  const { data: starred = [] } = useStarredSpaces();

  const totalSpaces = data?.count || 0;
  const starredCount = starred.length;
  const activeThisWeek = Math.floor(totalSpaces * 0.7); // Placeholder

  const stats = [
    {
      label: 'Total Spaces',
      value: totalSpaces,
      change: { value: 12, positive: true },
    },
    {
      label: 'Starred',
      value: starredCount,
    },
    {
      label: 'Active This Week',
      value: activeThisWeek,
      change: { value: 5, positive: true },
    },
    {
      label: 'Team Members',
      value: 45,
      change: { value: 3, positive: false },
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-background border border-border rounded-lg p-4"
        >
          <span className="text-sm text-muted-foreground">{stat.label}</span>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-2xl font-bold text-foreground">
              {stat.value}
            </span>
            {stat.change && (
              <span
                className={`flex items-center text-xs font-medium ${
                  stat.change.positive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.change.positive ? (
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-0.5" />
                )}
                {stat.change.positive ? '+' : '-'}
                {stat.change.value}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
