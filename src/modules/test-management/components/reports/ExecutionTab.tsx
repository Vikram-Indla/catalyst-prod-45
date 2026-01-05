/**
 * Execution Tab - Detailed execution report
 * Summary cards, cycle table, and detailed run table
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Download, CheckCircle, XCircle, AlertCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { ReportSummary } from '@/types/test-management';

interface ExecutionTabProps {
  summary?: ReportSummary;
  summaryLoading: boolean;
  executionReport?: {
    cycles: Array<{
      id: string;
      key: string;
      name: string;
      status: string;
      total: number;
      passed: number;
      failed: number;
      blocked: number;
      not_run: number;
      progress: number;
    }>;
    runs: Array<any>;
  };
  reportLoading: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    passed: { label: 'Passed', className: 'bg-success/10 text-success border-success/20' },
    failed: { label: 'Failed', className: 'bg-danger/10 text-danger border-danger/20' },
    blocked: { label: 'Blocked', className: 'bg-warning/10 text-warning border-warning/20' },
    skipped: { label: 'Skipped', className: 'bg-muted text-muted-foreground' },
    not_run: { label: 'Not Run', className: 'bg-muted text-muted-foreground' },
  };
  const { label, className } = config[status?.toLowerCase()] || config.not_run;
  
  return <Badge variant="outline" className={className}>{label}</Badge>;
}

function StatusIcon({ status }: { status: string }) {
  switch (status?.toLowerCase()) {
    case 'passed':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-danger" />;
    case 'blocked':
      return <AlertCircle className="h-4 w-4 text-warning" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

export function ExecutionTab({ summary, summaryLoading, executionReport, reportLoading }: ExecutionTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const cycles = executionReport?.cycles || [];
  const runs = executionReport?.runs || [];

  // Filter runs
  const filteredRuns = runs.filter(run => {
    if (statusFilter !== 'all' && run.status?.toLowerCase() !== statusFilter) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        run.test_case?.key?.toLowerCase().includes(search) ||
        run.test_case?.title?.toLowerCase().includes(search) ||
        run.cycle?.key?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const activeCycles = cycles.filter(c => c.status === 'in_progress' || c.status === 'IN_PROGRESS').length;
  const totalRuns = summary?.total_runs || 0;
  const passRate = summary?.pass_rate || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            {summaryLoading ? (
              <>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-12" />
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Active Cycles</p>
                <p className="text-3xl font-bold">{activeCycles}</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {summaryLoading ? (
              <>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-12" />
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Total Runs</p>
                <p className="text-3xl font-bold">{totalRuns}</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {summaryLoading ? (
              <>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-12" />
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Total Cases</p>
                <p className="text-3xl font-bold">{summary?.total_cases || 0}</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {summaryLoading ? (
              <>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-12" />
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="text-3xl font-bold text-success">{passRate}%</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Execution by Cycle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Execution by Cycle</CardTitle>
        </CardHeader>
        <CardContent>
          {reportLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : cycles.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No cycles found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cycle</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pass</TableHead>
                  <TableHead className="text-right">Fail</TableHead>
                  <TableHead className="text-right">Block</TableHead>
                  <TableHead className="w-32">Progress</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.map((cycle) => {
                  const rate = cycle.total > 0 
                    ? Math.round((cycle.passed / (cycle.passed + cycle.failed + cycle.blocked || 1)) * 100) 
                    : 0;
                  return (
                    <TableRow key={cycle.id}>
                      <TableCell>
                        <div className="font-medium">{cycle.key}</div>
                        <div className="text-xs text-muted-foreground">{cycle.name}</div>
                      </TableCell>
                      <TableCell className="text-right">{cycle.total}</TableCell>
                      <TableCell className="text-right text-success">{cycle.passed}</TableCell>
                      <TableCell className="text-right text-danger">{cycle.failed}</TableCell>
                      <TableCell className="text-right text-warning">{cycle.blocked}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                cycle.progress === 100 ? 'bg-success' : 'bg-primary'
                              )}
                              style={{ width: `${cycle.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10">
                            {cycle.progress}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{rate}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Execution Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Runs</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {reportLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No runs found
            </div>
          ) : (
            <div className="rounded-md border border-border-subtle overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRuns.slice(0, 20).map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <div className="font-medium">{run.test_case?.key || '-'}</div>
                        <div className="text-xs text-muted-foreground">{run.test_case?.title || '-'}</div>
                      </TableCell>
                      <TableCell>{run.cycle?.key || '-'}</TableCell>
                      <TableCell><StatusBadge status={run.status} /></TableCell>
                      <TableCell>
                        {run.duration_seconds ? `${Math.floor(run.duration_seconds / 60)}:${(run.duration_seconds % 60).toString().padStart(2, '0')}` : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {run.started_at ? formatDistanceToNow(new Date(run.started_at), { addSuffix: true }) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
