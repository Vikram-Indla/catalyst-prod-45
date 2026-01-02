/**
 * Test Command Center Page
 * Main dashboard for Test Management module
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { 
  FlaskConical, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ListChecks
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

function MetricCard({ title, value, icon, trend, trendUp }: MetricCardProps) {
  return (
    <Card className="bg-surface-2 border-border-default">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-text-tertiary">{title}</p>
            <p className="text-2xl font-semibold text-text-primary mt-1">{value}</p>
            {trend && (
              <p className={`text-xs mt-1 ${trendUp ? 'text-status-success' : 'text-status-error'}`}>
                {trend}
              </p>
            )}
          </div>
          <div className="p-2 bg-surface-3 rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TestCommandCenterPage() {
  const { projectKey } = useParams<{ projectKey: string }>();

  // Mock data - will be replaced with real data
  const metrics = {
    totalCases: 1248,
    passed: 892,
    failed: 156,
    blocked: 42,
    notRun: 158,
    passRate: 85.1,
  };

  return (
    <div className="h-full overflow-auto p-6 bg-surface-1">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-text-tertiary mb-2">
          <span>{projectKey}</span>
          <span>/</span>
          <span className="text-text-primary font-medium">Tests</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-subtle rounded-lg">
            <FlaskConical className="h-6 w-6 text-accent-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Test Command Center</h1>
            <p className="text-sm text-text-tertiary">Quality overview and test execution metrics</p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Test Cases"
          value={metrics.totalCases}
          icon={<ListChecks className="h-5 w-5 text-accent-primary" />}
        />
        <MetricCard
          title="Passed"
          value={metrics.passed}
          icon={<CheckCircle2 className="h-5 w-5 text-status-success" />}
          trend="+12 from last cycle"
          trendUp
        />
        <MetricCard
          title="Failed"
          value={metrics.failed}
          icon={<XCircle className="h-5 w-5 text-status-error" />}
          trend="-8 from last cycle"
          trendUp
        />
        <MetricCard
          title="Pass Rate"
          value={`${metrics.passRate}%`}
          icon={<TrendingUp className="h-5 w-5 text-status-success" />}
          trend="+2.3% from last cycle"
          trendUp
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Blocked"
          value={metrics.blocked}
          icon={<AlertTriangle className="h-5 w-5 text-status-warning" />}
        />
        <MetricCard
          title="Not Run"
          value={metrics.notRun}
          icon={<Clock className="h-5 w-5 text-text-tertiary" />}
        />
        <MetricCard
          title="Active Cycles"
          value={3}
          icon={<BarChart3 className="h-5 w-5 text-accent-primary" />}
        />
      </div>

      {/* Progress Overview */}
      <Card className="bg-surface-2 border-border-default mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-text-primary">
            Current Cycle Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-text-secondary">Sprint 24 - Regression</span>
                <span className="text-text-tertiary">72% complete</span>
              </div>
              <Progress value={72} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-text-secondary">Sprint 24 - New Features</span>
                <span className="text-text-tertiary">45% complete</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-text-secondary">Integration Tests</span>
                <span className="text-text-tertiary">88% complete</span>
              </div>
              <Progress value={88} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-surface-2 border-border-default">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-text-primary">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="cursor-pointer hover:bg-surface-hover py-1.5 px-3">
              Create Test Case
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-surface-hover py-1.5 px-3">
              Start Execution
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-surface-hover py-1.5 px-3">
              Generate Report
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-surface-hover py-1.5 px-3">
              View Traceability
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TestCommandCenterPage;
