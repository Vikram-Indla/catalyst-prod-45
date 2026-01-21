/**
 * Tester Performance Table - Leaderboard with productivity metrics
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { useTesterPerformance, TesterPerformance } from '@/hooks/test-cycles/useCycleAnalytics';
import { cn } from '@/lib/utils';

interface TesterPerformanceTableProps {
  cycleId: string;
}

const AVATAR_COLORS = [CATALYST_V5.primary, CATALYST_V5.teal, '#8b5cf6', '#ec4899', '#f59e0b'];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function getScoreTrend(score: number): { icon: typeof TrendingUp; color: string } {
  if (score >= 70) return { icon: TrendingUp, color: CATALYST_V5.teal };
  if (score >= 50) return { icon: Minus, color: CATALYST_V5.warning };
  return { icon: TrendingDown, color: CATALYST_V5.danger };
}

export function TesterPerformanceTable({ cycleId }: TesterPerformanceTableProps) {
  const { data: testers, isLoading } = useTesterPerformance(cycleId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Tester Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!testers || testers.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Tester Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No testers assigned to this cycle yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Tester Performance
          </CardTitle>
          <Trophy className="w-4 h-4 text-amber-500" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-2 px-4 font-medium text-muted-foreground">#</th>
                <th className="text-left py-2 px-4 font-medium text-muted-foreground">Tester</th>
                <th className="text-center py-2 px-4 font-medium text-muted-foreground">Assigned</th>
                <th className="text-center py-2 px-4 font-medium text-muted-foreground">Completed</th>
                <th className="text-center py-2 px-4 font-medium text-muted-foreground">Pass Rate</th>
                <th className="text-center py-2 px-4 font-medium text-muted-foreground">Avg Time</th>
                <th className="text-center py-2 px-4 font-medium text-muted-foreground">Defects</th>
                <th className="text-right py-2 px-4 font-medium text-muted-foreground">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {testers.map((tester, index) => {
                const trend = getScoreTrend(tester.productivityScore);
                const TrendIcon = trend.icon;
                const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

                return (
                  <tr 
                    key={tester.userId} 
                    className={cn(
                      "hover:bg-muted/30 transition-colors",
                      index === 0 && "bg-amber-50/50"
                    )}
                  >
                    <td className="py-3 px-4">
                      {index === 0 ? (
                        <span className="text-amber-500 font-bold">🥇</span>
                      ) : index === 1 ? (
                        <span className="text-slate-400 font-bold">🥈</span>
                      ) : index === 2 ? (
                        <span className="text-amber-700 font-bold">🥉</span>
                      ) : (
                        <span className="text-muted-foreground">{index + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {tester.userInitials}
                        </div>
                        <span className="font-medium text-foreground">{tester.userName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">{tester.testsAssigned}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-medium">{tester.testsCompleted}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({tester.completionRate}%)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span 
                        className="font-medium"
                        style={{ color: tester.passRate >= 80 ? CATALYST_V5.teal : tester.passRate >= 60 ? CATALYST_V5.warning : CATALYST_V5.danger }}
                      >
                        {tester.passRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-muted-foreground">
                      {formatDuration(tester.avgExecutionTime)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tester.defectsFound > 0 ? (
                        <span className="font-medium" style={{ color: CATALYST_V5.danger }}>
                          {tester.defectsFound}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="font-bold" style={{ color: trend.color }}>
                          {tester.productivityScore.toFixed(0)}
                        </span>
                        <TrendIcon className="w-3.5 h-3.5" style={{ color: trend.color }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
