/**
 * Module 5B-1: Release Quality Metrics - Metrics Panel Component
 */

import { memo } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Bug, 
  Bot, 
  TrendingUp,
  RefreshCw,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useReleaseHealth } from '../hooks/useQualityMetrics';
import { HEALTH_LEVEL_CONFIG, METRIC_THRESHOLDS } from '../types/quality-metrics';

interface QualityMetricsPanelProps {
  releaseId: string;
  compact?: boolean;
}

export const QualityMetricsPanel = memo(function QualityMetricsPanel({
  releaseId,
  compact = false
}: QualityMetricsPanelProps) {
  const { health, isLoading, refetch } = useReleaseHealth(releaseId);

  if (isLoading && !health) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!health) return null;

  const levelConfig = HEALTH_LEVEL_CONFIG[health.level];
  const metrics = health.metrics;

  const getMetricStatus = (value: number, thresholds: { good: number; warning: number; critical: number }) => {
    if (value >= thresholds.good) return { status: 'good', color: 'text-teal' };
    if (value >= thresholds.warning) return { status: 'warning', color: 'text-warning' };
    return { status: 'critical', color: 'text-destructive' };
  };

  return (
    <div className="space-y-4">
      {/* Health Score Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" />
              Release Health Score
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={refetch} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {/* Score Circle */}
            <div 
              className="relative w-24 h-24 rounded-full flex items-center justify-center"
              style={{ 
                background: `conic-gradient(${levelConfig.color} ${health.score}%, transparent ${health.score}%)`,
              }}
            >
              <div className="absolute inset-2 bg-background rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold">{health.score}</span>
              </div>
            </div>

            {/* Status */}
            <div className="flex-1">
              <Badge 
                variant="outline" 
                className="mb-2"
                style={{ borderColor: levelConfig.color, color: levelConfig.color }}
              >
                {levelConfig.label}
              </Badge>
              <p className="text-sm text-muted-foreground">{levelConfig.description}</p>
            </div>

            {/* Breakdown */}
            {!compact && (
              <div className="hidden lg:grid grid-cols-2 gap-4 text-sm">
                {Object.entries(health.breakdown).map(([key, item]) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}</span>
                    <span className="font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metric Cards */}
      {!compact && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pass Rate */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className={`w-4 h-4 ${getMetricStatus(metrics.test_execution.pass_rate, METRIC_THRESHOLDS.pass_rate).color}`} />
                <span className="text-sm font-medium">Pass Rate</span>
              </div>
              <div className="text-2xl font-bold">{metrics.test_execution.pass_rate}%</div>
              <Progress value={metrics.test_execution.pass_rate} className="h-2 mt-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{metrics.test_execution.passed} passed</span>
                <span>{metrics.test_execution.failed} failed</span>
              </div>
            </CardContent>
          </Card>

          {/* Coverage */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className={`w-4 h-4 ${getMetricStatus(metrics.test_execution.coverage_percent, METRIC_THRESHOLDS.coverage).color}`} />
                <span className="text-sm font-medium">Coverage</span>
              </div>
              <div className="text-2xl font-bold">{metrics.test_execution.coverage_percent}%</div>
              <Progress value={metrics.test_execution.coverage_percent} className="h-2 mt-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{metrics.test_execution.total - metrics.test_execution.not_run} executed</span>
                <span>{metrics.test_execution.not_run} pending</span>
              </div>
            </CardContent>
          </Card>

          {/* Open Defects */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Bug className={`w-4 h-4 ${metrics.defects.blocker > 0 ? 'text-destructive' : metrics.defects.open > 0 ? 'text-warning' : 'text-teal'}`} />
                <span className="text-sm font-medium">Open Defects</span>
              </div>
              <div className="text-2xl font-bold">{metrics.defects.open}</div>
              <div className="flex gap-2 mt-2">
                {metrics.defects.blocker > 0 && (
                  <Badge variant="destructive" className="text-xs">{metrics.defects.blocker} Blocker</Badge>
                )}
                {metrics.defects.critical > 0 && (
                  <Badge variant="outline" className="text-xs border-warning text-warning">{metrics.defects.critical} Critical</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Automation */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Bot className={`w-4 h-4 ${getMetricStatus(metrics.automation.rate, METRIC_THRESHOLDS.automation).color}`} />
                <span className="text-sm font-medium">Automation</span>
              </div>
              <div className="text-2xl font-bold">{metrics.automation.rate}%</div>
              <Progress value={metrics.automation.rate} className="h-2 mt-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{metrics.automation.automated_count} automated</span>
                <span>{metrics.automation.manual_count} manual</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
});