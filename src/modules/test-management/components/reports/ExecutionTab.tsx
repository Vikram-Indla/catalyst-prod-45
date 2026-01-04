/**
 * Execution Tab - Detailed execution report
 * Summary cards, cycle table, and detailed run table
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Search, Download, ChevronDown, ChevronRight, CheckCircle, XCircle, AlertCircle, Circle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data
const SUMMARY_STATS = {
  activeCycles: 5,
  totalRuns: 234,
  avgTime: '4:32',
  passRate: '79.5%',
};

const CYCLES_DATA = [
  { id: 'CY-015', name: 'Sprint 24 Regression', total: 45, pass: 32, fail: 5, block: 2, progress: 87, rate: 82 },
  { id: 'CY-014', name: 'Sprint 23 Regression', total: 38, pass: 35, fail: 2, block: 1, progress: 100, rate: 92 },
  { id: 'CY-013', name: 'Q4 Release', total: 52, pass: 41, fail: 8, block: 3, progress: 100, rate: 79 },
  { id: 'CY-012', name: 'Security Audit', total: 21, pass: 16, fail: 3, block: 2, progress: 100, rate: 76 },
];

const EXECUTION_DETAILS = [
  {
    runId: 234,
    caseKey: 'TC-045',
    caseTitle: 'Login with valid credentials',
    cycle: 'CY-015',
    executor: 'Ahmed',
    status: 'failed',
    duration: '3:45',
    date: '10m ago',
    steps: [
      { step: 1, action: 'Navigate to login page', expected: 'Page loads', status: 'passed' },
      { step: 2, action: 'Enter valid email', expected: 'Email accepted', status: 'passed' },
      { step: 3, action: 'Enter valid password', expected: 'Password masked', status: 'passed' },
      { step: 4, action: 'Click Login button', expected: 'Login succeeds', status: 'failed', actual: 'Button unresponsive, no action' },
      { step: 5, action: 'Verify dashboard', expected: 'Dashboard shown', status: 'skipped' },
    ],
    linkedDefect: { id: 'DEF-089', title: 'Login button unresponsive' },
  },
  {
    runId: 233,
    caseKey: 'TC-032',
    caseTitle: 'Submit contact form',
    cycle: 'CY-015',
    executor: 'Fatima',
    status: 'passed',
    duration: '5:12',
    date: '25m ago',
    steps: [],
  },
  {
    runId: 232,
    caseKey: 'TC-018',
    caseTitle: 'User profile update',
    cycle: 'CY-015',
    executor: 'Mohammed',
    status: 'passed',
    duration: '2:30',
    date: '2h ago',
    steps: [],
  },
  {
    runId: 231,
    caseKey: 'TC-022',
    caseTitle: 'Password change flow',
    cycle: 'CY-015',
    executor: 'Ahmed',
    status: 'passed',
    duration: '4:05',
    date: '2h ago',
    steps: [],
  },
  {
    runId: 230,
    caseKey: 'TC-015',
    caseTitle: 'Session timeout handling',
    cycle: 'CY-015',
    executor: 'Fatima',
    status: 'blocked',
    duration: '1:20',
    date: '3h ago',
    steps: [],
  },
];

function StatusBadge({ status }: { status: string }) {
  const config = {
    passed: { label: 'Passed', variant: 'default' as const, className: 'bg-success/10 text-success border-success/20' },
    failed: { label: 'Failed', variant: 'destructive' as const, className: 'bg-danger/10 text-danger border-danger/20' },
    blocked: { label: 'Blocked', variant: 'default' as const, className: 'bg-warning/10 text-warning border-warning/20' },
    skipped: { label: 'Skipped', variant: 'secondary' as const, className: 'bg-muted text-muted-foreground' },
  };
  const { label, className } = config[status as keyof typeof config] || config.skipped;
  
  return <Badge variant="outline" className={className}>{label}</Badge>;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
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

function ExecutionRow({ run }: { run: typeof EXECUTION_DETAILS[0] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <TableRow className="cursor-pointer hover:bg-surface-2">
          <TableCell>
            {run.steps.length > 0 ? (
              isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              <span className="w-4" />
            )}
          </TableCell>
          <TableCell className="font-mono text-sm">{run.runId}</TableCell>
          <TableCell>
            <div className="font-medium">{run.caseKey}</div>
            <div className="text-xs text-muted-foreground">{run.caseTitle}</div>
          </TableCell>
          <TableCell>{run.cycle}</TableCell>
          <TableCell>{run.executor}</TableCell>
          <TableCell><StatusBadge status={run.status} /></TableCell>
          <TableCell>{run.duration}</TableCell>
          <TableCell className="text-muted-foreground">{run.date}</TableCell>
        </TableRow>
      </CollapsibleTrigger>
      {run.steps.length > 0 && (
        <CollapsibleContent asChild>
          <tr>
            <td colSpan={8} className="p-0">
              <div className="bg-surface-2 p-4 border-y border-border-subtle">
                <div className="mb-3">
                  <h4 className="font-semibold">Run #{run.runId}: {run.caseKey} - {run.caseTitle}</h4>
                  <p className="text-sm text-muted-foreground">
                    Executed by {run.executor} • Duration: {run.duration} • Status: {run.status.toUpperCase()}
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Step</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {run.steps.map((step) => (
                      <TableRow key={step.step}>
                        <TableCell>{step.step}</TableCell>
                        <TableCell>
                          {step.action}
                          {step.actual && (
                            <div className="text-sm text-danger mt-1">
                              Actual: {step.actual}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{step.expected}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon status={step.status} />
                            <span className="capitalize">{step.status}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {run.linkedDefect && (
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Linked Defect:</span>
                    <Button variant="link" className="h-auto p-0 text-sm">
                      {run.linkedDefect.id} - {run.linkedDefect.title}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </td>
          </tr>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export function ExecutionTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [executorFilter, setExecutorFilter] = useState('all');
  const [cycleFilter, setCycleFilter] = useState('all');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Cycles</p>
            <p className="text-3xl font-bold">{SUMMARY_STATS.activeCycles}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Runs</p>
            <p className="text-3xl font-bold">{SUMMARY_STATS.totalRuns}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Avg Time/Test</p>
            <p className="text-3xl font-bold">{SUMMARY_STATS.avgTime}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pass Rate</p>
            <p className="text-3xl font-bold text-success">{SUMMARY_STATS.passRate}</p>
          </CardContent>
        </Card>
      </div>

      {/* Execution by Cycle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Execution by Cycle</CardTitle>
        </CardHeader>
        <CardContent>
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
              {CYCLES_DATA.map((cycle) => (
                <TableRow key={cycle.id}>
                  <TableCell>
                    <div className="font-medium">{cycle.id}</div>
                    <div className="text-xs text-muted-foreground">{cycle.name}</div>
                  </TableCell>
                  <TableCell className="text-right">{cycle.total}</TableCell>
                  <TableCell className="text-right text-success">{cycle.pass}</TableCell>
                  <TableCell className="text-right text-danger">{cycle.fail}</TableCell>
                  <TableCell className="text-right text-warning">{cycle.block}</TableCell>
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
                  <TableCell className="text-right font-medium">{cycle.rate}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Execution Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Execution Details</CardTitle>
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
            <Select value={executorFilter} onValueChange={setExecutorFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Executor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Executors</SelectItem>
                <SelectItem value="ahmed">Ahmed</SelectItem>
                <SelectItem value="fatima">Fatima</SelectItem>
                <SelectItem value="mohammed">Mohammed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cycleFilter} onValueChange={setCycleFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cycles</SelectItem>
                <SelectItem value="CY-015">CY-015</SelectItem>
                <SelectItem value="CY-014">CY-014</SelectItem>
                <SelectItem value="CY-013">CY-013</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border border-border-subtle overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-16">Run #</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Executor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EXECUTION_DETAILS.map((run) => (
                  <ExecutionRow key={run.runId} run={run} />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
