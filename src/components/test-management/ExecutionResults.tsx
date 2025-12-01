import React from 'react';
import { Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTestExecutions } from '@/hooks/useTestManagement';
import { format } from 'date-fns';

interface ExecutionResultsProps {
  testCaseId: string;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors = {
    not_run: 'bg-gray-500 text-white',
    passed: 'bg-green-500 text-white',
    failed: 'bg-red-500 text-white',
    blocked: 'bg-orange-500 text-white',
    skipped: 'bg-gray-400 text-white'
  };

  return (
    <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>
      {status.replace('_', ' ')}
    </Badge>
  );
};

export const ExecutionResults: React.FC<ExecutionResultsProps> = ({ testCaseId }) => {
  const { data: executions = [], isLoading } = useTestExecutions(testCaseId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-gold" />
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Execution History</h3>
        <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            No executions recorded yet. Execute this test to see results here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Execution History</h3>
        <span className="text-sm text-muted-foreground">{executions.length} executions</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Executed By</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {executions.map((execution) => (
              <TableRow key={execution.id} className="hover:bg-accent">
                <TableCell className="text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {format(new Date(execution.execution_date), 'MMM dd, yyyy HH:mm')}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={execution.status} />
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    {execution.executed_by.slice(0, 8)}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {execution.execution_time_seconds
                    ? `${Math.floor(execution.execution_time_seconds / 60)}m ${execution.execution_time_seconds % 60}s`
                    : '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                  {execution.actual_result || 'No notes'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
