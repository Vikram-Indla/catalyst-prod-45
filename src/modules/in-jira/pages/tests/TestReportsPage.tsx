/**
 * Test Reports Page
 * Daily and weekly test execution reports
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface ReportMetric {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

const dailyMetrics: ReportMetric[] = [
  { label: 'Tests Executed', value: 156, change: 12, trend: 'up' },
  { label: 'Pass Rate', value: 87, change: 3, trend: 'up' },
  { label: 'New Defects', value: 4, change: -2, trend: 'down' },
  { label: 'Blocked', value: 8, change: 1, trend: 'neutral' },
];

const weeklyMetrics: ReportMetric[] = [
  { label: 'Total Executed', value: 892, change: 156, trend: 'up' },
  { label: 'Avg Pass Rate', value: 85, change: 2, trend: 'up' },
  { label: 'Total Defects', value: 23, change: -5, trend: 'down' },
  { label: 'Coverage', value: 78, change: 4, trend: 'up' },
];

function MetricCard({ metric }: { metric: ReportMetric }) {
  return (
    <Card className="bg-surface-2 border-border-default">
      <CardContent className="p-4">
        <p className="text-sm text-text-tertiary">{metric.label}</p>
        <div className="flex items-end justify-between mt-2">
          <p className="text-2xl font-semibold text-text-primary">
            {metric.label.includes('Rate') || metric.label.includes('Coverage') 
              ? `${metric.value}%` 
              : metric.value}
          </p>
          <div className={`flex items-center gap-1 text-sm ${
            metric.trend === 'up' ? 'text-status-success' : 
            metric.trend === 'down' ? 'text-status-error' : 
            'text-text-tertiary'
          }`}>
            {metric.trend === 'up' ? (
              <TrendingUp className="h-4 w-4" />
            ) : metric.trend === 'down' ? (
              <TrendingDown className="h-4 w-4" />
            ) : null}
            <span>{metric.change >= 0 ? '+' : ''}{metric.change}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TestReportsPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [activeTab, setActiveTab] = useState('daily');

  const handleExportReport = (type: string) => {
    toast.success(`Exporting ${type} report...`);
  };

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-border-default">
        <div className="flex items-center gap-2 text-sm text-text-tertiary mb-2">
          <span>{projectKey}</span>
          <span>/</span>
          <span>Tests</span>
          <span>/</span>
          <span className="text-text-primary font-medium">Reports</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">Test Reports</h1>
          <Button variant="outline" size="sm" onClick={() => handleExportReport(activeTab)}>
            <Download className="h-4 w-4 mr-1.5" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-surface-2 border border-border-default mb-6">
            <TabsTrigger value="daily" className="gap-1.5">
              <Calendar className="h-4 w-4" />
              Daily Report
            </TabsTrigger>
            <TabsTrigger value="weekly" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Weekly Runway
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {dailyMetrics.map((metric, index) => (
                <MetricCard key={index} metric={metric} />
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card className="bg-surface-2 border-border-default">
                <CardHeader>
                  <CardTitle className="text-base font-medium text-text-primary flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-accent-primary" />
                    Execution by Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-secondary">Passed</span>
                        <span className="text-status-success">136 (87%)</span>
                      </div>
                      <Progress value={87} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-secondary">Failed</span>
                        <span className="text-status-error">12 (8%)</span>
                      </div>
                      <Progress value={8} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-secondary">Blocked</span>
                        <span className="text-status-warning">8 (5%)</span>
                      </div>
                      <Progress value={5} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface-2 border-border-default">
                <CardHeader>
                  <CardTitle className="text-base font-medium text-text-primary flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-accent-primary" />
                    Execution by Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-secondary">Automated</span>
                        <span className="text-accent-primary">98 (63%)</span>
                      </div>
                      <Progress value={63} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-secondary">Manual</span>
                        <span className="text-text-tertiary">58 (37%)</span>
                      </div>
                      <Progress value={37} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-surface-2 border-border-default">
              <CardHeader>
                <CardTitle className="text-base font-medium text-text-primary flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent-primary" />
                  Today's Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { time: '10:30', action: 'John Doe executed 24 test cases', result: 'passed' },
                    { time: '09:15', action: 'Jane Smith found 2 new defects', result: 'failed' },
                    { time: '08:45', action: 'Automated suite completed', result: 'passed' },
                    { time: '08:00', action: 'Sprint 24 cycle started', result: 'neutral' },
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-surface-1 rounded-lg">
                      <span className="text-xs text-text-quaternary font-mono">{activity.time}</span>
                      <span className="text-sm text-text-primary flex-1">{activity.action}</span>
                      <Badge className={
                        activity.result === 'passed' ? 'text-status-success bg-status-success/10' :
                        activity.result === 'failed' ? 'text-status-error bg-status-error/10' :
                        'text-text-tertiary bg-surface-3'
                      }>
                        {activity.result === 'passed' ? 'Success' : 
                         activity.result === 'failed' ? 'Issues' : 
                         'Info'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {weeklyMetrics.map((metric, index) => (
                <MetricCard key={index} metric={metric} />
              ))}
            </div>

            {/* Weekly Summary */}
            <Card className="bg-surface-2 border-border-default">
              <CardHeader>
                <CardTitle className="text-base font-medium text-text-primary">
                  Weekly Summary - Release Runway
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-text-primary mb-3">Key Highlights</h4>
                    <ul className="space-y-2 text-sm text-text-secondary">
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-status-success" />
                        Pass rate improved by 2% compared to last week
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-status-success" />
                        Test coverage increased to 78% (+4%)
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-status-error" />
                        3 critical defects still open
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-status-warning" />
                        Authentication module needs additional testing
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-text-primary mb-3">Release Readiness</h4>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-text-secondary">Overall Readiness</span>
                          <span className="text-accent-primary">72%</span>
                        </div>
                        <Progress value={72} className="h-3" />
                      </div>
                      <Badge className="text-status-warning bg-status-warning/10">
                        At Risk
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default TestReportsPage;
