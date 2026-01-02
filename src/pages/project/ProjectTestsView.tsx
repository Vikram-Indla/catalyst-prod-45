// =====================================================
// PROJECT TESTS VIEW
// Test management view within project context
// =====================================================

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FlaskConical, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ListChecks,
  FileText,
  Play
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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

export default function ProjectTestsView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // Mock data for the project's test metrics
  const metrics = {
    totalCases: 156,
    passRate: 78,
    failed: 12,
    blocked: 5,
    notRun: 34
  };

  return (
    <div className="h-full overflow-auto bg-surface-1 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-accent-primary" />
              Test Management
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage test cases, cycles, and executions for this project
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Reports
            </Button>
            <Button size="sm" className="bg-accent-primary text-white hover:bg-accent-primary/90">
              <Play className="w-4 h-4 mr-2" />
              Run Tests
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Total Test Cases"
            value={metrics.totalCases}
            icon={<ListChecks className="w-5 h-5 text-accent-primary" />}
          />
          <MetricCard
            title="Pass Rate"
            value={`${metrics.passRate}%`}
            icon={<TrendingUp className="w-5 h-5 text-status-success" />}
            trend="+3% from last cycle"
            trendUp
          />
          <MetricCard
            title="Failed"
            value={metrics.failed}
            icon={<XCircle className="w-5 h-5 text-status-error" />}
          />
          <MetricCard
            title="Blocked"
            value={metrics.blocked}
            icon={<AlertTriangle className="w-5 h-5 text-status-warning" />}
          />
          <MetricCard
            title="Not Run"
            value={metrics.notRun}
            icon={<Clock className="w-5 h-5 text-text-tertiary" />}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-surface-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cases">Test Cases</TabsTrigger>
            <TabsTrigger value="cycles">Test Cycles</TabsTrigger>
            <TabsTrigger value="executions">Executions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Test Execution Progress */}
              <Card className="bg-surface-2 border-border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Current Cycle Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-text-secondary">Regression Suite Q1</span>
                        <span className="text-text-primary font-medium">78%</span>
                      </div>
                      <Progress value={78} className="h-2" />
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                      <div>
                        <p className="text-status-success font-medium">122</p>
                        <p className="text-text-tertiary text-xs">Passed</p>
                      </div>
                      <div>
                        <p className="text-status-error font-medium">12</p>
                        <p className="text-text-tertiary text-xs">Failed</p>
                      </div>
                      <div>
                        <p className="text-status-warning font-medium">5</p>
                        <p className="text-text-tertiary text-xs">Blocked</p>
                      </div>
                      <div>
                        <p className="text-text-tertiary font-medium">17</p>
                        <p className="text-text-tertiary text-xs">Not Run</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Failures */}
              <Card className="bg-surface-2 border-border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Recent Failures</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { id: 'TC-001', name: 'User login with SSO', feature: 'Authentication' },
                      { id: 'TC-042', name: 'Payment processing timeout', feature: 'Payments' },
                      { id: 'TC-078', name: 'Data export CSV format', feature: 'Reports' },
                    ].map((test) => (
                      <div 
                        key={test.id} 
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-3 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <XCircle className="w-4 h-4 text-status-error" />
                          <div>
                            <p className="text-sm font-medium text-text-primary">{test.name}</p>
                            <p className="text-xs text-text-tertiary">{test.id} • {test.feature}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-status-error border-status-error/30">
                          Failed
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coverage by Feature */}
            <Card className="bg-surface-2 border-border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Test Coverage by Feature</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { name: 'Authentication', coverage: 92, cases: 24 },
                    { name: 'Dashboard', coverage: 85, cases: 18 },
                    { name: 'Reports', coverage: 78, cases: 32 },
                    { name: 'Settings', coverage: 65, cases: 12 },
                  ].map((feature) => (
                    <div key={feature.name} className="p-3 bg-surface-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-text-primary">{feature.name}</span>
                        <span className="text-sm text-text-secondary">{feature.cases} cases</span>
                      </div>
                      <Progress value={feature.coverage} className="h-1.5" />
                      <p className="text-xs text-text-tertiary mt-1">{feature.coverage}% covered</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cases">
            <Card className="bg-surface-2 border-border-default p-8 text-center">
              <ListChecks className="w-12 h-12 mx-auto text-text-tertiary mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Test Cases</h3>
              <p className="text-text-secondary mb-4">
                Manage and organize your test cases for this project.
              </p>
              <Button variant="outline">View All Test Cases</Button>
            </Card>
          </TabsContent>

          <TabsContent value="cycles">
            <Card className="bg-surface-2 border-border-default p-8 text-center">
              <BarChart3 className="w-12 h-12 mx-auto text-text-tertiary mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Test Cycles</h3>
              <p className="text-text-secondary mb-4">
                Plan and track test cycles across sprints and releases.
              </p>
              <Button variant="outline">View All Cycles</Button>
            </Card>
          </TabsContent>

          <TabsContent value="executions">
            <Card className="bg-surface-2 border-border-default p-8 text-center">
              <Play className="w-12 h-12 mx-auto text-text-tertiary mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Test Executions</h3>
              <p className="text-text-secondary mb-4">
                View and manage test execution runs and results.
              </p>
              <Button variant="outline">View Executions</Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
