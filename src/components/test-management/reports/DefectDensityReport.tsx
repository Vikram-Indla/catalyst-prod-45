/**
 * Defect Density Report - Shows defect metrics across test cases and features
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Bug, AlertTriangle, TrendingDown, BarChart3 } from 'lucide-react';

interface DefectMetric {
  featureId: string;
  featureName: string;
  totalTests: number;
  defectsFound: number;
  criticalDefects: number;
  majorDefects: number;
  minorDefects: number;
  density: number;
}

interface DefectDensityReportProps {
  metrics: DefectMetric[];
  totalDefects: number;
  resolvedDefects: number;
  openDefects: number;
}

const SEVERITY_COLORS = {
  critical: '#ef4444',
  major: '#f59e0b',
  minor: '#3b82f6',
};

export const DefectDensityReport: React.FC<DefectDensityReportProps> = ({
  metrics,
  totalDefects,
  resolvedDefects,
  openDefects,
}) => {
  const severityData = [
    { name: 'Critical', value: metrics.reduce((sum, m) => sum + m.criticalDefects, 0), color: SEVERITY_COLORS.critical },
    { name: 'Major', value: metrics.reduce((sum, m) => sum + m.majorDefects, 0), color: SEVERITY_COLORS.major },
    { name: 'Minor', value: metrics.reduce((sum, m) => sum + m.minorDefects, 0), color: SEVERITY_COLORS.minor },
  ];

  const avgDensity = metrics.length > 0
    ? (metrics.reduce((sum, m) => sum + m.density, 0) / metrics.length).toFixed(2)
    : '0';

  const highDensityFeatures = metrics.filter(m => m.density > 1).sort((a, b) => b.density - a.density);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Bug className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{totalDefects}</p>
                <p className="text-sm text-muted-foreground">Total Defects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{openDefects}</p>
                <p className="text-sm text-muted-foreground">Open Defects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{resolvedDefects}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-brand-gold" />
              <div>
                <p className="text-2xl font-bold">{avgDensity}</p>
                <p className="text-sm text-muted-foreground">Avg Density</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Defects by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* High Density Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              High Defect Density Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highDensityFeatures.slice(0, 5).map((feature) => (
                <div key={feature.featureId} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{feature.featureName}</span>
                      <Badge
                        variant="outline"
                        className={
                          feature.density > 2
                            ? 'border-red-500 text-red-500'
                            : 'border-amber-500 text-amber-500'
                        }
                      >
                        {feature.density.toFixed(2)} defects/test
                      </Badge>
                    </div>
                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{feature.totalTests} tests</span>
                      <span>•</span>
                      <span>{feature.defectsFound} defects</span>
                    </div>
                  </div>
                </div>
              ))}

              {highDensityFeatures.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No high-density areas detected
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Defect Density by Feature</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.map((metric) => (
              <div key={metric.featureId} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{metric.featureName}</span>
                  <span className="text-sm text-muted-foreground">
                    {metric.defectsFound} / {metric.totalTests} tests
                  </span>
                </div>
                <Progress
                  value={Math.min(metric.density * 50, 100)}
                  className="h-2"
                />
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-red-500">
                    {metric.criticalDefects} critical
                  </span>
                  <span className="text-amber-500">
                    {metric.majorDefects} major
                  </span>
                  <span className="text-blue-500">
                    {metric.minorDefects} minor
                  </span>
                </div>
              </div>
            ))}

            {metrics.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No defect data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
