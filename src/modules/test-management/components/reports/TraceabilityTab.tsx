/**
 * Traceability Tab - Coverage Matrix
 * Shows test coverage by feature/folder with gap indicators
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Folder, AlertTriangle, CheckCircle, AlertCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TraceabilityTabProps {
  traceability?: {
    folders: Array<{
      id: string;
      name: string;
      path: unknown;
      cases: number;
      executed: number;
      passed: number;
      failed: number;
      lastRun: string | null;
      passRate: number;
      gap: string;
    }>;
    coverage: number;
    totalCases?: number;
    executedCases?: number;
  };
  isLoading: boolean;
}

function GapIndicator({ passRate, hasGap }: { passRate: number; hasGap: boolean }) {
  if (hasGap) {
    return (
      <div className="flex items-center gap-1 text-warning">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-xs">No tests</span>
      </div>
    );
  }
  if (passRate < 50) {
    return (
      <div className="flex items-center gap-1 text-danger">
        <AlertCircle className="h-4 w-4" />
      </div>
    );
  }
  if (passRate < 80) {
    return (
      <div className="flex items-center gap-1 text-warning">
        <Circle className="h-4 w-4 fill-warning" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-success">
      <CheckCircle className="h-4 w-4" />
    </div>
  );
}

function PassRateBadge({ rate }: { rate: number }) {
  if (rate === 0) return <span className="text-muted-foreground">-</span>;
  
  const colorClass = rate >= 80 ? 'text-success' : rate >= 50 ? 'text-warning' : 'text-danger';
  
  return <span className={cn('font-medium', colorClass)}>{rate}%</span>;
}

export function TraceabilityTab({ traceability, isLoading }: TraceabilityTabProps) {
  const folderData = traceability?.folders || [];
  const totalCases = traceability?.totalCases || folderData.reduce((sum, c) => sum + c.cases, 0);
  const coveredCases = folderData.reduce((sum, c) => sum + c.passed + c.failed, 0);
  const coveragePercent = traceability?.coverage || (totalCases > 0 ? Math.round((coveredCases / totalCases) * 100) : 0);

  // Chart data
  const chartData = folderData.filter(c => c.cases > 0).slice(0, 8).map(c => ({
    module: c.name.length > 12 ? c.name.substring(0, 12) + '...' : c.name,
    coverage: c.passRate,
    color: c.passRate >= 80 ? 'hsl(var(--success))' : c.passRate >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--danger))',
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <Skeleton className="h-32 w-32 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-[400px] col-span-2" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Coverage Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <div className="relative h-32 w-32">
                <svg className="h-32 w-32 -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="12"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="hsl(var(--success))"
                    strokeWidth="12"
                    strokeDasharray={`${(coveragePercent / 100) * 352} 352`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{coveragePercent}%</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Test Coverage</h3>
              <p className="text-muted-foreground">
                {folderData.filter(c => c.cases > 0).length}/{folderData.length} folders have tests
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">&gt;80% coverage</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Circle className="h-4 w-4 fill-warning text-warning" />
                  <span className="text-sm">50-80% coverage</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-danger" />
                  <span className="text-sm">&lt;50% coverage</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-sm">Coverage gap</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two columns: Matrix and Chart */}
      <div className="grid grid-cols-3 gap-6">
        {/* Traceability Matrix */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Coverage Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            {folderData.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No folders with test cases found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folder</TableHead>
                    <TableHead className="text-right">Cases</TableHead>
                    <TableHead className="text-right">Passed</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead className="text-right">Coverage</TableHead>
                    <TableHead className="w-16">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {folderData.map((folder) => (
                    <TableRow key={folder.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4 text-muted-foreground" />
                          {folder.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {folder.cases > 0 ? folder.cases : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-success">{folder.passed}</TableCell>
                      <TableCell className="text-right text-danger">{folder.failed}</TableCell>
                      <TableCell className="text-right">
                        <PassRateBadge rate={folder.passRate} />
                      </TableCell>
                      <TableCell>
                        <GapIndicator passRate={folder.passRate} hasGap={folder.cases === 0} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Coverage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Coverage by Folder</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} className="text-xs" />
                    <YAxis dataKey="module" type="category" className="text-xs" width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Coverage']}
                    />
                    <Bar dataKey="coverage" radius={[0, 4, 4, 0]} barSize={20}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded bg-success" />
                <span>&gt;80%</span>
                <div className="w-3 h-3 rounded bg-warning ml-3" />
                <span>50-80%</span>
                <div className="w-3 h-3 rounded bg-danger ml-3" />
                <span>&lt;50%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
