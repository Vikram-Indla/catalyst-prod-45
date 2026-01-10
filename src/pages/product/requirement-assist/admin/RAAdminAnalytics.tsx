import React from 'react';
import { BarChart3, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRAGenerationStats, useRAGenerations } from '@/hooks/requirement-assist';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function RAAdminAnalytics() {
  const { data: stats, isLoading: statsLoading } = useRAGenerationStats();
  const { data: recentGenerations, isLoading: generationsLoading } = useRAGenerations({ limit: 10 });
  
  // Fetch aggregated metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['ra-analytics-metrics'],
    queryFn: async () => {
      // Get total items generated
      const { count: totalItems } = await supabase
        .from('ra_generated_items')
        .select('*', { count: 'exact', head: true });

      // Get token usage from generations
      const { data: tokenData } = await supabase
        .from('ra_generations')
        .select('tokens_used, processing_time_ms')
        .is('deleted_at', null);

      const totalTokens = tokenData?.reduce((sum, g) => sum + (g.tokens_used || 0), 0) || 0;
      const avgProcessingTime = tokenData?.length 
        ? Math.round(tokenData.reduce((sum, g) => sum + (g.processing_time_ms || 0), 0) / tokenData.length / 1000)
        : 0;
      
      // Calculate success rate (published / (published + failed))
      const successRate = stats 
        ? stats.total > 0 
          ? ((stats.published / (stats.published + stats.failed)) * 100).toFixed(1)
          : '0'
        : '0';

      return {
        totalItems: totalItems || 0,
        totalTokens,
        avgProcessingTime,
        successRate,
      };
    },
    enabled: !!stats,
  });

  const isLoading = statsLoading || metricsLoading;

  const statCards = [
    { 
      value: stats?.total || 0, 
      label: 'Total Generations', 
      change: '+12%', 
      trend: 'up' as const 
    },
    { 
      value: metrics?.totalItems?.toLocaleString() || '0', 
      label: 'Items Created', 
      change: '+8%', 
      trend: 'up' as const 
    },
    { 
      value: metrics?.totalTokens ? `${Math.round(metrics.totalTokens / 1000)}K` : '0', 
      label: 'Tokens Used', 
      change: '42%', 
      trend: 'neutral' as const 
    },
    { 
      value: metrics?.avgProcessingTime ? `${metrics.avgProcessingTime}s` : '0s', 
      label: 'Avg Generation Time', 
      change: '-5%', 
      trend: 'down' as const 
    },
    { 
      value: `${metrics?.successRate || 0}%`, 
      label: 'Success Rate', 
      change: '+2%', 
      trend: 'up' as const 
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-5 gap-4">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-12 mt-2" />
            </Card>
          ))
        ) : (
          statCards.map((stat, i) => (
            <Card key={i} className="p-5">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-[13px] text-muted-foreground mt-1">{stat.label}</div>
              <div className={cn(
                "text-xs mt-2 flex items-center gap-1",
                stat.trend === 'up' ? 'text-emerald-600' : 
                stat.trend === 'down' ? 'text-red-500' : 
                'text-muted-foreground'
              )}>
                {stat.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {stat.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                {stat.trend === 'neutral' && <Minus className="w-3 h-3" />}
                {stat.change}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : stats && (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm">Published</span>
                  </div>
                  <span className="font-semibold">{stats.published}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm">Draft</span>
                  </div>
                  <span className="font-semibold">{stats.draft}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm">Processing</span>
                  </div>
                  <span className="font-semibold">{stats.processing}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm">Failed</span>
                  </div>
                  <span className="font-semibold">{stats.failed}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {generationsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : recentGenerations && recentGenerations.length > 0 ? (
              <div className="space-y-2">
                {recentGenerations.slice(0, 5).map((gen) => (
                  <div 
                    key={gen.id} 
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <div className="text-sm font-medium truncate max-w-[200px]">
                        {gen.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {gen.display_id}
                      </div>
                    </div>
                    <div className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      gen.status === 'published' ? 'bg-emerald-100 text-emerald-600' :
                      gen.status === 'draft' ? 'bg-amber-100 text-amber-600' :
                      gen.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                      'bg-red-100 text-red-600'
                    )}>
                      {gen.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No generations yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
