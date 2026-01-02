/**
 * TEST EXECUTIONS PAGE
 * View and manage test execution runs
 */

import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter,
  Play,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useProjectExecutions } from '@/hooks/useProjectTestMetrics';

export function TestsExecutionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    executions,
    isLoading,
    error,
  } = useProjectExecutions(projectId || '');

  const filteredExecutions = useMemo(() => {
    if (!searchQuery) return executions;
    const q = searchQuery.toLowerCase();
    return executions.filter((exec: any) =>
      exec.test_case?.title?.toLowerCase().includes(q) ||
      exec.test_cycle?.key?.toLowerCase().includes(q)
    );
  }, [executions, searchQuery]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle2 className="h-4 w-4 text-status-success" />;
      case 'failed': return <XCircle className="h-4 w-4 text-status-error" />;
      case 'blocked': return <AlertTriangle className="h-4 w-4 text-status-warning" />;
      case 'not_run': return <Clock className="h-4 w-4 text-text-tertiary" />;
      default: return <Clock className="h-4 w-4 text-text-tertiary" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-status-success bg-status-success/10';
      case 'failed': return 'text-status-error bg-status-error/10';
      case 'blocked': return 'text-status-warning bg-status-warning/10';
      case 'not_run': return 'text-text-tertiary bg-surface-3';
      default: return 'text-text-tertiary bg-surface-3';
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load executions: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              placeholder="Search executions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-surface-2 border-border-default"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <Button>
          <Play className="h-4 w-4 mr-1.5" />
          Run Tests
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : filteredExecutions.length === 0 ? (
        <Card className="bg-surface-2 border-border-default p-8 text-center">
          <Play className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No Test Executions</h3>
          <p className="text-text-secondary mb-4">
            {searchQuery ? 'No executions match your search.' : 'Run tests to see execution results here.'}
          </p>
          {!searchQuery && (
            <Button>
              <Play className="h-4 w-4 mr-1.5" />
              Run Tests
            </Button>
          )}
        </Card>
      ) : (
        <div className="border border-border-default rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-2 border-b border-border-default">
              <tr className="text-left text-xs text-text-tertiary uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Test Case</th>
                <th className="px-4 py-3 font-medium w-28">Status</th>
                <th className="px-4 py-3 font-medium w-32">Cycle</th>
                <th className="px-4 py-3 font-medium w-32">Executed By</th>
                <th className="px-4 py-3 font-medium w-32">Executed At</th>
                <th className="px-4 py-3 font-medium w-24">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {filteredExecutions.map((exec: any) => (
                <tr
                  key={exec.id}
                  className="hover:bg-surface-hover cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(exec.status)}
                      <p className="text-sm font-medium text-text-primary truncate max-w-[300px]">
                        {exec.test_case?.title || '—'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn('capitalize text-xs', getStatusColor(exec.status))}>
                      {exec.status?.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {exec.test_cycle?.key || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {exec.executed_by || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-tertiary">
                    {exec.executed_at ? format(new Date(exec.executed_at), 'MMM d, HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-tertiary">
                    {exec.effort_minutes ? `${exec.effort_minutes}m` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
