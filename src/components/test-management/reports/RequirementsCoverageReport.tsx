/**
 * Requirements Coverage Report - Shows test coverage across requirements/features
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileText, CheckCircle2, AlertTriangle, XCircle, Target } from 'lucide-react';

interface RequirementCoverage {
  id: string;
  key: string;
  name: string;
  type: 'epic' | 'feature' | 'story';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  notExecutedTests: number;
  coveragePercent: number;
  status: 'full' | 'partial' | 'none';
}

interface RequirementsCoverageReportProps {
  requirements: RequirementCoverage[];
  summary: {
    totalRequirements: number;
    fullyCovered: number;
    partiallyCovered: number;
    notCovered: number;
    overallCoverage: number;
  };
}

const STATUS_COLORS = {
  full: '#10b981',
  partial: '#f59e0b',
  none: '#ef4444',
};

export const RequirementsCoverageReport: React.FC<RequirementsCoverageReportProps> = ({
  requirements,
  summary,
}) => {
  const chartData = [
    { name: 'Fully Covered', value: summary.fullyCovered, color: STATUS_COLORS.full },
    { name: 'Partially Covered', value: summary.partiallyCovered, color: STATUS_COLORS.partial },
    { name: 'Not Covered', value: summary.notCovered, color: STATUS_COLORS.none },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'full':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'none':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      full: 'bg-green-500/10 text-green-500 border-green-500/30',
      partial: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      none: 'bg-red-500/10 text-red-500 border-red-500/30',
    };
    const labels: Record<string, string> = {
      full: 'Fully Covered',
      partial: 'Partial',
      none: 'No Coverage',
    };
    return (
      <Badge variant="outline" className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-brand-gold" />
              <div>
                <p className="text-2xl font-bold">{summary.totalRequirements}</p>
                <p className="text-sm text-muted-foreground">Total Requirements</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{summary.fullyCovered}</p>
                <p className="text-sm text-muted-foreground">Fully Covered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{summary.partiallyCovered}</p>
                <p className="text-sm text-muted-foreground">Partial Coverage</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{summary.notCovered}</p>
                <p className="text-sm text-muted-foreground">No Coverage</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={summary.overallCoverage} className="h-4" />
            </div>
            <span className="text-2xl font-bold">{summary.overallCoverage}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Chart and Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Coverage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="name" className="text-xs" width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Critical Gaps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Coverage Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requirements
                .filter((r) => r.status === 'none' || r.status === 'partial')
                .slice(0, 5)
                .map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    {getStatusIcon(req.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{req.key}</span>
                        {getStatusBadge(req.status)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {req.name}
                      </p>
                    </div>
                    <span className="text-sm font-medium">
                      {req.totalTests} tests
                    </span>
                  </div>
                ))}

              {requirements.filter((r) => r.status !== 'full').length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>All requirements are fully covered!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requirements List */}
      <Card>
        <CardHeader>
          <CardTitle>Requirements Coverage Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requirements.map((req) => (
              <div
                key={req.id}
                className="p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{req.key}</span>
                    <Badge variant="outline" className="text-xs">
                      {req.type}
                    </Badge>
                  </div>
                  {getStatusBadge(req.status)}
                </div>
                <p className="text-sm text-muted-foreground mb-3">{req.name}</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Progress value={req.coveragePercent} className="h-2" />
                  </div>
                  <span className="text-sm">{req.coveragePercent}%</span>
                </div>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-green-500">{req.passedTests} passed</span>
                  <span className="text-red-500">{req.failedTests} failed</span>
                  <span className="text-muted-foreground">{req.notExecutedTests} not run</span>
                </div>
              </div>
            ))}

            {requirements.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No requirements data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
