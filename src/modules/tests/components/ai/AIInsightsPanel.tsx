import React from 'react';
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  Target, 
  Lightbulb,
  RefreshCw,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  useFailureClusters,
  useCycleRiskPrediction,
  useGenerateFailureClusters,
  useGenerateRiskPrediction,
} from '../../hooks/useTestAI';

interface AIInsightsPanelProps {
  cycleId?: string;
  programId: string;
  cycleData?: {
    name: string;
    start_date: string;
    end_date: string;
    total_cases: number;
    executed_count: number;
    pass_count: number;
    fail_count: number;
    blocked_count: number;
  };
  failedExecutions?: Array<{
    id: string;
    test_case_title: string;
    failure_reason?: string;
    error_message?: string;
  }>;
}

export function AIInsightsPanel({
  cycleId,
  programId,
  cycleData,
  failedExecutions = [],
}: AIInsightsPanelProps) {
  const { data: clusters = [], isLoading: loadingClusters } = useFailureClusters(cycleId);
  const { data: riskPrediction, isLoading: loadingRisk } = useCycleRiskPrediction(cycleId);
  
  const generateClusters = useGenerateFailureClusters();
  const generateRisk = useGenerateRiskPrediction();
  
  const handleGenerateClusters = () => {
    if (!cycleId || failedExecutions.length === 0) return;
    generateClusters.mutate({
      cycleId,
      programId,
      failedExecutions,
    });
  };
  
  const handleGenerateRisk = () => {
    if (!cycleId || !cycleData) return;
    generateRisk.mutate({
      cycleId,
      programId,
      cycleData,
    });
  };
  
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Risk Prediction */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Risk Prediction</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateRisk}
              disabled={generateRisk.isPending || !cycleData}
            >
              {generateRisk.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          <CardDescription>AI-powered cycle risk assessment</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRisk ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : riskPrediction ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold',
                    getRiskLevelColor(riskPrediction.risk_level)
                  )}>
                    {Math.round((riskPrediction.overall_risk_score || 0) * 100)}%
                  </div>
                  <div>
                    <p className="font-medium capitalize">{riskPrediction.risk_level} Risk</p>
                    <p className="text-sm text-muted-foreground">
                      {riskPrediction.predicted_pass_rate}% predicted pass rate
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={getRiskLevelColor(riskPrediction.risk_level)}>
                  {riskPrediction.risk_level}
                </Badge>
              </div>
              
              {riskPrediction.risk_factors && (riskPrediction.risk_factors as any[]).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Risk Factors</p>
                    <div className="space-y-2">
                      {(riskPrediction.risk_factors as any[]).slice(0, 3).map((factor, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-warning" />
                          <span className="text-sm">{factor.factor}</span>
                          <Badge variant="outline" className="ml-auto text-xs">
                            {Math.round(factor.impact * 100)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              {riskPrediction.recommendations && (riskPrediction.recommendations as any[]).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Recommendations
                    </p>
                    <ul className="space-y-1">
                      {(riskPrediction.recommendations as any[]).slice(0, 2).map((rec, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {rec.action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
              <p className="text-sm">No risk prediction available</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleGenerateRisk}
                disabled={!cycleData}
              >
                <Brain className="h-4 w-4 mr-2" />
                Generate Prediction
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Failure Clusters */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-destructive" />
              <CardTitle className="text-base">Failure Clusters</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateClusters}
              disabled={generateClusters.isPending || failedExecutions.length === 0}
            >
              {generateClusters.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          <CardDescription>AI-identified failure patterns</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingClusters ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : clusters.length > 0 ? (
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {clusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{cluster.cluster_name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {cluster.pattern_description}
                        </p>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {cluster.failure_count} failures
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Impact:</span>
                        <Progress value={cluster.impact_score * 10} className="w-16 h-1.5" />
                        <span>{cluster.impact_score}/10</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Confidence:</span>
                        <span>{Math.round(cluster.confidence_score * 100)}%</span>
                      </div>
                    </div>
                    
                    {cluster.root_cause_hypothesis && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                        <span className="font-medium">Hypothesis: </span>
                        <span className="text-muted-foreground">{cluster.root_cause_hypothesis}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
              <p className="text-sm">No failure patterns detected</p>
              {failedExecutions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleGenerateClusters}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Analyze Failures
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
