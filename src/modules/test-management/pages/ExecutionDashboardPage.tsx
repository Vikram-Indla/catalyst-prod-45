/**
 * Execution Dashboard Page
 * Shows active executions, execution history, and provides access to run tests
 * Route: /tests/execution
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  User,
  MoreHorizontal,
  ArrowRight,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTestCycles } from '../hooks/useCycles';
import { useProjectStore } from '../stores/projectStore';
import { formatDistanceToNow } from 'date-fns';

interface ExecutionSummary {
  id: string;
  cycleKey: string;
  cycleName: string;
  status: 'in_progress' | 'completed' | 'paused';
  progress: number;
  passed: number;
  failed: number;
  blocked: number;
  remaining: number;
  assignee: string;
  startedAt: string;
  lastActivity: string;
}

// Mock data for demonstration - will be replaced with real queries
const mockActiveExecutions: ExecutionSummary[] = [
  {
    id: '1',
    cycleKey: 'CYC-001',
    cycleName: 'Sprint 24 Regression',
    status: 'in_progress',
    progress: 65,
    passed: 42,
    failed: 8,
    blocked: 2,
    remaining: 28,
    assignee: 'John Doe',
    startedAt: '2026-01-06T08:00:00Z',
    lastActivity: '2026-01-06T14:30:00Z',
  },
  {
    id: '2',
    cycleKey: 'CYC-002',
    cycleName: 'Payment Module Tests',
    status: 'paused',
    progress: 30,
    passed: 15,
    failed: 3,
    blocked: 0,
    remaining: 32,
    assignee: 'Jane Smith',
    startedAt: '2026-01-05T10:00:00Z',
    lastActivity: '2026-01-05T16:45:00Z',
  },
];

const mockRecentExecutions: ExecutionSummary[] = [
  {
    id: '3',
    cycleKey: 'CYC-003',
    cycleName: 'API Integration Tests',
    status: 'completed',
    progress: 100,
    passed: 45,
    failed: 5,
    blocked: 0,
    remaining: 0,
    assignee: 'Bob Wilson',
    startedAt: '2026-01-04T09:00:00Z',
    lastActivity: '2026-01-04T17:00:00Z',
  },
];

export function ExecutionDashboardPage() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active');

  const { data: cyclesData, isLoading: cyclesLoading } = useTestCycles({ 
    project_id: selectedProjectId || '' 
  });
  const cycles = cyclesData?.data || [];

  const handleStartExecution = (cycleId: string) => {
    navigate(`/tests/execution/${cycleId}`);
  };

  const handleResumeExecution = (executionId: string, cycleId: string) => {
    navigate(`/tests/execution/${cycleId}`);
  };

  const getStatusIcon = (status: ExecutionSummary['status']) => {
    switch (status) {
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'paused':
        return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: ExecutionSummary['status']) => {
    switch (status) {
      case 'in_progress':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
      case 'paused':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Paused</Badge>;
    }
  };

  const ExecutionCard = ({ execution }: { execution: ExecutionSummary }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleResumeExecution(execution.id, execution.id)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(execution.status)}
            <div>
              <CardTitle className="text-base">{execution.cycleName}</CardTitle>
              <CardDescription className="text-xs">{execution.cycleKey}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(execution.status)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleResumeExecution(execution.id, execution.id); }}>
                  {execution.status === 'paused' ? 'Resume Execution' : 'View Execution'}
                </DropdownMenuItem>
                <DropdownMenuItem>View Results</DropdownMenuItem>
                <DropdownMenuItem>Export Report</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{execution.progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all" 
              style={{ width: `${execution.progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{execution.passed}</div>
            <div className="text-xs text-muted-foreground">Passed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">{execution.failed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-amber-600">{execution.blocked}</div>
            <div className="text-xs text-muted-foreground">Blocked</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-muted-foreground">{execution.remaining}</div>
            <div className="text-xs text-muted-foreground">Remaining</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px]">
                {execution.assignee.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span>{execution.assignee}</span>
          </div>
          <span>Last activity {formatDistanceToNow(new Date(execution.lastActivity), { addSuffix: true })}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Test Execution</h1>
          <p className="text-sm text-muted-foreground">
            Manage active executions and view execution history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Play className="h-4 w-4 mr-2" />
                Start Execution
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {cycles.length > 0 ? (
                cycles.slice(0, 5).map((cycle: any) => (
                  <DropdownMenuItem 
                    key={cycle.id} 
                    onClick={() => handleStartExecution(cycle.id)}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{cycle.name}</div>
                      <div className="text-xs text-muted-foreground">{cycle.cycle_key}</div>
                    </div>
                    <ArrowRight className="h-4 w-4" />
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>
                  No cycles available
                </DropdownMenuItem>
              )}
              {cycles.length > 5 && (
                <DropdownMenuItem onClick={() => navigate('/tests/cycles')}>
                  View all cycles...
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Executions</p>
                <p className="text-2xl font-bold">{mockActiveExecutions.filter(e => e.status === 'in_progress').length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Play className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paused</p>
                <p className="text-2xl font-bold">{mockActiveExecutions.filter(e => e.status === 'paused').length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Today</p>
                <p className="text-2xl font-bold">{mockRecentExecutions.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate (Today)</p>
                <p className="text-2xl font-bold">87%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="active">Active & Paused</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search executions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="active" className="mt-4">
          {mockActiveExecutions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockActiveExecutions.map((execution) => (
                <ExecutionCard key={execution.id} execution={execution} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Active Executions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start executing test cases from a cycle to see progress here.
                </p>
                <Button onClick={() => navigate('/tests/cycles')}>
                  Go to Test Cycles
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recent" className="mt-4">
          {mockRecentExecutions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockRecentExecutions.map((execution) => (
                <ExecutionCard key={execution.id} execution={execution} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Recent Executions</h3>
                <p className="text-sm text-muted-foreground">
                  Completed executions will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Scheduled Executions</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Schedule test executions to run at specific times.
              </p>
              <Button variant="outline">
                Schedule Execution
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ExecutionDashboardPage;