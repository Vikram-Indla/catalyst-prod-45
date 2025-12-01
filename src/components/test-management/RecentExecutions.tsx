import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RecentExecution } from '@/types/reports.types';
import { formatDistanceToNow } from 'date-fns';

interface RecentExecutionsProps {
  executions: RecentExecution[];
}

export const RecentExecutions: React.FC<RecentExecutionsProps> = ({ executions }) => {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string }> = {
      passed: { variant: 'default', className: 'bg-green-600 hover:bg-green-700' },
      failed: { variant: 'destructive', className: '' },
      blocked: { variant: 'secondary', className: 'bg-yellow-600 hover:bg-yellow-700' },
      skipped: { variant: 'outline', className: '' },
    };

    const config = variants[status] || variants.skipped;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Recent Test Executions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {executions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent executions
          </p>
        ) : (
          <div className="space-y-3">
            {executions.map((execution) => (
              <div
                key={execution.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {execution.testCaseTitle}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    by {execution.executedBy} • {formatDistanceToNow(new Date(execution.executedAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {execution.duration && (
                    <span className="text-xs text-muted-foreground">
                      {execution.duration}s
                    </span>
                  )}
                  {getStatusBadge(execution.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
