/**
 * Test Cycles Page
 * Displays test cycles with progress stats and management
 */

import React, { useState } from 'react';
import { 
  RefreshCw, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Copy,
  Trash2,
  Edit,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Mock data for test cycles
const mockCycles = [
  { 
    id: '1', 
    key: 'CY-001', 
    name: 'Sprint 23 Regression', 
    status: 'IN_PROGRESS', 
    totalCases: 45,
    passedCount: 28,
    failedCount: 5,
    blockedCount: 2,
    notRunCount: 10,
    progress: 78,
    passRate: 85,
    dueDate: '2024-01-20'
  },
  { 
    id: '2', 
    key: 'CY-002', 
    name: 'Authentication Module', 
    status: 'COMPLETED', 
    totalCases: 20,
    passedCount: 18,
    failedCount: 2,
    blockedCount: 0,
    notRunCount: 0,
    progress: 100,
    passRate: 90,
    dueDate: '2024-01-15'
  },
  { 
    id: '3', 
    key: 'CY-003', 
    name: 'API Integration Tests', 
    status: 'PLANNED', 
    totalCases: 30,
    passedCount: 0,
    failedCount: 0,
    blockedCount: 0,
    notRunCount: 30,
    progress: 0,
    passRate: 0,
    dueDate: '2024-01-25'
  },
  { 
    id: '4', 
    key: 'CY-004', 
    name: 'Performance Baseline', 
    status: 'IN_PROGRESS', 
    totalCases: 15,
    passedCount: 8,
    failedCount: 1,
    blockedCount: 1,
    notRunCount: 5,
    progress: 67,
    passRate: 80,
    dueDate: '2024-01-22'
  },
];

const statusConfig: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  PLANNED: { label: 'Planned', class: 'bg-muted text-muted-foreground', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', class: 'bg-info/10 text-info border-info/20', icon: Play },
  COMPLETED: { label: 'Completed', class: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', class: 'bg-danger/10 text-danger border-danger/20', icon: XCircle },
};

export function TestCyclesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredCycles = mockCycles.filter(cycle => 
    (cycle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cycle.key.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (!statusFilter || cycle.status === statusFilter)
  );

  // Summary stats
  const stats = {
    total: mockCycles.length,
    inProgress: mockCycles.filter(c => c.status === 'IN_PROGRESS').length,
    completed: mockCycles.filter(c => c.status === 'COMPLETED').length,
    avgPassRate: Math.round(mockCycles.reduce((acc, c) => acc + c.passRate, 0) / mockCycles.length),
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Test Cycles</h1>
          <p className="text-sm text-muted-foreground">
            Manage test execution cycles and track progress
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Cycle
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cycles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgPassRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cycles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Cycles Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filteredCycles.map((cycle) => {
          const statusInfo = statusConfig[cycle.status];
          const StatusIcon = statusInfo.icon;

          return (
            <Card key={cycle.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-primary">{cycle.key}</span>
                      <Badge variant="outline" className={cn('text-xs', statusInfo.class)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{cycle.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Clone
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{cycle.progress}%</span>
                  </div>
                  <Progress value={cycle.progress} className="h-2" />
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-success" />
                      <span className="text-muted-foreground">Passed:</span>
                      <span className="font-medium">{cycle.passedCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-danger" />
                      <span className="text-muted-foreground">Failed:</span>
                      <span className="font-medium">{cycle.failedCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-warning" />
                      <span className="text-muted-foreground">Blocked:</span>
                      <span className="font-medium">{cycle.blockedCount}</span>
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    {cycle.totalCases} total
                  </div>
                </div>

                {/* Pass Rate */}
                {cycle.status !== 'PLANNED' && (
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pass Rate</span>
                    <span className={cn(
                      'text-sm font-semibold',
                      cycle.passRate >= 80 ? 'text-success' : cycle.passRate >= 60 ? 'text-warning' : 'text-danger'
                    )}>
                      {cycle.passRate}%
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default TestCyclesPage;
