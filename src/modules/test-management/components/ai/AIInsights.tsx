/**
 * AI Insights Component
 * Generate insights for test cycles
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Target,
  Lightbulb,
  BarChart3,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface Insight {
  id: string;
  type: 'finding' | 'recommendation' | 'pattern' | 'regression';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  metric?: { label: string; value: string | number };
  actionable?: boolean;
}

interface MetricSummary {
  patternsFound: number;
  regressionsDetected: number;
  coverageGaps: number;
  riskAreas: number;
}

interface AIInsightsProps {
  cycleId: string;
  cycleName: string;
  className?: string;
}

export function AIInsights({
  cycleId,
  cycleName,
  className,
}: AIInsightsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [metrics, setMetrics] = useState<MetricSummary | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Simulate AI analysis - in real implementation, call the API
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Mock insights
      const mockInsights: Insight[] = [
        {
          id: '1',
          type: 'pattern',
          title: 'Recurring Failures in Authentication Module',
          description: 'Login-related tests have failed 3 times in the last 5 cycles, indicating a potential stability issue.',
          severity: 'warning',
          metric: { label: 'Failure Rate', value: '60%' },
          actionable: true,
        },
        {
          id: '2',
          type: 'regression',
          title: 'Performance Regression Detected',
          description: 'API response times have increased by 40% compared to the baseline from 2 weeks ago.',
          severity: 'critical',
          metric: { label: 'Response Time', value: '+40%' },
          actionable: true,
        },
        {
          id: '3',
          type: 'finding',
          title: 'High Pass Rate in Payment Flow',
          description: 'Payment processing tests show 98% pass rate across all environments.',
          severity: 'info',
          metric: { label: 'Pass Rate', value: '98%' },
        },
        {
          id: '4',
          type: 'recommendation',
          title: 'Add Edge Case Coverage',
          description: 'Consider adding tests for concurrent user sessions and timeout scenarios.',
          severity: 'info',
          actionable: true,
        },
        {
          id: '5',
          type: 'pattern',
          title: 'Environment-Specific Failures',
          description: 'Tests passing in staging but failing in production suggest environment configuration differences.',
          severity: 'warning',
          actionable: true,
        },
      ];

      setInsights(mockInsights);
      setMetrics({
        patternsFound: 3,
        regressionsDetected: 1,
        coverageGaps: 2,
        riskAreas: 4,
      });

      toast.success('Insights generated successfully');
    } catch (error) {
      toast.error('Failed to generate insights');
    } finally {
      setIsGenerating(false);
    }
  };

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'finding':
        return <CheckCircle2 className="h-5 w-5 text-blue-500" />;
      case 'recommendation':
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      case 'pattern':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'regression':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
    }
  };

  const getSeverityStyles = (severity: Insight['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50 dark:bg-red-950/20';
      case 'warning':
        return 'border-amber-200 bg-amber-50 dark:bg-amber-950/20';
      default:
        return 'border-blue-200 bg-blue-50 dark:bg-blue-950/20';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI Insights
          </h3>
          <p className="text-sm text-muted-foreground">
            Analyze patterns and get recommendations for {cycleName}
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : insights.length > 0 ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Insights
            </>
          )}
        </Button>
      </div>

      {/* Metrics Summary */}
      {metrics && (
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {metrics.patternsFound}
              </div>
              <div className="text-xs text-muted-foreground">Patterns Found</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-red-600">
                {metrics.regressionsDetected}
              </div>
              <div className="text-xs text-muted-foreground">Regressions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">
                {metrics.coverageGaps}
              </div>
              <div className="text-xs text-muted-foreground">Coverage Gaps</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {metrics.riskAreas}
              </div>
              <div className="text-xs text-muted-foreground">Risk Areas</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Insights List */}
      {insights.length > 0 && (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {insights.map((insight) => (
              <Card
                key={insight.id}
                className={cn('transition-all', getSeverityStyles(insight.severity))}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{insight.title}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {insight.type}
                        </Badge>
                        {insight.severity === 'critical' && (
                          <Badge className="bg-red-500 text-white text-xs">
                            Critical
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {insight.description}
                      </p>
                      {insight.metric && (
                        <div className="flex items-center gap-2 mt-2">
                          <BarChart3 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {insight.metric.label}:
                          </span>
                          <Badge variant="secondary" className="font-mono">
                            {insight.metric.value}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {insight.actionable && (
                      <Button variant="ghost" size="sm" className="flex-shrink-0">
                        Take Action
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Empty State */}
      {!isGenerating && insights.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Click "Generate Insights" to analyze this cycle
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              AI will identify patterns, regressions, and recommendations
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
