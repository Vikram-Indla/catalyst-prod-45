import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FeatureCoverage } from '@/types/reports.types';

interface TestCoverageBarProps {
  coverageData: FeatureCoverage[];
}

export const TestCoverageBar: React.FC<TestCoverageBarProps> = ({ coverageData }) => {
  const getColorClass = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-600';
    if (percentage >= 50) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Test Coverage by Feature
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {coverageData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No coverage data available
          </p>
        ) : (
          coverageData.map((feature) => (
            <div key={feature.featureId} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {feature.featureName}
                </span>
                <span className={`text-sm font-semibold ${getColorClass(feature.coveragePercentage)}`}>
                  {feature.coveragePercentage}% ({feature.completedTests}/{feature.totalTests})
                </span>
              </div>
              <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`absolute left-0 top-0 h-full ${getProgressColor(feature.coveragePercentage)} transition-all duration-300`}
                  style={{ width: `${feature.coveragePercentage}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
