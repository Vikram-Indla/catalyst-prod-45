import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigation } from "@/contexts/NavigationContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Clock, Zap, Activity } from "lucide-react";

export default function ValueStreamView() {
  const { selectedPortfolioId } = useNavigation();

  const { data: valueStreamData, isLoading } = useQuery({
    queryKey: ["value-stream-metrics", selectedPortfolioId],
    queryFn: async () => {
      if (!selectedPortfolioId) return [];
      
      const { data, error } = await supabase
        .from("value_stream_metrics")
        .select("*")
        .eq("portfolio_id", selectedPortfolioId)
        .order("metric_date", { ascending: false })
        .limit(30);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedPortfolioId,
  });

  const { data: features } = useQuery({
    queryKey: ["features-flow", selectedPortfolioId],
    queryFn: async () => {
      if (!selectedPortfolioId) return [];
      
      const { data, error } = await supabase
        .from("features")
        .select(`
          *,
          programs!inner(portfolio_id)
        `)
        .eq("programs.portfolio_id", selectedPortfolioId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedPortfolioId,
  });

  const calculateFlowMetrics = () => {
    if (!features?.length) return null;

    const total = features.length;
    const inProgress = features.filter(f => f.status === 'implementing').length;
    const done = features.filter(f => f.status === 'done').length;
    const avgCycleTime = valueStreamData?.[0]?.cycle_time_days || 0;
    const avgLeadTime = valueStreamData?.[0]?.lead_time_days || 0;
    const flowEfficiency = valueStreamData?.[0]?.flow_efficiency || 0;

    return {
      total,
      inProgress,
      done,
      avgCycleTime,
      avgLeadTime,
      flowEfficiency,
      throughput: valueStreamData?.[0]?.throughput || 0,
    };
  };

  const metrics = calculateFlowMetrics();

  if (isLoading) {
    return <div className="p-8">Loading value stream metrics...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Value Stream View</h1>
        <p className="text-muted-foreground mt-1">
          Portfolio-level flow metrics and bottleneck analysis
        </p>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Lead Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">
                  {metrics.avgLeadTime.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">days</span>
                </div>
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Time from request to delivery
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Cycle Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">
                  {metrics.avgCycleTime.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">days</span>
                </div>
                <Zap className="h-8 w-8 text-amber-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Time from start to completion
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Flow Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">
                  {metrics.flowEfficiency.toFixed(0)}%
                </div>
                <TrendingUp className={`h-8 w-8 ${metrics.flowEfficiency >= 30 ? 'text-success' : 'text-warning'}`} />
              </div>
              <Progress value={metrics.flowEfficiency} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Active work / total lead time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">
                  {metrics.throughput}
                  <span className="text-sm font-normal text-muted-foreground ml-1">/week</span>
                </div>
                <Activity className="h-8 w-8 text-success" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Features completed per week
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Work in Progress (WIP)</CardTitle>
          <CardDescription>Current features by status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['funnel', 'analyzing', 'backlog', 'implementing', 'done'].map((status) => {
              const count = features?.filter(f => f.status === status).length || 0;
              const percentage = metrics ? (count / metrics.total) * 100 : 0;

              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{status}</Badge>
                      <span className="text-sm text-muted-foreground">{count} features</span>
                    </div>
                    <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={percentage} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bottleneck Analysis</CardTitle>
          <CardDescription>Identify constraints in the value stream</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Analyzing Stage</h4>
                <Badge variant="destructive">High WIP</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {features?.filter(f => f.status === 'analyzing').length} features waiting for analysis.
                Consider increasing capacity or simplifying analysis process.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Implementation Stage</h4>
                <Badge className="bg-warning text-warning-foreground">Medium WIP</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {features?.filter(f => f.status === 'implementing').length} features in development.
                Monitor capacity and dependencies to prevent bottlenecks.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}