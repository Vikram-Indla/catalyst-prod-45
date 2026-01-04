/**
 * Traceability Tab - Coverage Matrix
 * Shows test coverage by feature/folder with gap indicators
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';

// Mock data
const COVERAGE_STATS = {
  totalFeatures: 40,
  coveredFeatures: 34,
  percentage: 85,
};

const TRACEABILITY_DATA = [
  {
    folder: 'Authentication',
    icon: Folder,
    isFolder: true,
    children: [
      { name: 'Login', cases: 8, lastRun: 'Jan 15', passRate: 87, gap: false },
      { name: 'Logout', cases: 3, lastRun: 'Jan 15', passRate: 100, gap: false },
      { name: 'Password Reset', cases: 5, lastRun: 'Jan 14', passRate: 80, gap: false },
      { name: 'SSO', cases: 0, lastRun: '-', passRate: 0, gap: true },
    ],
  },
  {
    folder: 'User Management',
    icon: Folder,
    isFolder: true,
    children: [
      { name: 'Create User', cases: 4, lastRun: 'Jan 15', passRate: 100, gap: false },
      { name: 'Edit User', cases: 3, lastRun: 'Jan 12', passRate: 67, gap: false },
      { name: 'Delete User', cases: 2, lastRun: 'Jan 10', passRate: 100, gap: false },
    ],
  },
  {
    folder: 'Dashboard',
    icon: Folder,
    isFolder: true,
    children: [
      { name: 'Widgets', cases: 6, lastRun: 'Jan 15', passRate: 83, gap: false },
      { name: 'Export', cases: 0, lastRun: '-', passRate: 0, gap: true },
    ],
  },
];

const COVERAGE_BY_MODULE = [
  { module: 'Authentication', coverage: 85, color: 'hsl(var(--success))' },
  { module: 'User Mgmt', coverage: 90, color: 'hsl(var(--success))' },
  { module: 'Dashboard', coverage: 55, color: 'hsl(var(--warning))' },
  { module: 'Reports', coverage: 40, color: 'hsl(var(--danger))' },
  { module: 'Settings', coverage: 100, color: 'hsl(var(--success))' },
];

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

export function TraceabilityTab() {
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
                    strokeDasharray={`${(COVERAGE_STATS.percentage / 100) * 352} 352`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{COVERAGE_STATS.percentage}%</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Test Coverage</h3>
              <p className="text-muted-foreground">
                {COVERAGE_STATS.coveredFeatures}/{COVERAGE_STATS.totalFeatures} features have tests
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">&gt;80% pass rate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Circle className="h-4 w-4 fill-warning text-warning" />
                  <span className="text-sm">50-80% pass rate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-danger" />
                  <span className="text-sm">&lt;50% pass rate</span>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature / Folder</TableHead>
                  <TableHead className="text-right">Cases</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead className="text-right">Pass Rate</TableHead>
                  <TableHead className="w-16">Gap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TRACEABILITY_DATA.map((folder) => (
                  <React.Fragment key={folder.folder}>
                    {/* Folder row */}
                    <TableRow className="bg-surface-2/50">
                      <TableCell colSpan={5}>
                        <div className="flex items-center gap-2 font-medium">
                          <Folder className="h-4 w-4 text-muted-foreground" />
                          {folder.folder}
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* Children rows */}
                    {folder.children.map((child) => (
                      <TableRow key={`${folder.folder}-${child.name}`}>
                        <TableCell className="pl-8">
                          <span className="text-muted-foreground mr-2">├─</span>
                          {child.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {child.cases > 0 ? child.cases : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {child.lastRun !== '-' ? child.lastRun : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <PassRateBadge rate={child.passRate} />
                        </TableCell>
                        <TableCell>
                          <GapIndicator passRate={child.passRate} hasGap={child.gap} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Coverage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Coverage by Module</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={COVERAGE_BY_MODULE} layout="vertical">
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
                    {COVERAGE_BY_MODULE.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Legend:</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded bg-success" />
                <span>Covered</span>
                <div className="w-3 h-3 rounded bg-muted ml-3" />
                <span>Gap</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
