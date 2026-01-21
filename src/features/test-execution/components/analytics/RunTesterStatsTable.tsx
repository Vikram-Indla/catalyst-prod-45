/**
 * Module 4C-4: Tester performance table for a run
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Users } from 'lucide-react';
import { useRunTesterStats } from '../../hooks/useRunAnalytics';
import { cn } from '@/lib/utils';

interface RunTesterStatsTableProps {
  runId: string | null;
}

export function RunTesterStatsTable({ runId }: RunTesterStatsTableProps) {
  const { data: testerStats, isLoading } = useRunTesterStats(runId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Tester Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!testerStats || testerStats.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Tester Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No tester data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Tester Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Tester</th>
                <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground">Assigned</th>
                <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground">Completed</th>
                <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground">Pass/Fail/Block</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground w-32">Completion</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground w-32">Pass Rate</th>
                <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {testerStats.map((tester) => (
                <tr key={tester.userId} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {tester.userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">{tester.userName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="text-sm text-foreground">{tester.assigned}</span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="text-sm text-foreground">{tester.completed}</span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-xs">
                      <span className="text-success font-medium">{tester.passed}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-destructive font-medium">{tester.failed}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-warning font-medium">{tester.blocked}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={tester.completionRate} 
                        className="h-2 flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {tester.completionRate.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={tester.passRate} 
                        className={cn(
                          "h-2 flex-1",
                          tester.passRate >= 80 && "[&>div]:bg-success",
                          tester.passRate >= 50 && tester.passRate < 80 && "[&>div]:bg-warning",
                          tester.passRate < 50 && "[&>div]:bg-destructive"
                        )}
                      />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {tester.passRate.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(tester.avgDurationSeconds)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
