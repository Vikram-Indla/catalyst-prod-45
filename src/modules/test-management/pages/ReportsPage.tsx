/**
 * Reports Page
 * Displays various test management reports and analytics
 */

import React from 'react';
import { 
  BarChart3, 
  FileText, 
  GitBranch, 
  TrendingUp,
  PieChart,
  Calendar,
  Download,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const reportCards = [
  {
    id: 'traceability',
    title: 'Traceability Matrix',
    description: 'Coverage mapping between requirements and test cases',
    icon: GitBranch,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    id: 'execution',
    title: 'Execution Summary',
    description: 'Overview of test execution results by cycle',
    icon: BarChart3,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  {
    id: 'burndown',
    title: 'Burndown Chart',
    description: 'Track test execution progress over time',
    icon: TrendingUp,
    color: 'text-info',
    bgColor: 'bg-info/10',
  },
  {
    id: 'defect-analysis',
    title: 'Defect Analysis',
    description: 'Defect trends, severity distribution, and aging',
    icon: PieChart,
    color: 'text-danger',
    bgColor: 'bg-danger/10',
  },
  {
    id: 'test-coverage',
    title: 'Test Coverage',
    description: 'Coverage analysis by module and feature',
    icon: FileText,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  {
    id: 'cycle-history',
    title: 'Cycle History',
    description: 'Historical comparison of test cycles',
    icon: Calendar,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
];

export function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Generate and view test management reports
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export All
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Test Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">248</div>
            <p className="text-xs text-success">+12 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tests Executed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,842</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">87%</div>
            <p className="text-xs text-success">+3% vs last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Defects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">23</div>
            <p className="text-xs text-danger">5 critical</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-3 gap-4">
        {reportCards.map((report) => {
          const Icon = report.icon;
          return (
            <Card 
              key={report.id} 
              className="hover:shadow-md transition-shadow cursor-pointer group"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    report.bgColor
                  )}>
                    <Icon className={cn('h-5 w-5', report.color)} />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-lg mt-3">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  View Report
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recently Generated</CardTitle>
          <CardDescription>Your recently viewed and generated reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Sprint 23 Execution Summary', type: 'Execution', date: 'Jan 15, 2024' },
              { name: 'Q4 Traceability Matrix', type: 'Traceability', date: 'Jan 10, 2024' },
              { name: 'Authentication Module Coverage', type: 'Coverage', date: 'Jan 8, 2024' },
            ].map((report, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-3 rounded-lg border border-border-subtle hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{report.name}</p>
                    <p className="text-xs text-muted-foreground">{report.type} • {report.date}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ReportsPage;
