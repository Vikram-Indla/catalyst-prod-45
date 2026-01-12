/**
 * TMOverviewDashboard - Main dashboard overview for Test Management
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ClipboardList,
  RefreshCw,
  Bug,
  BarChart3,
  PlayCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Calendar,
  Users,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TMStatCard } from './ui/TMStatCard';
import { useCommandCenterKPIs, useActiveCycles, useActivityFeed } from '../hooks/useCommandCenter';

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

function QuickAction({ icon, title, description, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left w-full"
    >
      <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
        {icon}
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  );
}

function CycleProgressCard({ cycle }: { cycle: any }) {
  const passRate = cycle.total > 0 ? (cycle.passed / cycle.total) * 100 : 0;
  const progress = cycle.total > 0 ? ((cycle.passed + cycle.failed + cycle.blocked) / cycle.total) * 100 : 0;

  return (
    <div className="p-4 border border-border rounded-lg hover:bg-accent/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm truncate flex-1">{cycle.title}</h4>
        <Badge variant="outline" className="text-xs shrink-0 ml-2">
          {cycle.status}
        </Badge>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{progress.toFixed(0)}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            {cycle.passed}
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-destructive" />
            {cycle.failed}
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            {cycle.blocked}
          </span>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: any }) {
  const getIcon = () => {
    switch (activity.type) {
      case 'execution':
        return <PlayCircle className="h-4 w-4 text-primary" />;
      case 'defect':
        return <Bug className="h-4 w-4 text-destructive" />;
      case 'case_created':
        return <FileText className="h-4 w-4 text-emerald-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{activity.message}</p>
        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
      </div>
    </div>
  );
}

export function TMOverviewDashboard() {
  const navigate = useNavigate();
  const { data: kpis, isLoading: kpisLoading } = useCommandCenterKPIs();
  const { data: activeCycles, isLoading: cyclesLoading } = useActiveCycles();
  const { data: activityFeed, isLoading: activityLoading } = useActivityFeed();

  const quickActions = [
    {
      icon: <PlayCircle className="h-5 w-5" />,
      title: 'Start Execution',
      description: 'Run tests from active cycles',
      onClick: () => navigate('/test-management/my-work'),
    },
    {
      icon: <ClipboardList className="h-5 w-5" />,
      title: 'Create Test Case',
      description: 'Add a new test case',
      onClick: () => navigate('/test-management/cases'),
    },
    {
      icon: <RefreshCw className="h-5 w-5" />,
      title: 'New Cycle',
      description: 'Create a test cycle',
      onClick: () => navigate('/test-management/cycles'),
    },
    {
      icon: <Bug className="h-5 w-5" />,
      title: 'Log Defect',
      description: 'Report a new defect',
      onClick: () => navigate('/test-management/defects'),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Test Management</h1>
          <p className="text-muted-foreground">
            Overview of testing activities and metrics
          </p>
        </div>
        <Button onClick={() => navigate('/test-management/reports')}>
          <BarChart3 className="h-4 w-4 mr-2" />
          View Reports
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TMStatCard
          label="Total Test Cases"
          value={kpis?.totalAssigned || 0}
          icon={ClipboardList}
          color="#3b82f6"
        />
        <TMStatCard
          label="Pass Rate"
          value={`${kpis?.passRate?.toFixed(1) || 0}%`}
          icon={CheckCircle2}
          color="#10b981"
        />
        <TMStatCard
          label="Active Cycles"
          value={activeCycles?.length || 0}
          icon={RefreshCw}
          color="#8b5cf6"
        />
        <TMStatCard
          label="Open Defects"
          value={kpis?.openDefects || 0}
          icon={Bug}
          color="#ef4444"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Cycles */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Active Test Cycles</CardTitle>
              <CardDescription>Current testing cycles in progress</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/test-management/cycles')}>
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {cyclesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : activeCycles?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active cycles</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeCycles?.slice(0, 4).map((cycle: any) => (
                  <CycleProgressCard key={cycle.id} cycle={cycle} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common testing tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action, index) => (
              <QuickAction key={index} {...action} />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Latest updates from your team</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {activityLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : activityFeed?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activityFeed?.map((activity: any, index: number) => (
                    <ActivityItem key={index} activity={activity} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
            <CardDescription>Cycles ending soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeCycles
                ?.filter((c: any) => c.endDate)
                .slice(0, 5)
                .map((cycle: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate">{cycle.title}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {cycle.endDate}
                    </Badge>
                  </div>
                ))}
              {(!activeCycles || activeCycles.filter((c: any) => c.endDate).length === 0) && (
                <div className="text-center py-4 text-muted-foreground">
                  <Calendar className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming deadlines</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TMOverviewDashboard;
